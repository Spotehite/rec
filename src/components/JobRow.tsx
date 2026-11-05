import Link from "next/link";
import type { Job } from "@/lib/types";
import { ArrowUpRight, MapPin, Briefcase, Clock } from "lucide-react";

export default function JobRow({ job, index }: { job: Job; index: number }) {
  return (
    <Link
      href={`/jobs/${job.slug}`}
      className="group block border-b rule-hairline py-7 px-4 -mx-4 rounded-xl transition-all duration-200 hover:bg-paperdim/70 hover:shadow-sm"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Side: Number + Title + Description */}
        <div className="flex items-start gap-4 flex-1">
          <span className="font-mono text-xs font-semibold text-brass shrink-0 mt-1.5 w-6">
            {String(index + 1).padStart(2, "0")}
          </span>

          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-display text-2xl text-ink group-hover:text-brassdim transition-colors font-medium">
                {job.title}
              </h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider bg-brass/10 text-brass font-medium">
                {job.department}
              </span>
            </div>

            <p className="text-[14px] leading-relaxed text-muted line-clamp-2 max-w-3xl">
              {job.short_description}
            </p>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 font-mono text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brass" />
                {job.location}
              </span>
              <span aria-hidden className="text-rule">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-brass" />
                {job.employment_type}
              </span>
              <span aria-hidden className="text-rule">·</span>
              <span className="inline-flex items-center gap-1.5 text-blue-700">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Actively Reviewing
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Action Button */}
        <div className="flex items-center md:self-center shrink-0 pl-10 md:pl-0">
          <span className="inline-flex items-center gap-1.5 border border-ink/20 group-hover:border-ink group-hover:bg-ink group-hover:text-paper px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-widest2 text-ink transition-all duration-200">
            <span>View Position</span>
            <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
