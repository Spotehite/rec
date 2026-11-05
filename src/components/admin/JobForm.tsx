"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Job, JobInput, JobStatus, EmploymentType } from "@/lib/types";

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function linesToArray(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function arrayToLines(arr: string[]): string {
  return (arr ?? []).join("\n");
}

export default function JobForm({ job }: { job?: Job }) {
  const router = useRouter();
  const supabase = createClient();
  const isEdit = Boolean(job);

  const [title, setTitle] = useState(job?.title ?? "");
  const [location, setLocation] = useState(job?.location ?? "");
  const [department, setDepartment] = useState(job?.department ?? "");
  const [employmentType, setEmploymentType] = useState<EmploymentType>(job?.employment_type ?? "Full Time");
  const [shortDescription, setShortDescription] = useState(job?.short_description ?? "");
  const [description, setDescription] = useState(job?.description ?? "");
  const [responsibilities, setResponsibilities] = useState(arrayToLines(job?.responsibilities ?? []));
  const [requirements, setRequirements] = useState(arrayToLines(job?.requirements ?? []));
  const [benefits, setBenefits] = useState(arrayToLines(job?.benefits ?? []));
  const [status, setStatus] = useState<JobStatus>(job?.status ?? "draft");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload: JobInput = {
      title,
      slug: job?.slug ?? slugify(title),
      location,
      department,
      employment_type: employmentType,
      short_description: shortDescription,
      description,
      responsibilities: linesToArray(responsibilities),
      requirements: linesToArray(requirements),
      benefits: linesToArray(benefits),
      status,
    };

    const { error } = isEdit
      ? await supabase.from("jobs").update(payload).eq("id", job!.id)
      : await supabase.from("jobs").insert(payload);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    router.push("/admin/jobs");
    router.refresh();
  }

  const inputClass =
    "mt-2 w-full border-b-2 rule-hairline bg-transparent py-2 text-ink outline-none focus:border-brass transition-colors";
  const labelClass = "font-mono text-xs uppercase tracking-widest2 text-muted";
  const textareaClass =
    "mt-2 w-full border rule-hairline bg-transparent p-3 text-ink outline-none focus:border-brass transition-colors min-h-[120px]";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
      {error && (
        <p className="rounded-sm border border-rejected/30 bg-rejected/5 px-4 py-3 text-sm text-rejected">{error}</p>
      )}

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label className={labelClass}>Job Title</label>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Location</label>
          <input required value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Department</label>
          <input required value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Employment Type</label>
          <select
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
            className={inputClass}
          >
            <option>Full Time</option>
            <option>Part Time</option>
            <option>Contract</option>
            <option>Internship</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Short Description</label>
        <input
          required
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          className={inputClass}
          placeholder="One line shown on the job listing card"
        />
      </div>

      <div>
        <label className={labelClass}>Full Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={textareaClass} />
      </div>

      <div>
        <label className={labelClass}>Responsibilities (one per line)</label>
        <textarea
          value={responsibilities}
          onChange={(e) => setResponsibilities(e.target.value)}
          className={textareaClass}
        />
      </div>

      <div>
        <label className={labelClass}>Requirements (one per line)</label>
        <textarea value={requirements} onChange={(e) => setRequirements(e.target.value)} className={textareaClass} />
      </div>

      <div>
        <label className={labelClass}>What We Offer (one per line)</label>
        <textarea value={benefits} onChange={(e) => setBenefits(e.target.value)} className={textareaClass} />
      </div>

      <div>
        <label className={labelClass}>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as JobStatus)} className={inputClass}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="flex gap-4 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-ink text-paper px-7 py-4 font-mono text-xs uppercase tracking-widest2 hover:bg-brassdim transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Job"}
        </button>
      </div>
    </form>
  );
}
