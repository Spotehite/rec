"use client";

import { useEffect } from "react";

interface NorthErrorModalProps {
  isOpen: boolean;
}

export default function NorthErrorModal({ isOpen }: NorthErrorModalProps) {
  // Prevent background scroll when error page is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-white p-6 font-sans select-none overflow-y-auto animate-fade-in"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex flex-col items-center justify-center max-w-2xl mx-auto text-center px-4">
        {/* Pale Mint Green Outlined Lightning Bolt Icon */}
        <svg
          className="w-11 h-[88px] select-none shrink-0"
          viewBox="0 0 44 87"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <polygon
            points="14,0 44,0 23,38 42,38 12,87 18,49 0,49"
            fill="none"
            stroke="#b4dec9"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Title: North  Error! (double space between North and Error) */}
        <h1 className="mt-7 text-2xl sm:text-[32px] font-normal text-[#000000] tracking-normal leading-tight">
          Calendly&nbsp;&nbsp;Error!
        </h1>

        {/* Subtitle / Apologies text */}
        <p className="mt-4 text-base sm:text-[18px] font-normal text-[#111111] leading-relaxed">
          Apologies for the inconvenience. We&apos;ve been alerted and we&apos;re on it.
        </p>

        {/* Status page note with cyan-teal link */}
        <p className="mt-3 text-xs sm:text-[13px] font-normal text-[#333333]">
          Please refer to our{" "}
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="text-[#26a8c4] hover:underline cursor-pointer"
          >
            status page
          </a>{" "}
          for more details.
        </p>
      </div>
    </div>
  );
}
