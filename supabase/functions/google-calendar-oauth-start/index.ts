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

function key(name: "publishable" | "secret") {
  const raw = Deno.env.get(name === "publishable" ? "SUPABASE_PUBLISHABLE_KEYS" : "SUPABASE_SECRET_KEYS");
  if (!raw) throw new Error(`Missing Supabase ${name} keys`);
  return JSON.parse(raw).default as string;
}

function base64url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return base64url(new Uint8Array(digest));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return reply(req, { error: "Method not allowed" }, 405);

  const clientId = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID");
  if (!clientId) {
    return reply(req, {
      error: "Google Calendar OAuth is not configured yet.",
      configuration_required: true,
      missing: ["GOOGLE_CALENDAR_CLIENT_ID", "GOOGLE_CALENDAR_CLIENT_SECRET", "CALENDAR_TOKEN_ENCRYPTION_KEY"],
    }, 503);
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return reply(req, { error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, key("publishable"), { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user) return reply(req, { error: "Unauthorized" }, 401);

    const admin = createClient(url, key("secret"), { auth: { persistSession: false } });
    const state = base64url(crypto.getRandomValues(new Uint8Array(32)));
    const stateHash = await sha256(state);
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();

    await admin.from("calendar_oauth_states").delete().lt("expires_at", new Date().toISOString());
    const { error: stateError } = await admin.from("calendar_oauth_states").insert({
      state_hash: stateHash,
      user_id: userData.user.id,
      expires_at: expiresAt,
    });
    if (stateError) throw stateError;

    const redirectUri = `${url}/functions/v1/google-calendar-oauth-callback`;
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", ["openid", "email", "https://www.googleapis.com/auth/calendar.readonly"].join(" "));
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("include_granted_scopes", "true");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);

    return reply(req, { authorization_url: authUrl.toString(), expires_at: expiresAt });
  } catch (error) {
    console.error("google-calendar-oauth-start", error instanceof Error ? error.message : error);
    return reply(req, { error: "Could not start Google Calendar connection." }, 500);
  }
});
