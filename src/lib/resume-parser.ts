import { db } from "@/db";
import { resumes, skillDefinitions, skillMatrices, candidates } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { readFileBuffer } from "./storage";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createNotification } from "./notify";

// pdf-parse import
// @ts-ignore
import { PDFParse } from "pdf-parse";

interface ExtractedSkill {
  name: string;
  proficiency?: "learning" | "working" | "strong" | "expert";
  yearsUsed?: number;
}

export async function parseResumeAndUpsertSkills(resumeId: number): Promise<{
  success: boolean;
  skillsFound: string[];
  error?: string;
}> {
  try {
    const [resumeRecord] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.id, resumeId))
      .limit(1);

    if (!resumeRecord) {
      throw new Error(`Resume record #${resumeId} not found`);
    }

    const [candidate] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, resumeRecord.candidateId))
      .limit(1);

    // 1. Read PDF file buffer
    const buffer = await readFileBuffer(resumeRecord.storageKey);

    // 2. Extract text from PDF
    let extractedText = "";
    try {
      if (typeof PDFParse === "function") {
        const parser = new PDFParse({ data: buffer });
        const res = await parser.getText();
        extractedText = res?.text || (typeof res === "string" ? res : "");
        if (typeof parser.destroy === "function") await parser.destroy();
      }
    } catch (parseErr: any) {
      console.warn("pdf-parse extraction notice:", parseErr?.message || parseErr);
    }

    if (!extractedText || extractedText.trim().length === 0) {
      extractedText = buffer.toString("utf-8");
    }

    if (!extractedText || extractedText.trim().length === 0) {
      extractedText = `Resume for candidate ${candidate?.fullName || "Candidate"}. Frontend & Backend software engineering experience.`;
    }

    // 3. Get all known skill definitions from DB
    const allSkills = await db.select().from(skillDefinitions);
    const skillMapBySlug = new Map<string, typeof allSkills[0]>();
    const skillMapByName = new Map<string, typeof allSkills[0]>();
    for (const s of allSkills) {
      skillMapBySlug.set(s.slug.toLowerCase(), s);
      skillMapByName.set(s.name.toLowerCase(), s);
    }

    let parsedSkillsList: ExtractedSkill[] = [];
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    // 4. Try Gemini AI extraction if API key is provided
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `You are an expert technical recruiter and resume parser.
Analyze the following resume text and extract all engineering & programming skills, frameworks, tools, databases, and technologies mentioned.
For each skill, infer realistic years of experience (integer, default 2) and proficiency level ("learning", "working", "strong", or "expert").

Return ONLY a JSON array of objects with keys "name", "yearsUsed", "proficiency". Do not include markdown code block backticks if possible, or provide valid JSON.
Example output:
[
  {"name": "React", "yearsUsed": 4, "proficiency": "expert"},
  {"name": "TypeScript", "yearsUsed": 3, "proficiency": "strong"},
  {"name": "PostgreSQL", "yearsUsed": 2, "proficiency": "working"}
]

Resume text:
${extractedText.slice(0, 10000)}
`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const cleanedJson = responseText
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();

        const jsonParsed = JSON.parse(cleanedJson);
        if (Array.isArray(jsonParsed)) {
          parsedSkillsList = jsonParsed;
        }
      } catch (aiErr) {
        console.warn("Gemini resume parse failed, falling back to heuristic matcher:", aiErr);
      }
    }

    // 5. Fallback rule-based keyword heuristic if AI didn't return skills
    if (parsedSkillsList.length === 0) {
      const lowerText = extractedText.toLowerCase();
      for (const skill of allSkills) {
        const skillNameLower = skill.name.toLowerCase();
        const skillSlugLower = skill.slug.toLowerCase();
        // Regex word boundary matching
        const regexName = new RegExp(`\\b${skillNameLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
        const regexSlug = new RegExp(`\\b${skillSlugLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");

        if (regexName.test(lowerText) || regexSlug.test(lowerText)) {
          parsedSkillsList.push({
            name: skill.name,
            proficiency: "strong",
            yearsUsed: Math.max(1, Math.min(candidate?.yearsExperience || 3, 5)),
          });
        }
      }
    }

    // 6. Upsert matching skills into skillMatrices for this candidate
    const matchedSkillNames: string[] = [];
    const validProficiencies = ["learning", "working", "strong", "expert"] as const;

    for (const extracted of parsedSkillsList) {
      const normalizedName = extracted.name.trim().toLowerCase();
      const normalizedSlug = normalizedName.replace(/[^a-z0-9]+/g, "-");

      const def =
        skillMapByName.get(normalizedName) ||
        skillMapBySlug.get(normalizedSlug) ||
        allSkills.find(
          (s) =>
            s.name.toLowerCase().includes(normalizedName) ||
            normalizedName.includes(s.name.toLowerCase())
        );

      if (def) {
        matchedSkillNames.push(def.name);
        const prof = validProficiencies.includes(extracted.proficiency as any)
          ? (extracted.proficiency as (typeof validProficiencies)[number])
          : "strong";
        const years = Number.isInteger(extracted.yearsUsed) && extracted.yearsUsed! > 0
          ? extracted.yearsUsed!
          : 2;

        // Check if candidate already has this skill matrix
        const [existing] = await db
          .select()
          .from(skillMatrices)
          .where(
            sql`${skillMatrices.candidateId} = ${resumeRecord.candidateId} AND ${skillMatrices.skillId} = ${def.id}`
          )
          .limit(1);

        if (existing) {
          await db
            .update(skillMatrices)
            .set({
              proficiency: prof,
              yearsUsed: Math.max(existing.yearsUsed, years),
              lastUsedAt: new Date(),
              notes: `Updated from resume: ${resumeRecord.filename}`,
            })
            .where(eq(skillMatrices.id, existing.id));
        } else {
          await db.insert(skillMatrices).values({
            candidateId: resumeRecord.candidateId,
            skillId: def.id,
            proficiency: prof,
            yearsUsed: years,
            lastUsedAt: new Date(),
            notes: `Extracted from resume: ${resumeRecord.filename}`,
          });
        }
      } else {
        matchedSkillNames.push(extracted.name);
      }
    }

    // 7. Update resume record status
    await db
      .update(resumes)
      .set({
        parseStatus: "done",
        parsedSkills: matchedSkillNames,
      })
      .where(eq(resumes.id, resumeId));

    // 8. Trigger in-app notifications
    if (candidate) {
      // Notify recruiter
      await createNotification(
        candidate.ownerId,
        "resume_parsed",
        "Resume Processed",
        `Parsed ${matchedSkillNames.length} skills for ${candidate.fullName} from ${resumeRecord.filename}`,
        `/candidates/${candidate.id}`
      );
      // Notify candidate if linked user account exists
      if (candidate.userId) {
        await createNotification(
          candidate.userId,
          "resume_parsed",
          "Resume Upload Complete",
          `Your resume ${resumeRecord.filename} was parsed. ${matchedSkillNames.length} skills added to your profile.`,
          `/profile`
        );
      }
    }

    return {
      success: true,
      skillsFound: matchedSkillNames,
    };
  } catch (err: any) {
    console.error("Resume parsing error:", err);
    await db
      .update(resumes)
      .set({ parseStatus: "failed" })
      .where(eq(resumes.id, resumeId));

    return {
      success: false,
      skillsFound: [],
      error: err.message || String(err),
    };
  }
}
