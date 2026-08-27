import { getCurrentUser } from "@/lib/auth";
import { getUnreadCount, getUserNotifications } from "@/lib/notify";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = user.id;
  const encoder = new TextEncoder();

  let intervalId: NodeJS.Timeout | null = null;
  let isClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial data immediately
      try {
        const [unreadCount, recent] = await Promise.all([
          getUnreadCount(userId),
          getUserNotifications(userId, 5),
        ]);

        const payload = `data: ${JSON.stringify({ unreadCount, recent })}\n\n`;
        controller.enqueue(encoder.encode(payload));
      } catch (err) {
        console.error("Initial SSE push failed:", err);
      }

      // Poll every 5 seconds
      intervalId = setInterval(async () => {
        if (isClosed || req.signal.aborted) {
          if (intervalId) clearInterval(intervalId);
          return;
        }

        try {
          const unreadCount = await getUnreadCount(userId);
          const payload = `data: ${JSON.stringify({ unreadCount, timestamp: Date.now() })}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch (err) {
          // Stream might be closed
          if (intervalId) clearInterval(intervalId);
        }
      }, 5000);
    },
    cancel() {
      isClosed = true;
      if (intervalId) clearInterval(intervalId);
    },
  });

  req.signal.addEventListener("abort", () => {
    isClosed = true;
    if (intervalId) clearInterval(intervalId);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
