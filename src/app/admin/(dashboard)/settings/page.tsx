"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Settings } from "@/lib/types";
import { User, Copy, Check, ExternalLink, Image as ImageIcon } from "lucide-react";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AdminSettingsPage() {
  const [supabase] = useState(() => createClient());
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setUserEmail(user.email ?? null);
      setUserId(user.id);

      // 1. Fetch from server API with service role access
      const res = await fetch(
        `/api/admin/settings?userId=${encodeURIComponent(user.id)}&userEmail=${encodeURIComponent(user.email || "")}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.settings) {
          setSettings(json.settings as Settings);
          return;
        }
      }

      // 2. Fallback direct Supabase queries if API route is unreachable
      const { data: userSettings } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (userSettings) {
        setSettings(userSettings as Settings);
        return;
      }

      const defaultName = user.email
        ? user.email
            .split("@")[0]
            .replace(/[._\-+]/g, " ")
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ")
        : "Recruiting Team";

      const { data: defaultSettings } = await supabase
        .from("settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (defaultSettings) {
        setSettings({
          ...(defaultSettings as Settings),
          user_id: user.id,
          admin_email: user.email || null,
          interviewer_name: defaultName,
        });
      } else {
        setSettings({
          user_id: user.id,
          admin_email: user.email || null,
          working_days: [1, 2, 3, 4, 5],
          day_start_time: "09:00:00",
          day_end_time: "17:00:00",
          slot_duration_mins: 30,
          timezone: "America/New_York",
          interviewer_name: defaultName,
          interviewer_photo_url: null,
          meeting_type: "Phone Call",
        });
      }
    } catch (err: any) {
      console.error("Failed to load settings:", err);
    }
  }, [supabase]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  if (!settings) return <p className="text-muted font-mono text-xs">Loading settings…</p>;

  function toggleDay(day: number) {
    if (!settings) return;
    const has = settings.working_days.includes(day);
    const working_days = has
      ? settings.working_days.filter((d) => d !== day)
      : [...settings.working_days, day].sort();
    setSettings({ ...settings, working_days });
  }

  async function save() {
    if (!settings || !userId) return;
    setSaving(true);
    setSaved(false);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          userEmail,
          settings,
        }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || "Failed to save settings to database");
      }

      if (json.settings) {
        setSettings(json.settings as Settings);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (err: any) {
      console.warn("API save failed, attempting direct Supabase write:", err);

      try {
        const payload = {
          user_id: userId,
          admin_email: userEmail || null,
          working_days: settings.working_days,
          day_start_time: settings.day_start_time,
          day_end_time: settings.day_end_time,
          slot_duration_mins: settings.slot_duration_mins,
          timezone: settings.timezone,
          interviewer_name: settings.interviewer_name,
          interviewer_photo_url: settings.interviewer_photo_url || null,
          meeting_type: settings.meeting_type,
        };

        const { data: existing } = await supabase
          .from("settings")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (existing?.id) {
          const { error: updateErr } = await supabase
            .from("settings")
            .update(payload)
            .eq("id", existing.id);
          if (updateErr) throw updateErr;
        } else {
          const { data: row1 } = await supabase
            .from("settings")
            .select("id, user_id")
            .eq("id", 1)
            .maybeSingle();

          if (row1 && (!row1.user_id || row1.user_id === userId)) {
            const { error: claimErr } = await supabase.from("settings").update(payload).eq("id", 1);
            if (claimErr) throw claimErr;
          } else {
            const { error: insertErr } = await supabase.from("settings").insert(payload);
            if (insertErr) throw insertErr;
          }
        }

        setSaved(true);
        setTimeout(() => setSaved(false), 3500);
      } catch (fallbackErr: any) {
        console.error("Direct save error:", fallbackErr);
        setErrorMessage(
          fallbackErr.message?.includes("row-level security")
            ? "Database RLS policy is blocking the save. Please run the SQL snippet in your Supabase SQL Editor to enable admin updates."
            : fallbackErr.message || err.message || "Failed to save settings. Please try again."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  const personalScheduleUrl = typeof window !== "undefined" && userId
    ? `${window.location.origin}/schedule?interviewer=${userId}`
    : `/schedule?interviewer=${userId || ""}`;

  const copyScheduleUrl = () => {
    navigator.clipboard.writeText(personalScheduleUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const initials = (settings.interviewer_name || "S J")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const labelClass = "font-mono text-xs uppercase tracking-widest2 text-muted";
  const inputClass =
    "mt-2 w-full border-b-2 rule-hairline bg-transparent py-2 text-ink outline-none focus:border-brass transition-colors font-sans text-sm";

  return (
    <div className="max-w-2xl font-sans pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Admin Scheduling Settings</h1>
          <p className="mt-1 text-sm text-muted">
            Configure your individual interviewer name, photo URL, and working schedule.
          </p>
        </div>

        {/* Current Admin Account Badge */}
        {userEmail && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-gray-200 rounded-xl shadow-2xs self-start sm:self-auto">
            <User className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs font-semibold text-gray-800">{userEmail}</span>
          </div>
        )}
      </div>

      {/* Live Preview Card */}
      <div className="mb-10 p-5 bg-white border border-gray-200 rounded-2xl shadow-xs">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-3 font-mono">
          Candidate View Preview
        </span>
        <div className="flex items-center gap-4">
          {settings.interviewer_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.interviewer_photo_url}
              alt={settings.interviewer_name || "Interviewer"}
              className="w-14 h-14 rounded-full object-cover border-2 border-gray-100 shadow-2xs"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gray-100 border border-gray-200 text-gray-700 font-bold flex items-center justify-center text-lg shadow-2xs">
              {initials}
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-gray-900 leading-tight">
              {settings.interviewer_name || "Interviewer Name"}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-medium text-gray-600">
                {settings.meeting_type || "Phone Call"}
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-xs text-gray-500 font-medium">
                {settings.slot_duration_mins} min
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Interviewer Schedule Link */}
      <div className="mb-10 p-5 bg-blue-50/50 border border-blue-200 rounded-2xl">
        <label className="text-xs font-bold text-blue-900 block mb-1">
          Your Personal Scheduling Link
        </label>
        <p className="text-xs text-blue-700 mb-3">
          Share this direct link with candidates to automatically display your specific Name, Photo, and Availability:
        </p>
        <div className="flex items-center gap-2 bg-white border border-blue-200 rounded-xl p-2 shadow-2xs">
          <input
            type="text"
            readOnly
            value={personalScheduleUrl}
            className="w-full bg-transparent text-xs font-mono text-gray-800 outline-none px-2 select-all"
          />
          <button
            type="button"
            onClick={copyScheduleUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0069ff] hover:bg-[#0055d4] text-white rounded-lg text-xs font-semibold transition-colors shrink-0 shadow-2xs cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? "Copied" : "Copy Link"}</span>
          </button>
          <a
            href={personalScheduleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-gray-500 hover:text-gray-800 transition-colors shrink-0"
            title="Open scheduling page in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Interviewer Settings Form */}
      <div className="space-y-8">
        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest2 text-brass mb-4">
            Interviewer Profile
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Name</label>
              <input
                value={settings.interviewer_name}
                onChange={(e) => setSettings({ ...settings, interviewer_name: e.target.value })}
                className={inputClass}
                placeholder="e.g. Sarah Jenkins"
              />
            </div>
            <div>
              <label className={labelClass}>Meeting Type Label</label>
              <input
                value={settings.meeting_type}
                onChange={(e) => setSettings({ ...settings, meeting_type: e.target.value })}
                className={inputClass}
                placeholder="Web Conference / Phone Call"
              />
            </div>
          </div>

          <div className="mt-6">
            <label className={labelClass}>Photo URL</label>
            <div className="flex items-center gap-2">
              <input
                value={settings.interviewer_photo_url ?? ""}
                onChange={(e) => setSettings({ ...settings, interviewer_photo_url: e.target.value })}
                className={inputClass}
                placeholder="https://example.com/your-photo.jpg"
              />
            </div>
            <p className="mt-2 text-xs text-muted leading-relaxed">
              Paste a direct image URL (from Supabase Storage, LinkedIn, or your hosting). If left empty, your initials ({initials}) will be displayed instead.
            </p>
          </div>
        </div>

        {/* Availability Section */}
        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest2 text-brass mb-4">
            Availability Schedule
          </h2>
          <div>
            <label className={labelClass}>Working Days</label>
            <div className="mt-3 flex flex-wrap gap-2">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`px-4 py-2 font-mono text-xs uppercase tracking-widest2 border rule-hairline rounded-lg transition-colors cursor-pointer ${
                    settings.working_days.includes(i)
                      ? "bg-ink text-paper border-ink"
                      : "text-muted hover:border-ink bg-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mt-6">
            <div>
              <label className={labelClass}>Day Starts</label>
              <input
                type="time"
                value={settings.day_start_time.slice(0, 5)}
                onChange={(e) => setSettings({ ...settings, day_start_time: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Day Ends</label>
              <input
                type="time"
                value={settings.day_end_time.slice(0, 5)}
                onChange={(e) => setSettings({ ...settings, day_end_time: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-6">
            <label className={labelClass}>Slot Duration (minutes)</label>
            <input
              type="number"
              min={10}
              step={5}
              value={settings.slot_duration_mins}
              onChange={(e) => setSettings({ ...settings, slot_duration_mins: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 flex flex-wrap items-center gap-4">
          <button
            onClick={save}
            disabled={saving}
            className="bg-ink hover:bg-brassdim text-paper px-8 py-3.5 font-mono text-xs uppercase tracking-widest2 transition-colors disabled:opacity-50 rounded-xl cursor-pointer shadow-sm"
          >
            {saving ? "Saving…" : saved ? "✓ Settings Saved" : "Save Profile Settings"}
          </button>
          {saved && (
            <span className="text-xs font-semibold text-emerald-600 animate-fade-in">
              Changes saved successfully!
            </span>
          )}
          {errorMessage && (
            <span className="text-xs font-semibold text-red-600 animate-fade-in">
              {errorMessage}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
