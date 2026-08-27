import { NextRequest, NextResponse } from "next/server";
import { readFileBuffer } from "@/lib/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key } = await params;
    if (!key || key.length === 0) {
      return NextResponse.json({ error: "File key required" }, { status: 400 });
    }

    const keyPath = key.join("/");
    // Basic security check: prevent directory traversal
    if (keyPath.includes("..") || keyPath.startsWith("/") || keyPath.startsWith("\\")) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    const buffer = await readFileBuffer(keyPath);
    const filename = key[key.length - 1];
    let contentType = "application/octet-stream";
    if (filename.endsWith(".pdf")) {
      contentType = "application/pdf";
    } else if (filename.endsWith(".png")) {
      contentType = "image/png";
    } else if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
      contentType = "image/jpeg";
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    console.error("Error serving file:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
