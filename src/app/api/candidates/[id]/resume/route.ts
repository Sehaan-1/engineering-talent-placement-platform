import { db } from "@/db";
import { candidates, resumes } from "@/db/schema";
import { requireAuthJson, jsonError } from "@/lib/types";
import { saveFile } from "@/lib/storage";
import { parseResumeAndUpsertSkills } from "@/lib/resume-parser";
import { eq, desc, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function verifyCandidateAccess(candidateId: number, user: { id: number; role: string }) {
  const [candidate] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);

  if (!candidate) return null;
  // Recruiter who owns the candidate, or candidate themselves, or admin
  if (
    candidate.ownerId === user.id ||
    candidate.userId === user.id ||
    user.role === "admin"
  ) {
    return candidate;
  }
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuthJson();
  if (error) return error;

  const { id } = await params;
  const candidateId = Number(id);
  if (!Number.isFinite(candidateId)) return jsonError("Invalid candidate ID");

  const candidate = await verifyCandidateAccess(candidateId, user);
  if (!candidate) return jsonError("Candidate not found or access denied", 404);

  const resumeList = await db
    .select()
    .from(resumes)
    .where(eq(resumes.candidateId, candidateId))
    .orderBy(desc(resumes.uploadedAt));

  return NextResponse.json({
    resumes: resumeList,
    latestResume: resumeList[0] || null,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuthJson();
  if (error) return error;

  const { id } = await params;
  const candidateId = Number(id);
  if (!Number.isFinite(candidateId)) return jsonError("Invalid candidate ID");

  const candidate = await verifyCandidateAccess(candidateId, user);
  if (!candidate) return jsonError("Candidate not found or access denied", 404);

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return jsonError("No file provided", 400);
    }

    // Validation: PDF or TXT up to 10MB
    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_SIZE) {
      return jsonError("File size exceeds 10MB limit", 400);
    }

    const mimeType = file.type || "application/pdf";
    const filename = file.name || "resume.pdf";

    // Read buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to storage
    const storageKey = await saveFile(buffer, filename, `resumes/${candidateId}`);

    // Insert resume record
    const [resumeRecord] = await db
      .insert(resumes)
      .values({
        candidateId,
        storageKey,
        filename,
        mimeType,
        parseStatus: "pending",
        parsedSkills: [],
      })
      .returning();

    // Trigger parsing & skill upsert
    const parseResult = await parseResumeAndUpsertSkills(resumeRecord.id);

    return NextResponse.json({
      success: true,
      resumeId: resumeRecord.id,
      filename,
      storageKey,
      parseStatus: parseResult.success ? "done" : "failed",
      skillsFound: parseResult.skillsFound,
      skillsCount: parseResult.skillsFound.length,
      error: parseResult.error,
    });
  } catch (err: any) {
    console.error("Resume upload error:", err);
    return jsonError(err.message || "Failed to upload and parse resume", 500);
  }
}
