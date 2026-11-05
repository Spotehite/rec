"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Job, JobStatus } from "@/lib/types";
import StatusPill from "@/components/admin/StatusPill";

export default function AdminJobsPage() {
  const [supabase] = useState(() => createClient());
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });
    setJobs((data ?? []) as Job[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function togglePublish(job: Job) {
    const next: JobStatus = job.status === "published" ? "draft" : "published";
    await supabase.from("jobs").update({ status: next }).eq("id", job.id);
    load();
  }

  async function remove(job: Job) {
    if (!confirm(`Delete "${job.title}"? This can't be undone.`)) return;
    await supabase.from("jobs").delete().eq("id", job.id);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-ink">Jobs</h1>
        <Link
          href="/admin/jobs/new"
          className="bg-ink text-paper px-5 py-3 font-mono text-xs uppercase tracking-widest2 hover:bg-brassdim transition-colors"
        >
          New Job
        </Link>
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b rule-hairline font-mono text-[11px] uppercase tracking-widest2 text-muted">
              <th className="py-3 pr-4">Job Title</th>
              <th className="py-3 pr-4">Location</th>
              <th className="py-3 pr-4">Department</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4">Created</th>
              <th className="py-3 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted">Loading…</td>
              </tr>
            )}
            {!loading && jobs.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted">No jobs yet — create your first one.</td>
              </tr>
            )}
            {jobs.map((job) => (
              <tr key={job.id} className="border-b rule-hairline">
                <td className="py-4 pr-4 text-ink">{job.title}</td>
                <td className="py-4 pr-4 text-muted">{job.location}</td>
                <td className="py-4 pr-4 text-muted">{job.department}</td>
                <td className="py-4 pr-4"><StatusPill status={job.status} /></td>
                <td className="py-4 pr-4 text-muted font-mono text-xs">
                  {new Date(job.created_at).toLocaleDateString()}
                </td>
                <td className="py-4 pr-4">
                  <div className="flex gap-4 font-mono text-xs uppercase tracking-widest2">
                    <Link href={`/admin/jobs/${job.id}`} className="text-brass hover:text-brassdim">
                      Edit
                    </Link>
                    <button onClick={() => togglePublish(job)} className="text-ink hover:text-brassdim">
                      {job.status === "published" ? "Unpublish" : "Publish"}
                    </button>
                    <button onClick={() => remove(job)} className="text-rejected hover:text-rejected/70">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
