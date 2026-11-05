"use client";

import { useState, useMemo } from "react";
import type { Job } from "@/lib/types";
import JobRow from "./JobRow";
import { Search, Filter, Briefcase, X, SlidersHorizontal, Sparkles, MapPin, Check } from "lucide-react";

interface JobListingsProps {
  jobs: Job[];
}

export default function JobListings({ jobs }: JobListingsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All");

  const departments = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => {
      if (j.department) set.add(j.department);
    });
    return ["All", ...Array.from(set).sort()];
  }, [jobs]);

  const locations = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => {
      if (j.location) {
        // Extract city/region or Remote
        if (j.location.toLowerCase().includes("remote")) {
          set.add("Remote - US");
        } else if (j.location.includes(",")) {
          set.add(j.location.split("(")[0].trim());
        } else {
          set.add(j.location);
        }
      }
    });
    return ["All", ...Array.from(set).sort()];
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        job.title.toLowerCase().includes(q) ||
        job.short_description.toLowerCase().includes(q) ||
        job.location.toLowerCase().includes(q) ||
        job.department.toLowerCase().includes(q);

      const matchesDept = selectedDept === "All" || job.department === selectedDept;

      const matchesLocation =
        selectedLocation === "All" ||
        (selectedLocation === "Remote - US"
          ? job.location.toLowerCase().includes("remote")
          : job.location.toLowerCase().includes(selectedLocation.toLowerCase()));

      return matchesSearch && matchesDept && matchesLocation;
    });
  }, [jobs, searchQuery, selectedDept, selectedLocation]);

  const isFiltered = searchQuery !== "" || selectedDept !== "All" || selectedLocation !== "All";

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedDept("All");
    setSelectedLocation("All");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
      {/* ========================================================================= */}
      {/* SIDEBAR FILTER (Desktop Sticky + Mobile Header) */}
      {/* ========================================================================= */}
      <aside className="lg:col-span-4 xl:col-span-3 space-y-6 lg:sticky lg:top-24">
        {/* Search Box */}
        <div className="p-5 rounded-2xl bg-paper border rule-hairline shadow-2xs space-y-3">
          <label className="font-mono text-xs uppercase tracking-widest2 text-ink font-semibold flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-brass" />
            <span>Search Positions</span>
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Title, skill, or keyword…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-paperdim/50 border rule-hairline rounded-xl pl-9 pr-8 py-2.5 text-xs text-ink placeholder:text-muted/70 outline-none focus:border-brass focus:bg-paper transition-all font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink p-1 rounded-md"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Department Filter Sidebar */}
        <div className="p-5 rounded-2xl bg-paper border rule-hairline shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b rule-hairline">
            <span className="font-mono text-xs uppercase tracking-widest2 text-ink font-semibold flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-brass" />
              <span>Departments</span>
            </span>
            {selectedDept !== "All" && (
              <button
                onClick={() => setSelectedDept("All")}
                className="font-mono text-[11px] text-brass hover:underline"
              >
                Reset
              </button>
            )}
          </div>

          {/* Vertical Menu for Clean Aesthetic (Wraps naturally on mobile) */}
          <div className="flex flex-wrap lg:flex-col gap-1.5 pt-1">
            {departments.map((dept) => {
              const count =
                dept === "All" ? jobs.length : jobs.filter((j) => j.department === dept).length;
              const isSelected = selectedDept === dept;

              return (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSelectedDept(dept)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between group cursor-pointer ${
                    isSelected
                      ? "bg-ink text-paper font-semibold shadow-xs"
                      : "text-muted hover:text-ink hover:bg-paperdim/80 font-normal"
                  }`}
                >
                  <span className="truncate pr-2">{dept}</span>
                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 rounded-full transition-colors shrink-0 ${
                      isSelected
                        ? "bg-brass text-paper font-bold"
                        : "bg-paperdim text-muted group-hover:bg-paper group-hover:text-ink"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Filter Reset (Visible when active) */}
        {isFiltered && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="w-full py-2.5 px-4 rounded-xl border border-dashed rule-hairline text-brass hover:bg-brass/5 font-mono text-xs uppercase tracking-widest2 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear All Filters</span>
          </button>
        )}
      </aside>

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: JOB STREAM */}
      {/* ========================================================================= */}
      <main className="lg:col-span-8 xl:col-span-9 space-y-6">
        {/* Results Header Status Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b rule-hairline">
          <div className="flex items-center gap-2.5">
            <span className="font-display text-lg text-ink font-medium">
              {selectedDept === "All" ? "All Active Positions" : selectedDept}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-brass/10 text-brass font-mono text-xs font-semibold">
              {filteredJobs.length} Role{filteredJobs.length === 1 ? "" : "s"}
            </span>
          </div>

          {searchQuery && (
            <span className="font-mono text-xs text-muted">
              Matching &ldquo;<span className="text-ink font-semibold">{searchQuery}</span>&rdquo;
            </span>
          )}
        </div>

        {/* Jobs List */}
        {filteredJobs.length === 0 ? (
          <div className="py-24 text-center rounded-3xl border border-dashed rule-hairline bg-paperdim/20 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-paper border rule-hairline flex items-center justify-center mx-auto text-muted shadow-2xs">
              <Briefcase className="w-6 h-6 text-brass" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-2xl text-ink font-medium">No matching roles found</h3>
              <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
                We couldn&rsquo;t find any published openings matching your current search criteria.
              </p>
            </div>
            {isFiltered && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center gap-2 bg-ink text-paper px-6 py-3 rounded-xl font-mono text-xs uppercase tracking-widest2 hover:bg-brassdim transition-colors shadow-sm cursor-pointer"
              >
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-rule/60">
            {filteredJobs.map((job, index) => (
              <JobRow key={job.id} job={job} index={index} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
