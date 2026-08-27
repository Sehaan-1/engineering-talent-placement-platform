import { seedDatabase } from "@/lib/seed";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await seedDatabase();
    return NextResponse.json(result);
  } catch (err) {
    console.error("SEED_ERROR:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}
