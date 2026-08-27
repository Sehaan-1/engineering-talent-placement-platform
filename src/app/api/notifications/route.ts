import { requireAuthJson } from "@/lib/types";
import { getUserNotifications, getUnreadCount, markAllRead } from "@/lib/notify";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const { user, error } = await requireAuthJson();
  if (error) return error;

  try {
    const [unreadCount, notificationsList] = await Promise.all([
      getUnreadCount(user.id),
      getUserNotifications(user.id, 25),
    ]);

    return NextResponse.json({
      unreadCount,
      notifications: notificationsList,
    });
  } catch (err: any) {
    console.error("Failed to fetch notifications:", err);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(_req: NextRequest) {
  const { user, error } = await requireAuthJson();
  if (error) return error;

  try {
    const success = await markAllRead(user.id);
    return NextResponse.json({ success });
  } catch (err: any) {
    console.error("Failed to mark all notifications as read:", err);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
