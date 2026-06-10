import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const ADMIN_EMAIL = "admin@ebf2026.local";
const ADMIN_PASSWORD = "EBF-admin2026";
const ADMIN_DISPLAY_NAME = "EBF-admin2026";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserByEmail(email) {
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users || [];
    const found = users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (users.length < perPage) return null;
    page += 1;
  }
}

async function ensureDefaultAdmin() {
  const existing = await findUserByEmail(ADMIN_EMAIL);

  let userId;
  if (!existing) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { nome: ADMIN_DISPLAY_NAME, usuario: ADMIN_DISPLAY_NAME },
      app_metadata: { role: "admin" },
    });
    if (error || !data.user) throw error || new Error("Unable to create admin user.");
    userId = data.user.id;
    console.log(`Admin user created: ${ADMIN_EMAIL}`);
  } else {
    userId = existing.id;
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        ...(existing.user_metadata || {}),
        nome: ADMIN_DISPLAY_NAME,
        usuario: ADMIN_DISPLAY_NAME,
      },
      app_metadata: { ...(existing.app_metadata || {}), role: "admin" },
    });
    if (error) throw error;
    console.log(`Admin user updated: ${ADMIN_EMAIL}`);
  }

  const { error: roleError } = await supabase.from("user_roles").upsert(
    {
      user_id: userId,
      role: "admin",
    },
    { onConflict: "user_id,role" },
  );
  if (roleError) throw roleError;
  console.log("Admin role ensured in public.user_roles.");
}

ensureDefaultAdmin()
  .then(() => {
    console.log("Default admin ready.");
  })
  .catch((error) => {
    console.error("Failed to seed default admin:", error.message || error);
    process.exit(1);
  });
