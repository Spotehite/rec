import Link from "next/link";

interface LogoProps {
  className?: string;
  showTagline?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function Logo({ className = "", showTagline = false, size = "md" }: LogoProps) {
  const iconSize = size === "sm" ? 28 : size === "lg" ? 44 : 34;

  return (
    <Link href="/" className={`inline-flex items-center gap-3 group select-none ${className}`}>
      {/* Refined Geometric / Monogram Emblem */}
      <div
        className="relative flex items-center justify-center rounded-lg bg-ink text-paper transition-transform duration-300 group-hover:scale-105 shadow-sm"
        style={{ width: iconSize, height: iconSize }}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-3/4 h-3/4"
        >
          {/* Northfield Geometric Compass / Career Ascent Motif */}
          <path
            d="M8 24V8L17 18V8"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M24 8V24L15 14V24"
            stroke="#B8862E"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="16" r="2" fill="#B8862E" />
        </svg>
      </div>

      <div className="flex flex-col">
        <span
          className={`font-display tracking-tight text-ink font-semibold flex items-center gap-1.5 ${
            size === "sm" ? "text-lg" : size === "lg" ? "text-2xl" : "text-xl"
          }`}
        >
          Northfield
          <span className="font-normal italic text-brass text-[0.9em]">Careers</span>
        </span>
        {showTagline && (
          <span className="font-mono text-[9px] uppercase tracking-widest2 text-muted -mt-0.5">
            Talent &amp; Opportunity
          </span>
        )}
      </div>
    </Link>
  );
}
