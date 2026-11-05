import Link from "next/link";
import type { Settings } from "@/lib/types";
import { formatSelectionSummary } from "@/lib/scheduling";
import { ArrowLeft, Clock, Video, Calendar as CalendarIcon, Globe } from "lucide-react";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function MeetingInfoPanel({
  settings,
  jobTitle,
  selection,
  timezone,
  onBack,
  showBackButton = false,
}: {
  settings: Settings;
  jobTitle?: string | null;
  selection?: { date: string; startTime: string; endTime: string } | null;
  timezone?: string;
  onBack?: () => void;
  showBackButton?: boolean;
}) {
  const currentTz =
    timezone ||
    (typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : settings.timezone);

  return (
    <div className="w-full sm:w-[320px] shrink-0 sm:border-r border-gray-200/80 p-8 sm:p-10 flex flex-col justify-between font-sans bg-white">
      <div>
        {/* Optional Round Back Button */}
        {showBackButton && onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back to date & time selection"
            className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-[#0069ff] hover:bg-blue-50/70 hover:border-[#0069ff] transition-all mb-6 focus:outline-none"
          >
            <ArrowLeft className="w-5 h-5 text-[#0069ff]" />
          </button>
        )}

        {/* Interviewer Profile Picture + Name */}
        <div className="flex items-center gap-3.5 mb-4">
          {settings.interviewer_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.interviewer_photo_url}
              alt={settings.interviewer_name || "Recruiting Team"}
              className="h-11 w-11 rounded-full object-cover border border-gray-200 shadow-xs"
            />
          ) : (
            <div className="h-11 w-11 rounded-full bg-[#0a2540] text-white flex items-center justify-center font-medium text-sm shrink-0 shadow-xs">
              {initials(settings.interviewer_name || "Recruiting Team")}
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-gray-600 leading-tight">
              {settings.interviewer_name || "Recruiting Team"}
            </p>
          </div>
        </div>

        {/* Meeting Title */}
        <h1 className="font-sans text-2xl sm:text-[26px] font-semibold text-[#0a2540] leading-tight">
          {settings.slot_duration_mins} Minute Meeting
        </h1>

        {jobTitle && (
          <p className="mt-1 text-xs font-normal text-gray-400">Position: {jobTitle}</p>
        )}

        {/* Meta details */}
        <div className="mt-6 space-y-3.5 text-sm text-gray-600 font-normal">
          {/* Duration */}
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-gray-500 shrink-0" />
            <span>{settings.slot_duration_mins} min</span>
          </div>

          {/* Web conferencing details */}
          <div className="flex items-start gap-3">
            <Video className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
            <span className="leading-snug text-gray-600">
              Web conferencing details provided upon confirmation.
            </span>
          </div>

          {/* Date & Time (if selected, e.g. Step 2) */}
          {selection && (
            <>
              <div className="flex items-start gap-3 text-gray-700 font-medium pt-1">
                <CalendarIcon className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                <span>
                  {formatSelectionSummary(
                    selection.date,
                    selection.startTime,
                    selection.endTime
                  )}
                </span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Globe className="w-4 h-4 text-gray-500 shrink-0" />
                <span>{currentTz.replace(/_/g, " ")}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Footer Links (Cookie settings & Privacy Policy in Blue) */}
      <div className="mt-12 sm:mt-auto pt-8 flex items-center gap-6 text-xs font-normal">
        <button
          type="button"
          onClick={() => alert("Cookie preferences: Essential cookies only.")}
          className="text-[#0069ff] hover:underline focus:outline-none"
        >
          Cookie settings
        </button>
        <Link href="/contact" className="text-[#0069ff] hover:underline">
          Privacy Policy
        </Link>
      </div>
    </div>
  );
}
