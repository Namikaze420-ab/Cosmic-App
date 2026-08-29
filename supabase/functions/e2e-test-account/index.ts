import { createClient } from "npm:@supabase/supabase-js@2.112.4";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.9.6";

const ISSUER = "https://token.actions.githubusercontent.com";
const AUDIENCE = "cosmic-staging-e2e";
const REPOSITORY = "Namikaze420-ab/Cosmic-App";
const REPOSITORY_ID = "1349255125";
const OWNER_ID = "119625895";
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`));

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function serviceRoleKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!raw) throw new Error("Server service credential unavailable");
  return JSON.parse(raw).default as string;
}

async function verifiedWorkflow(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) throw new Error("Missing GitHub OIDC token");
  const token = auth.slice(7);
  const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER, audience: AUDIENCE });
  const allowed =
    payload.repository === REPOSITORY &&
    String(payload.repository_id || "") === REPOSITORY_ID &&
    String(payload.repository_owner_id || "") === OWNER_ID &&
    payload.event_name === "pull_request" &&
    payload.head_ref === "staging" &&
    payload.base_ref === "main" &&
    payload.workflow === "Staging Browser QA" &&
    payload.actor_id === OWNER_ID;
  if (!allowed) throw new Error("Workflow claims are not authorized for staging E2E");
  return payload;
}

function randomPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const token = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  return `Aa9!${token}`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let claims: any;
  try { claims = await verifiedWorkflow(req); }
  catch (error) {
    console.warn("e2e-test-account auth rejected", error instanceof Error ? error.message : error);
    return json({ error: "Unauthorized workflow" }, 401);
  }

  let body: any = {};
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) return json({ error: "Server configuration unavailable" }, 500);
  const admin = createClient(url, serviceRoleKey(), { auth: { persistSession: false, autoRefreshToken: false } });
  const runId = String(claims.run_id || "unknown");

  if (body.action === "create") {
    const password = randomPassword();
    const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 16);
    const email = `cosmic-e2e-${runId}-${suffix}@example.invalid`;
    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      app_metadata: { cosmic_e2e: true, github_run_id: runId },
      user_metadata: { display_name: "Cosmic E2E" },
    });
    if (error || !data.user) {
      console.error("e2e user creation failed", error?.message || "unknown");
      return json({ error: "Could not create disposable test account" }, 500);
    }
    return json({ user_id: data.user.id, email, password, run_id: runId });
  }

  if (body.action === "delete") {
    const userId = typeof body.user_id === "string" ? body.user_id : "";
    if (!userId) return json({ error: "user_id required" }, 400);
    const { data, error: lookupError } = await admin.auth.admin.getUserById(userId);
    if (lookupError || !data.user) return json({ ok: true, already_deleted: true });
    const meta = data.user.app_metadata || {};
    if (meta.cosmic_e2e !== true || String(meta.github_run_id || "") !== runId) {
      return json({ error: "Refusing to delete a non-E2E or different-run account" }, 403);
    }
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return json({ error: "Could not delete disposable test account" }, 500);
    return json({ ok: true, deleted: userId });
  }

  return json({ error: "Unsupported action" }, 400);
});
