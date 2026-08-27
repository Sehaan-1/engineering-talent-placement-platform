import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

/**
 * Storage service abstraction for local and S3-compatible cloud storage
 */
export async function saveFile(
  buffer: Buffer,
  filename: string,
  folder = "resumes"
): Promise<string> {
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniquePrefix = crypto.randomBytes(8).toString("hex");
  const key = `${folder}/${Date.now()}_${uniquePrefix}_${sanitized}`;

  const targetDir = path.join(UPLOAD_DIR, folder);
  await fs.mkdir(targetDir, { recursive: true });

  const targetPath = path.join(UPLOAD_DIR, key);
  await fs.writeFile(targetPath, buffer);

  return key;
}

export async function getFileUrl(key: string): Promise<string> {
  if (process.env.STORAGE_PROVIDER === "s3" || process.env.STORAGE_PROVIDER === "r2") {
    const bucket = process.env.S3_BUCKET || "";
    const endpoint = process.env.S3_PUBLIC_DOMAIN;
    if (endpoint) {
      return `${endpoint.replace(/\/$/, "")}/${key}`;
    }
    return `https://${bucket}.s3.amazonaws.com/${key}`;
  }
  // Default local endpoint
  return `/api/files/${key}`;
}

export async function readFileBuffer(key: string): Promise<Buffer> {
  const targetPath = path.join(UPLOAD_DIR, key);
  return await fs.readFile(targetPath);
}

export async function deleteFile(key: string): Promise<void> {
  try {
    const targetPath = path.join(UPLOAD_DIR, key);
    await fs.unlink(targetPath);
  } catch {
    // Ignore if not found
  }
}
