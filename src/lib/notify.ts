import { db } from "@/db";
import { notifications, Notification } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export type NotificationType =
  | "interview_scheduled"
  | "status_changed"
  | "offer_received"
  | "availability_changed"
  | "candidate_invited"
  | "resume_parsed";

/**
 * Creates a notification for a user
 */
export async function createNotification(
  userId: number,
  type: NotificationType,
  title: string,
  body: string,
  href?: string
): Promise<Notification | null> {
  try {
    const [inserted] = await db
      .insert(notifications)
      .values({
        userId,
        type,
        title,
        body,
        href: href || null,
        read: false,
      })
      .returning();
    return inserted;
  } catch (err) {
    console.error("Failed to create notification:", err);
    return null;
  }
}

/**
 * Marks a single notification as read (verifying user ownership)
 */
export async function markRead(
  userId: number,
  notificationId: number
): Promise<boolean> {
  try {
    await db
      .update(notifications)
      .set({ read: true })
      .where(
        sql`${notifications.id} = ${notificationId} AND ${notifications.userId} = ${userId}`
      );
    return true;
  } catch (err) {
    console.error("Failed to mark notification as read:", err);
    return false;
  }
}

/**
 * Marks all notifications as read for a user
 */
export async function markAllRead(userId: number): Promise<boolean> {
  try {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId));
    return true;
  } catch (err) {
    console.error("Failed to mark all notifications as read:", err);
    return false;
  }
}

/**
 * Gets unread count for a user
 */
export async function getUnreadCount(userId: number): Promise<number> {
  try {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        sql`${notifications.userId} = ${userId} AND ${notifications.read} = false`
      );
    return result[0]?.count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Retrieves the latest notifications for a user
 */
export async function getUserNotifications(
  userId: number,
  limit = 20
): Promise<Notification[]> {
  try {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  } catch (err) {
    console.error("Failed to fetch user notifications:", err);
    return [];
  }
}
