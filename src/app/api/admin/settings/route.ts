import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createDirectClient } from "@supabase/supabase-js";

function formatNameFromEmail(email?: string | null): string {
  if (!email) return "Recruiting Team";
  const prefix = email.split("@")[0] || "";
  return prefix
    .replace(/[._\-+]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function getSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    return createDirectClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vqtfcdudbrnfukwsglpq.supabase.co",
      serviceKey
    );
  }
  return createServerClient();
}

// GET /api/admin/settings?userId=...&userEmail=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const userEmail = searchParams.get("userEmail");

    if (!userId && !userEmail) {
      return NextResponse.json({ error: "Missing userId or userEmail parameter" }, { status: 400 });
    }

    const supabase = getSupabase();

    // 1. Try to find settings by user_id
    let matchedSettings = null;
    if (userId) {
      const { data: byUser } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (byUser) matchedSettings = byUser;
    }

    // 2. Try to find settings by admin_email
    if (!matchedSettings && userEmail) {
      const { data: byEmail } = await supabase
        .from("settings")
        .select("*")
        .eq("admin_email", userEmail)
        .maybeSingle();
      if (byEmail) matchedSettings = byEmail;
    }

    // 3. If settings found, return them
    if (matchedSettings) {
      return NextResponse.json({
        settings: {
          ...matchedSettings,
          interviewer_name: matchedSettings.interviewer_name || formatNameFromEmail(userEmail),
        },
      });
    }

    // 4. If no settings exist yet for this admin, fetch default row (id = 1) for schedule template
    const { data: defaultRow } = await supabase
      .from("settings")
      .select("*")
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    const template = {
      user_id: userId,
      admin_email: userEmail,
      working_days: defaultRow?.working_days || [1, 2, 3, 4, 5],
      day_start_time: defaultRow?.day_start_time || "09:00:00",
      day_end_time: defaultRow?.day_end_time || "17:00:00",
      slot_duration_mins: defaultRow?.slot_duration_mins || 30,
      timezone: defaultRow?.timezone || "America/New_York",
      interviewer_name: formatNameFromEmail(userEmail),
      interviewer_photo_url: null,
      meeting_type: defaultRow?.meeting_type || "Phone Call",
    };

    return NextResponse.json({ settings: template });
  } catch (err: any) {
    console.error("GET /api/admin/settings error:", err);
    return NextResponse.json({ error: err.message || "Failed to load settings" }, { status: 500 });
  }
}

// POST /api/admin/settings
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, userEmail, settings } = body;

    if (!userId && !userEmail) {
      return NextResponse.json({ error: "Missing userId or userEmail" }, { status: 400 });
    }

    const supabase = getSupabase();

    const payload = {
      user_id: userId || null,
      admin_email: userEmail || null,
      working_days: settings.working_days || [1, 2, 3, 4, 5],
      day_start_time: settings.day_start_time || "09:00:00",
      day_end_time: settings.day_end_time || "17:00:00",
      slot_duration_mins: settings.slot_duration_mins || 30,
      timezone: settings.timezone || "America/New_York",
      interviewer_name: settings.interviewer_name?.trim() || formatNameFromEmail(userEmail),
      interviewer_photo_url: settings.interviewer_photo_url || null,
      meeting_type: settings.meeting_type || "Phone Call",
    };

    // 1. Check if user already has a settings row by user_id
    let existingId: number | null = null;
    if (userId) {
      const { data: row } = await supabase
        .from("settings")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (row?.id) existingId = row.id;
    }

    // 2. Check by admin_email if not found by user_id
    if (!existingId && userEmail) {
      const { data: row } = await supabase
        .from("settings")
        .select("id")
        .eq("admin_email", userEmail)
        .maybeSingle();
      if (row?.id) existingId = row.id;
    }

    let savedRow = null;

    if (existingId) {
      // Update existing admin settings row
      const { data, error } = await supabase
        .from("settings")
        .update(payload)
        .eq("id", existingId)
        .select("*")
        .single();

      if (error) throw error;
      savedRow = data;
    } else {
      // Check if row id = 1 is unassigned and can be claimed
      const { data: row1 } = await supabase
        .from("settings")
        .select("id, user_id, admin_email")
        .eq("id", 1)
        .maybeSingle();

      if (row1 && (!row1.user_id || row1.user_id === userId || !row1.admin_email || row1.admin_email === userEmail)) {
        const { data, error } = await supabase
          .from("settings")
          .update(payload)
          .eq("id", 1)
          .select("*")
          .single();

        if (!error && data) {
          savedRow = data;
        }
      }

      if (!savedRow) {
        // Find max id to safely insert new row even without DB sequence
        const { data: allRows } = await supabase
          .from("settings")
          .select("id")
          .order("id", { ascending: false })
          .limit(1);

        const maxId = allRows && allRows.length > 0 ? allRows[0].id : 1;
        const newId = maxId + 1;

        // Try inserting with explicit newId first
        const { data: inserted, error: insertErr } = await supabase
          .from("settings")
          .insert({ id: newId, ...payload })
          .select("*")
          .single();

        if (insertErr) {
          // Fallback: try inserting without explicit id (if sequence is enabled)
          const { data: autoInserted, error: autoErr } = await supabase
            .from("settings")
            .insert(payload)
            .select("*")
            .single();

          if (autoErr) {
            // Final fallback: update row 1 if single-row constraint is active
            const { data: fallbackRow, error: fallbackErr } = await supabase
              .from("settings")
              .update(payload)
              .eq("id", 1)
              .select("*")
              .single();

            if (fallbackErr) throw autoErr;
            savedRow = fallbackRow;
          } else {
            savedRow = autoInserted;
          }
        } else {
          savedRow = inserted;
        }
      }
    }

    return NextResponse.json({ success: true, settings: savedRow || payload });
  } catch (err: any) {
    console.error("POST /api/admin/settings error:", err);
    return NextResponse.json({ error: err.message || "Failed to save settings" }, { status: 500 });
  }
}
