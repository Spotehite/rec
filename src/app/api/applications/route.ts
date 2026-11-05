import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { escapeHtml, sendTelegramNotification } from "@/lib/telegram";

async function resolveIpAndLocation(req: NextRequest) {
  let ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-client-ip") ||
    "";

  let city = req.headers.get("x-vercel-ip-city") || "";
  let state = req.headers.get("x-vercel-ip-country-region") || "";
  let country = req.headers.get("x-vercel-ip-country") || "";

  if (city) city = decodeURIComponent(city);
  if (state) state = decodeURIComponent(state);
  if (country) country = decodeURIComponent(country);

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

  const locParts = [city, state, country].filter(Boolean);
  const locationStr = locParts.length > 0 ? locParts.join(", ") : "Unknown Location";

  return {
    ip: ip || "Unknown IP",
    city,
    state,
    country,
    location: locationStr,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      job_id,
      job_slug,
      job_title,
      first_name,
      last_name,
      email,
      phone_number,
      linkedin_url,
      portfolio_url,
      resume_filename,
      resume_file_data,
      cover_note,
    } = body;

    if (!first_name || !email || !job_title) {
      return NextResponse.json(
        { error: "First name, email, and job title are required." },
        { status: 400 }
      );
    }

    const geo = await resolveIpAndLocation(req);

    // Initialize Supabase Client (Service or Anon)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vqtfcdudbrnfukwsglpq.supabase.co";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const applicationRecord = {
      job_id: job_id || null,
      job_slug: job_slug || null,
      job_title: job_title.trim(),
      first_name: first_name.trim(),
      last_name: (last_name || "").trim(),
      email: email.trim().toLowerCase(),
      phone_number: (phone_number || "").trim() || null,
      linkedin_url: (linkedin_url || "").trim() || null,
      portfolio_url: (portfolio_url || "").trim() || null,
      resume_filename: resume_filename || null,
      resume_file_data: resume_file_data || null,
      cover_note: (cover_note || "").trim() || null,
      status: "submitted",
      ip_address: geo.ip,
      city: geo.city || null,
      state: geo.state || null,
      country: geo.country || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("job_applications")
      .insert([applicationRecord])
      .select("id")
      .maybeSingle();

    if (error) {
      console.warn("Could not insert into job_applications table (may need migration 009):", error.message);
    }

    // Dispatch Telegram Notification (Both direct chat and Telegram group)
    const candidateName = `${first_name} ${last_name || ""}`.trim();
    const phone = phone_number || "N/A";
    const resumeInfo = resume_filename ? `${resume_filename}` : "Not attached";
    const linkedin = linkedin_url ? `<a href="${escapeHtml(linkedin_url)}">View Profile</a>` : "N/A";
    const portfolio = portfolio_url ? `<a href="${escapeHtml(portfolio_url)}">View Portfolio</a>` : "N/A";
    const noteSnippet = cover_note ? `\n\n📝 <b>Cover Note:</b>\n<i>${escapeHtml(cover_note.substring(0, 250))}${cover_note.length > 250 ? "..." : ""}</i>` : "";

    const messageHtml =
      `📄 <b>New Job Application Received!</b>\n\n` +
      `💼 <b>Position:</b> ${escapeHtml(job_title)}\n` +
      `👤 <b>Candidate:</b> ${escapeHtml(candidateName)}\n` +
      `📧 <b>Email:</b> <code>${escapeHtml(email)}</code>\n` +
      `📞 <b>Phone:</b> <code>${escapeHtml(phone)}</code>\n` +
      `🔗 <b>LinkedIn:</b> ${linkedin}\n` +
      `🌐 <b>Portfolio:</b> ${portfolio}\n` +
      `📎 <b>Resume / CV:</b> <code>${escapeHtml(resumeInfo)}</code>\n` +
      `📍 <b>Location:</b> ${escapeHtml(geo.location)}\n` +
      `🌐 <b>IP Address:</b> <code>${escapeHtml(geo.ip)}</code>` +
      noteSnippet;

    sendTelegramNotification(messageHtml).catch((tgErr) => {
      console.error("Failed to send Telegram notification:", tgErr);
    });

    return NextResponse.json({
      success: true,
      id: data?.id || "temp-" + Date.now(),
      message: "Application submitted successfully",
    });
  } catch (err: any) {
    console.error("Application submission error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to submit application." },
      { status: 500 }
    );
  }
}
