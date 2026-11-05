import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Extract IP from various proxy headers
    let ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-client-ip") ||
      "";

    // 2. Extract Vercel Edge geolocation headers if present
    let city = req.headers.get("x-vercel-ip-city") || "";
    let state = req.headers.get("x-vercel-ip-country-region") || "";
    let country = req.headers.get("x-vercel-ip-country") || "";
    let timezone = req.headers.get("x-vercel-ip-timezone") || "";
    let latitude = req.headers.get("x-vercel-ip-latitude") || "";
    let longitude = req.headers.get("x-vercel-ip-longitude") || "";

    // 3. Fallback for local development or non-Vercel proxy environments
    const isLocalOrMissing = !ip || ip === "::1" || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.");

    if (isLocalOrMissing || !city || !country || !latitude || !longitude) {
      try {
        // Query lightweight IP & location lookup
        const lookupUrl = !isLocalOrMissing && ip ? `https://ipapi.co/${ip}/json/` : "https://ipapi.co/json/";
        const geoRes = await fetch(lookupUrl, {
          headers: { "User-Agent": "recruitment-app/1.0" },
          cache: "no-store",
        });

        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData && !geoData.error) {
            ip = geoData.ip || ip;
            city = geoData.city || city;
            state = geoData.region || geoData.region_code || state;
            country = geoData.country_name || geoData.country || country;
            timezone = geoData.timezone || timezone;
            if (geoData.latitude !== undefined && geoData.latitude !== null && !latitude) {
              latitude = String(geoData.latitude);
            }
            if (geoData.longitude !== undefined && geoData.longitude !== null && !longitude) {
              longitude = String(geoData.longitude);
            }
          }
        }
      } catch (e) {
        // Silent fallback
      }
    }

    // Secondary fallback to ipwho.is if still missing
    if (!city || city === "Unknown City" || !latitude || !longitude) {
      try {
        const altLookupUrl = !isLocalOrMissing && ip ? `https://ipwho.is/${ip}` : "https://ipwho.is/";
        const altRes = await fetch(altLookupUrl, { cache: "no-store" });
        if (altRes.ok) {
          const altData = await altRes.json();
          if (altData && altData.success !== false) {
            ip = altData.ip || ip;
            city = altData.city || city;
            state = altData.region || altData.region_code || state;
            country = altData.country || altData.country_code || country;
            timezone = altData.timezone?.id || timezone;
            if (altData.latitude !== undefined && altData.latitude !== null && !latitude) {
              latitude = String(altData.latitude);
            }
            if (altData.longitude !== undefined && altData.longitude !== null && !longitude) {
              longitude = String(altData.longitude);
            }
          }
        }
      } catch (e) {}
    }

    return NextResponse.json({
      ip: ip || "Unknown IP",
      city: city ? decodeURIComponent(city) : "Unknown City",
      state: state ? decodeURIComponent(state) : "",
      country: country ? decodeURIComponent(country) : "US",
      timezone: timezone || "America/New_York",
      latitude: latitude ? String(latitude) : "",
      longitude: longitude ? String(longitude) : "",
    });
  } catch (err: any) {
    return NextResponse.json({
      ip: "Unknown IP",
      city: "Unknown City",
      state: "",
      country: "US",
      timezone: "America/New_York",
      latitude: "",
      longitude: "",
    });
  }
}
