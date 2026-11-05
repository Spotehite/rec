import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/admin/LogoutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-paper flex flex-col sm:flex-row">
      <aside className="sm:w-56 border-b sm:border-b-0 sm:border-r rule-hairline px-6 py-6 sm:py-10 flex sm:flex-col justify-between sm:justify-start">
        <div>
          <Link href="/admin" className="font-display text-xl text-ink">
            Northfield <span className="italic text-brass">Admin</span>
          </Link>
          <nav className="hidden sm:flex flex-col gap-1 mt-10 font-mono text-xs uppercase tracking-widest2">
            <Link href="/admin" className="px-3 py-2 rounded-sm text-muted hover:text-ink hover:bg-paperdim transition-colors">
              Overview
            </Link>
            <Link href="/admin/jobs" className="px-3 py-2 rounded-sm text-muted hover:text-ink hover:bg-paperdim transition-colors">
              Jobs
            </Link>
            <Link href="/admin/bookings" className="px-3 py-2 rounded-sm text-muted hover:text-ink hover:bg-paperdim transition-colors">
              Bookings
            </Link>
            <Link href="/admin/list" className="px-3 py-2 rounded-sm text-muted hover:text-ink hover:bg-paperdim transition-colors">
              List
            </Link>
            <Link href="/admin/settings" className="px-3 py-2 rounded-sm text-muted hover:text-ink hover:bg-paperdim transition-colors">
              Settings
            </Link>
          </nav>
        </div>
        <div className="flex sm:hidden items-center gap-4 font-mono text-xs uppercase tracking-widest2">
          <Link href="/admin" className="text-muted hover:text-ink">Overview</Link>
          <Link href="/admin/jobs" className="text-muted hover:text-ink">Jobs</Link>
          <Link href="/admin/bookings" className="text-muted hover:text-ink">Bookings</Link>
          <Link href="/admin/list" className="text-muted hover:text-ink">List</Link>
          <Link href="/admin/settings" className="text-muted hover:text-ink">Settings</Link>
        </div>
        <div className="hidden sm:block mt-auto pt-10">
          <p className="text-xs text-muted mb-3 truncate">{user.email}</p>
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 px-6 py-10 sm:px-10 sm:py-10">{children}</main>
    </div>
  );
}
