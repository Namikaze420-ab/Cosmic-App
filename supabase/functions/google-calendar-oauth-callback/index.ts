import { createClient } from "npm:@supabase/supabase-js@2.112.4";

function key() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!raw) throw new Error("Missing Supabase secret keys");
  return JSON.parse(raw).default as string;
}

function base64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64url(bytes: Uint8Array) {
  return base64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return base64url(new Uint8Array(digest));
}

function encryptionKeyBytes() {
  const encoded = Deno.env.get("CALENDAR_TOKEN_ENCRYPTION_KEY") ?? "";
  if (!encoded) throw new Error("CALENDAR_TOKEN_ENCRYPTION_KEY is not configured");
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  if (bytes.length !== 32) throw new Error("CALENDAR_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes");
  return bytes;
}

async function encrypt(value: string) {
  const keyObject = await crypto.subtle.importKey("raw", encryptionKeyBytes(), "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, keyObject, new TextEncoder().encode(value));
  return { encrypted_refresh_token: base64(new Uint8Array(ciphertext)), iv: base64(iv) };
}

function redirect(target: URL, param: string, value: string) {
  target.searchParams.set(param, value);
  return Response.redirect(target.toString(), 302);
}

Deno.serve(async (req: Request) => {
  const appReturn = new URL(Deno.env.get("COSMIC_APP_RETURN_URL") ?? "https://project-k90mw-git-staging-minato420ashish-1637s-projects.vercel.app/");
  const clientId = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET");
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const googleError = url.searchParams.get("error");

  if (googleError) return redirect(appReturn, "calendar_error", googleError);
  if (!clientId || !clientSecret || !Deno.env.get("CALENDAR_TOKEN_ENCRYPTION_KEY")) return redirect(appReturn, "calendar_error", "configuration_required");
  if (!code || !state) return redirect(appReturn, "calendar_error", "missing_code_or_state");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(supabaseUrl, key(), { auth: { persistSession: false } });
    const stateHash = await sha256(state);
    const { data: stateRow, error: stateError } = await admin
      .from("calendar_oauth_states")
      .select("id,user_id,expires_at")
      .eq("state_hash", stateHash)
      .maybeSingle();

    if (stateError || !stateRow || new Date(stateRow.expires_at).getTime() < Date.now()) return redirect(appReturn, "calendar_error", "invalid_or_expired_state");

    await admin.from("calendar_oauth_states").delete().eq("id", stateRow.id);

    const redirectUri = `${supabaseUrl}/functions/v1/google-calendar-oauth-callback`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, grant_type: "authorization_code", redirect_uri: redirectUri }),
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) return redirect(appReturn, "calendar_error", "token_exchange_failed");

    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
    const userInfo = userInfoResponse.ok ? await userInfoResponse.json() : {};
    const accountId = userInfo.email || userInfo.sub || null;
    const scopes = String(tokenData.scope || "").split(/\s+/).filter(Boolean);

    const { data: existing } = await admin.from("calendar_oauth_tokens").select("encrypted_refresh_token,iv").eq("user_id", stateRow.user_id).maybeSingle();
    let secureToken = existing;
    if (tokenData.refresh_token) secureToken = await encrypt(tokenData.refresh_token);
    if (!secureToken?.encrypted_refresh_token || !secureToken?.iv) return redirect(appReturn, "calendar_error", "refresh_token_missing");

    const { error: tokenStoreError } = await admin.from("calendar_oauth_tokens").upsert({
      user_id: stateRow.user_id,
      encrypted_refresh_token: secureToken.encrypted_refresh_token,
      iv: secureToken.iv,
      provider_account_id: accountId,
      scopes,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (tokenStoreError) throw tokenStoreError;

    const { error: connectionError } = await admin.from("calendar_connections").upsert({
      user_id: stateRow.user_id,
      provider: "google",
      provider_account_id: accountId,
      sync_enabled: true,
      sync_status: "pending",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,provider" });
    if (connectionError) throw connectionError;

    return redirect(appReturn, "calendar", "connected");
  } catch (error) {
    console.error("google-calendar-oauth-callback", error instanceof Error ? error.message : error);
    return redirect(appReturn, "calendar_error", "callback_failed");
  }
});
