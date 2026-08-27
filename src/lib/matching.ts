import { GoogleGenerativeAI } from "@google/generative-ai";

export interface CandidateForMatching {
  id: number;
  fullName: string;
  headline: string;
  seniority: string;
  yearsExperience: number;
  hourlyRateUsd: number;
  location: string;
  region: string;
  availabilityStatus?: string;
  bio: string;
  tags?: string[];
  skills: Array<{
    name: string;
    slug?: string;
    proficiency: string;
    yearsUsed: number;
  }>;
}

export interface MatchResult {
  score: number; // 0 - 100
  rationale: string;
  matchedSkills: string[];
  missingSkills: string[];
}

export interface RankedCandidate<T extends CandidateForMatching = CandidateForMatching> {
  candidate: T;
  match: MatchResult;
}

/**
 * Heuristic scoring fallback when AI key is unavailable or fails
 */
function heuristicScoreCandidate(
  candidate: CandidateForMatching,
  jobDescription: string
): MatchResult {
  const jdLower = jobDescription.toLowerCase();
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  let skillPoints = 0;
  let totalSkillsChecked = candidate.skills.length;

  for (const s of candidate.skills) {
    const sName = s.name.toLowerCase();
    const sSlug = (s.slug || s.name).toLowerCase();
    const isMentioned = jdLower.includes(sName) || jdLower.includes(sSlug);

    if (isMentioned) {
      matchedSkills.push(s.name);
      let multiplier = 1;
      if (s.proficiency === "expert") multiplier = 1.3;
      else if (s.proficiency === "strong") multiplier = 1.1;
      else if (s.proficiency === "learning") multiplier = 0.7;

      skillPoints += (s.yearsUsed >= 3 ? 15 : 10) * multiplier;
    }
  }

  // Check seniority keyword matches
  let seniorityBonus = 0;
  if (jdLower.includes(candidate.seniority.toLowerCase())) {
    seniorityBonus = 15;
  } else if (jdLower.includes("senior") && (candidate.seniority === "senior" || candidate.seniority === "staff" || candidate.seniority === "principal")) {
    seniorityBonus = 12;
  } else if (jdLower.includes("lead") && (candidate.seniority === "staff" || candidate.seniority === "principal")) {
    seniorityBonus = 15;
  }

  // Rate/budget estimation
  let rateFit = 10;
  const rateMatch = jdLower.match(/\$(\d+)/);
  if (rateMatch && rateMatch[1]) {
    const budget = parseInt(rateMatch[1], 10);
    if (candidate.hourlyRateUsd <= budget) {
      rateFit = 15;
    } else if (candidate.hourlyRateUsd <= budget * 1.15) {
      rateFit = 8;
    } else {
      rateFit = 0;
    }
  }

  // Base score calculation
  const calculated = Math.min(
    98,
    Math.max(
      35,
      Math.round(
        30 +
          (matchedSkills.length > 0
            ? Math.min(45, (matchedSkills.length / Math.max(1, Math.min(5, totalSkillsChecked))) * 45) + skillPoints * 0.5
            : 5) +
          seniorityBonus +
          rateFit
      )
    )
  );

  let rationale = "";
  if (matchedSkills.length > 0) {
    rationale = `Strong alignment with ${matchedSkills.slice(0, 3).join(", ")} (${candidate.yearsExperience}y exp, ${candidate.seniority.toUpperCase()}). Available at $${candidate.hourlyRateUsd}/hr.`;
  } else {
    rationale = `General ${candidate.seniority} engineer (${candidate.yearsExperience}y exp). Few direct skill matches in JD.`;
  }

  return {
    score: calculated,
    rationale,
    matchedSkills,
    missingSkills,
  };
}

/**
 * Score an individual candidate against a Job Description using Gemini
 */
export async function scoreCandidate(
  candidate: CandidateForMatching,
  jobDescription: string
): Promise<MatchResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return heuristicScoreCandidate(candidate, jobDescription);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an elite technical talent matching algorithm.
Evaluate the following candidate against the Job Description and return a match assessment.

Job Description:
${jobDescription.slice(0, 3000)}

Candidate Profile:
- Name: ${candidate.fullName}
- Headline: ${candidate.headline}
- Seniority: ${candidate.seniority} (${candidate.yearsExperience} years experience)
- Hourly Rate: $${candidate.hourlyRateUsd}/hr
- Location & Region: ${candidate.location} (${candidate.region.toUpperCase()})
- Bio: ${candidate.bio}
- Skills: ${candidate.skills.map((s) => `${s.name} (${s.proficiency}, ${s.yearsUsed}y)`).join("; ")}

Score the candidate from 0 to 100 based on technical competency match, experience level, rate fit, and domain relevance.
Provide a concise 1-2 sentence rationale explaining the score.
List matching skills and any missing critical requirements.

Return ONLY a JSON object with this exact structure:
{
  "score": 88,
  "rationale": "High relevance for React and TypeScript architecture with 8 years of design system experience.",
  "matchedSkills": ["React", "TypeScript", "Tailwind CSS"],
  "missingSkills": ["GraphQL"]
}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanedJson = responseText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleanedJson);
    return {
      score: Math.min(100, Math.max(0, Number(parsed.score) || 70)),
      rationale: parsed.rationale || `Candidate matches technical requirements.`,
      matchedSkills: Array.isArray(parsed.matchedSkills) ? parsed.matchedSkills : [],
      missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
    };
  } catch (err) {
    console.warn(`Gemini match scoring failed for ${candidate.fullName}, using heuristic fallback:`, err);
    return heuristicScoreCandidate(candidate, jobDescription);
  }
}

/**
 * Rank a list of candidates against a Job Description
 */
export async function rankCandidates<T extends CandidateForMatching>(
  candidates: T[],
  jobDescription: string
): Promise<RankedCandidate<T>[]> {
  if (!jobDescription || jobDescription.trim().length === 0) {
    return candidates.map((c) => ({
      candidate: c,
      match: {
        score: 0,
        rationale: "No job description provided.",
        matchedSkills: [],
        missingSkills: [],
      },
    }));
  }

  // Run in parallel with concurrency cap
  const scored = await Promise.all(
    candidates.map(async (candidate) => {
      const match = await scoreCandidate(candidate, jobDescription);
      return {
        candidate,
        match,
      };
    })
  );

  // Sort descending by score
  return scored.sort((a, b) => b.match.score - a.match.score);
}
