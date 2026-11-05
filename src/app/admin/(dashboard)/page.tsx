import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

export default async function AdminOverviewPage() {
  const supabase = createClient();

  const [{ count: jobCount }, { count: publishedCount }, { count: pendingCount }, { count: bookingCount }] =
    await Promise.all([
      supabase.from("jobs").select("*", { count: "exact", head: true }),
      supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("bookings").select("*", { count: "exact", head: true }),
    ]);

  const stats = [
    { label: "Published Jobs", value: publishedCount ?? 0 },
    { label: "Total Jobs", value: jobCount ?? 0 },
    { label: "Pending Verifications", value: pendingCount ?? 0 },
    { label: "Total Bookings", value: bookingCount ?? 0 },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Overview</h1>

      <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-px bg-rule border rule-hairline">
        {stats.map((s) => (
          <div key={s.label} className="bg-paper px-5 py-6">
            <p className="font-display text-3xl text-ink">{s.value}</p>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-widest2 text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-4">
        <Link
          href="/admin/jobs/new"
          className="bg-ink text-paper px-6 py-3 font-mono text-xs uppercase tracking-widest2 hover:bg-brassdim transition-colors"
        >
          New Job
        </Link>
        <Link
          href="/admin/bookings"
          className="border border-ink/20 px-6 py-3 font-mono text-xs uppercase tracking-widest2 text-ink hover:border-ink transition-colors"
        >
          Review Bookings
        </Link>
      </div>
    </div>
  );
}
