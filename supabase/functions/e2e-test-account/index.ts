import { createClient } from "npm:@supabase/supabase-js@2.112.4";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.9.6";

const ISSUER = "https://token.actions.githubusercontent.com";
const AUDIENCE = "cosmic-staging-e2e";
const REPOSITORY = "Namikaze420-ab/Cosmic-App";
const REPOSITORY_ID = "1349255125";
const OWNER_ID = "119625895";
const PALM_BUCKET = "palm-uploads";
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

function looksLikeUserFolder(name: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(name);
}

async function removePalmFolder(admin: any, userId: string) {
  const bucket = admin.storage.from(PALM_BUCKET);
  const { data: files, error: listError } = await bucket.list(userId, { limit: 1000 });
  if (listError) throw new Error(`Could not list E2E palm objects: ${listError.message}`);
  const paths = (files || []).filter((entry: any) => entry?.name && entry?.id).map((entry: any) => `${userId}/${entry.name}`);
  if (!paths.length) return 0;
  const { error: removeError } = await bucket.remove(paths);
  if (removeError) throw new Error(`Could not remove E2E palm objects: ${removeError.message}`);
  return paths.length;
}

async function sweepOrphanPalmFolders(admin: any) {
  const bucket = admin.storage.from(PALM_BUCKET);
  const { data: roots, error: rootError } = await bucket.list('', { limit: 1000 });
  if (rootError) throw new Error(`Could not list palm root: ${rootError.message}`);

  let removedFolders = 0;
  let removedObjects = 0;
  for (const entry of roots || []) {
    const folder = String(entry?.name || '');
    // Our storage contract is exactly <auth-user-uuid>/<image>. Ignore anything
    // outside that contract rather than treating an unfamiliar entry as disposable.
    if (!looksLikeUserFolder(folder) || entry?.id) continue;

    const { data, error } = await admin.auth.admin.getUserById(folder);
    if (data?.user) continue;
    const status = Number((error as any)?.status || 0);
    if (status && status !== 404) {
      console.warn('Skipping orphan sweep after non-404 auth lookup error', folder, status);
      continue;
    }

    const count = await removePalmFolder(admin, folder);
    if (count) {
      removedFolders += 1;
      removedObjects += count;
    }
  }
  return { removed_folders: removedFolders, removed_objects: removedObjects };
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

  if (body.action === "sweep_orphans") {
    try {
      return json({ ok: true, ...(await sweepOrphanPalmFolders(admin)) });
    } catch (error) {
      console.error('E2E palm orphan sweep failed', error instanceof Error ? error.message : error);
      return json({ error: 'Could not sweep orphaned E2E palm storage safely.' }, 500);
    }
  }

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

    try {
      // Storage is not covered by auth.users ON DELETE CASCADE. Remove the entire
      // E2E user's private palm folder first and abort deletion if that cannot be done.
      const removedPalmObjects = await removePalmFolder(admin, userId);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return json({ error: "Could not delete disposable test account" }, 500);
      return json({ ok: true, deleted: userId, removed_palm_objects: removedPalmObjects });
    } catch (error) {
      console.error('E2E storage-first deletion failed', error instanceof Error ? error.message : error);
      return json({ error: 'Disposable account cleanup stopped before auth deletion because private storage cleanup failed.' }, 500);
    }
  }

  return json({ error: "Unsupported action" }, 400);
});
