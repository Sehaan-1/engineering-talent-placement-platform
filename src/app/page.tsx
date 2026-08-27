import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { seedDatabase } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) {
    // Auto-seed on first visit so the empty-state experience is intentional,
    // not a bug. The seed is idempotent.
    try {
      await seedDatabase();
    } catch {
      // ignore - will retry from /login if needed
    }
    redirect("/login");
  }
  redirect("/dashboard");
}
