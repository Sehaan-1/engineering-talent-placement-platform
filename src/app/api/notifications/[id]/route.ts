import { requireAuthJson, jsonError } from "@/lib/types";
import { markRead } from "@/lib/notify";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuthJson();
  if (error) return error;

  const { id } = await params;
  const notifId = Number(id);
  if (!Number.isFinite(notifId)) return jsonError("Invalid notification ID");

  try {
    const success = await markRead(user.id, notifId);
    return NextResponse.json({ success });
  } catch (err: any) {
    console.error("Failed to mark notification as read:", err);
    return jsonError("Failed to update notification", 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuthJson();
  if (error) return error;

  const { id } = await params;
  const notifId = Number(id);
  if (!Number.isFinite(notifId)) return jsonError("Invalid notification ID");

  try {
    await db
      .delete(notifications)
      .where(
        sql`${notifications.id} = ${notifId} AND ${notifications.userId} = ${user.id}`
      );
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Failed to delete notification:", err);
    return jsonError("Failed to delete notification", 500);
  }
}
