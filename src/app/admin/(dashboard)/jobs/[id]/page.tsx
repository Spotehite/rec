import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import JobForm from "@/components/admin/JobForm";
import type { Job } from "@/lib/types";

export const revalidate = 0;

export default async function EditJobPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: job } = await supabase.from("jobs").select("*").eq("id", params.id).maybeSingle();

  if (!job) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl text-ink mb-8">Edit Job</h1>
      <JobForm job={job as Job} />
    </div>
  );
}
