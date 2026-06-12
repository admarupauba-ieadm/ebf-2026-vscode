import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@ebf2026.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY.");
  process.exit(1);
}

if (!ADMIN_PASSWORD) {
  console.error("Missing ADMIN_PASSWORD. Set it in .env or environment.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function normalizeBoolean(value) {
  return value === true;
}

async function run() {
  const results = [];

  const login = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  results.push({
    check: "admin_login",
    ok: !login.error && !!login.data.session,
    detail: login.error ? login.error.message : "ok",
  });

  const userId = login.data.user?.id;

  const roleCheck = userId
    ? await supabase.rpc("has_role", { _user_id: userId, _role: "admin" })
    : { data: false, error: { message: "no user id" } };
  results.push({
    check: "admin_role_has_role_rpc",
    ok: normalizeBoolean(roleCheck.data) && !roleCheck.error,
    detail: roleCheck.error ? roleCheck.error.message : `has_role=${String(roleCheck.data)}`,
  });

  const staffCheck = userId
    ? await supabase.rpc("is_staff", { _user_id: userId })
    : { data: false, error: { message: "no user id" } };
  results.push({
    check: "admin_role_is_staff_rpc",
    ok: normalizeBoolean(staffCheck.data) && !staffCheck.error,
    detail: staffCheck.error ? staffCheck.error.message : `is_staff=${String(staffCheck.data)}`,
  });

  const consulta = await supabase.rpc("consultar_inscricao", { termo: "00000000000" });
  results.push({
    check: "rpc_consultar_inscricao_callable",
    ok: !consulta.error,
    detail: consulta.error ? consulta.error.message : `rows=${(consulta.data || []).length}`,
  });

  const list = await supabase
    .from("inscricoes")
    .select("id, protocolo, status")
    .order("data_inscricao", { ascending: false })
    .limit(3);
  results.push({
    check: "admin_query_inscricoes",
    ok: !list.error,
    detail: list.error ? list.error.message : `rows=${(list.data || []).length}`,
  });

  const sessionBeforeLogout = await supabase.auth.getSession();
  results.push({
    check: "session_persisted_after_login",
    ok: !!sessionBeforeLogout.data.session,
    detail: sessionBeforeLogout.data.session ? "ok" : "missing session",
  });

  const logout = await supabase.auth.signOut();
  const sessionAfterLogout = await supabase.auth.getSession();
  results.push({
    check: "admin_logout",
    ok: !logout.error && !sessionAfterLogout.data.session,
    detail: logout.error ? logout.error.message : "ok",
  });

  const failed = results.filter((r) => !r.ok).length;
  console.log(
    JSON.stringify(
      {
        environment: "homologation",
        admin_email: ADMIN_EMAIL,
        checks: results,
        total: results.length,
        passed: results.length - failed,
        failed,
      },
      null,
      2,
    ),
  );

  if (failed > 0) process.exit(1);
}

run().catch((error) => {
  console.error("homologation-check failed:", error.message || error);
  process.exit(1);
});
