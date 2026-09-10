import { createClient } from "npm:@supabase/supabase-js@2.112.4";

function cors(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = origin.endsWith(".vercel.app") || origin === "http://127.0.0.1:4173" || origin === "http://localhost:4173";
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "https://project-k90mw-git-staging-minato420ashish-1637s-projects.vercel.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function reply(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
}

function supabaseKey(name: "publishable" | "secret") {
  const raw = Deno.env.get(name === "publishable" ? "SUPABASE_PUBLISHABLE_KEYS" : "SUPABASE_SECRET_KEYS");
  if (!raw) throw new Error(`Missing Supabase ${name} keys`);
  return JSON.parse(raw).default as string;
}

function fromBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function encryptionKeyBytes() {
  const encoded = Deno.env.get("CALENDAR_TOKEN_ENCRYPTION_KEY") ?? "";
  if (!encoded) throw new Error("CALENDAR_TOKEN_ENCRYPTION_KEY is not configured");
  const bytes = fromBase64(encoded);
  if (bytes.length !== 32) throw new Error("CALENDAR_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes");
  return bytes;
}

async function decrypt(ciphertext: string, iv: string) {
  const keyObject = await crypto.subtle.importKey("raw", encryptionKeyBytes(), "AES-GCM", false, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(iv) }, keyObject, fromBase64(ciphertext));
  return new TextDecoder().decode(plaintext);
}

function timeZoneParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute"), second: value("second") };
}

function localDateNoonToUtc(dateString: string, timeZone: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day, 12, 0, 0);
  let guess = target;
  for (let i = 0; i < 4; i += 1) {
    const p = timeZoneParts(new Date(guess), timeZone);
    const rendered = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    const correction = target - rendered;
    guess += correction;
    if (Math.abs(correction) < 1000) break;
  }
  return new Date(guess).toISOString();
}

function reminderMinutes(event: any) {
  const overrides = event?.reminders?.overrides;
  if (!Array.isArray(overrides)) return [15];
  const values = overrides
    .filter((item: any) => item?.method === "popup" && Number.isFinite(Number(item?.minutes)))
    .map((item: any) => Number(item.minutes))
    .filter((value: number) => value >= 0 && value <= 10080);
  return values.length ? [...new Set(values)] : [15];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return reply(req, { error: "Method not allowed" }, 405);

  const clientId = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET");
  if (!clientId || !clientSecret || !Deno.env.get("CALENDAR_TOKEN_ENCRYPTION_KEY")) {
    return reply(req, { error: "Google Calendar OAuth is not configured yet.", configuration_required: true }, 503);
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return reply(req, { error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, supabaseKey("publishable"), { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user) return reply(req, { error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, supabaseKey("secret"), { auth: { persistSession: false } });
    const [{ data: tokenRow, error: tokenError }, { data: profile }] = await Promise.all([
      admin.from("calendar_oauth_tokens").select("encrypted_refresh_token,iv").eq("user_id", userData.user.id).maybeSingle(),
      admin.from("profiles").select("timezone").eq("id", userData.user.id).maybeSingle(),
    ]);
    if (tokenError || !tokenRow) return reply(req, { error: "Google Calendar is not connected." }, 409);

    const refreshToken = await decrypt(tokenRow.encrypted_refresh_token, tokenRow.iv);
    const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
    });
    const refreshData = await refreshResponse.json();
    if (!refreshResponse.ok || !refreshData.access_token) {
      await admin.from("calendar_connections").update({ sync_status: "error", updated_at: new Date().toISOString() }).eq("user_id", userData.user.id).eq("provider", "google");
      return reply(req, { error: "Could not refresh Google Calendar access." }, 502);
    }

    const requested = await req.json().catch(() => ({}));
    const days = Math.max(1, Math.min(Number(requested?.days) || 30, 90));
    const timeMin = new Date();
    timeMin.setMinutes(0, 0, 0);
    const timeMax = new Date(timeMin.getTime() + days * 86_400_000);

    const eventsUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    eventsUrl.searchParams.set("timeMin", timeMin.toISOString());
    eventsUrl.searchParams.set("timeMax", timeMax.toISOString());
    eventsUrl.searchParams.set("singleEvents", "true");
    eventsUrl.searchParams.set("orderBy", "startTime");
    eventsUrl.searchParams.set("maxResults", "250");

    const eventsResponse = await fetch(eventsUrl, { headers: { Authorization: `Bearer ${refreshData.access_token}` } });
    const eventsData = await eventsResponse.json();
    if (!eventsResponse.ok) {
      await admin.from("calendar_connections").update({ sync_status: "error", updated_at: new Date().toISOString() }).eq("user_id", userData.user.id).eq("provider", "google");
      return reply(req, { error: "Google Calendar event fetch failed." }, 502);
    }

    const timezone = profile?.timezone || "UTC";
    const rows = (eventsData.items || [])
      .filter((event: any) => event?.id && event?.status !== "cancelled" && (event?.start?.dateTime || event?.start?.date))
      .map((event: any) => {
        const allDay = Boolean(event.start?.date && !event.start?.dateTime);
        const startsAt = allDay ? localDateNoonToUtc(event.start.date, timezone) : new Date(event.start.dateTime).toISOString();
        const endsAt = event.end?.dateTime ? new Date(event.end.dateTime).toISOString() : event.end?.date ? localDateNoonToUtc(event.end.date, timezone) : null;
        return {
          user_id: userData.user.id,
          title: String(event.summary || "Untitled Google Calendar event").slice(0, 180),
          description: event.description ? String(event.description) : null,
          starts_at: startsAt,
          ends_at: endsAt,
          all_day: allDay,
          status: "planned",
          priority: "medium",
          category: "personal",
          source: "google_calendar",
          external_calendar_id: "primary",
          external_event_id: String(event.id),
          reminder_minutes: reminderMinutes(event),
          notes: event.location ? `Location: ${String(event.location)}` : null,
        };
      });

    if (rows.length) {
      const { error: upsertError } = await admin.from("planner_items").upsert(rows, { onConflict: "user_id,external_event_id" });
      if (upsertError) throw upsertError;
    }

    const syncedAt = new Date().toISOString();
    await admin.from("calendar_connections").update({ sync_status: "healthy", last_synced_at: syncedAt, updated_at: syncedAt }).eq("user_id", userData.user.id).eq("provider", "google");

    return reply(req, { synced: rows.length, window_days: days, last_synced_at: syncedAt, access: "read_only" });
  } catch (error) {
    console.error("google-calendar-sync", error instanceof Error ? error.message : error);
    return reply(req, { error: "Google Calendar sync failed." }, 500);
  }
});
