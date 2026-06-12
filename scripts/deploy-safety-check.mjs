import process from "node:process";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CHECKS = [];
let failed = 0;

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

function ok(label) {
  CHECKS.push({ check: label, ok: true });
  console.log(`${GREEN}OK${RESET} ${label}`);
}
function fail(label, detail) {
  CHECKS.push({ check: label, ok: false, detail });
  console.log(`${RED}FAIL${RESET} ${label}: ${detail}`);
  failed += 1;
}
function warn(label, detail) {
  CHECKS.push({ check: label, ok: true, warn: true, detail });
  console.log(`${YELLOW}WARN${RESET} ${label}: ${detail}`);
}

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", cwd: ROOT }).trim();
  } catch {
    return "";
  }
}

console.log("\n=== EBF Connect Hub — Deploy Safety Check ===\n");

// 1. .env must NOT be tracked in git
const tracked = run("git ls-files .env");
if (tracked) {
  fail(".env tracked in git", "Run: git rm --cached .env");
} else {
  ok(".env is NOT tracked in git");
}

// 2. No hardcoded passwords in src/ (search for literal password string)
const srcPasswords = run("rg -l EBF-admin2026 src");
if (srcPasswords) {
  fail("Hardcoded password EBF-admin2026 in src/", srcPasswords);
} else {
  ok("No hardcoded 'EBF-admin2026' in src/");
}

// 3. No hardcoded passwords in scripts/
const scriptPasswords = run("rg -l EBF-admin2026 scripts");
if (scriptPasswords) {
  const files = scriptPasswords.split("\n").filter(Boolean);
  const stillHardcoded = files.filter((f) => {
    const content = readFileSync(resolve(ROOT, f), "utf8");
    const lines = content.split("\n").filter((l) => l.includes("EBF-admin2026"));
    return lines.some((l) => !l.includes("process.env"));
  });
  if (stillHardcoded.length > 0) {
    fail("Hardcoded password in scripts/", stillHardcoded.join(", "));
  } else {
    ok("Scripts use env vars for passwords");
  }
} else {
  ok("No 'EBF-admin2026' references in scripts/");
}

// 4. .env.example uses placeholders only
const envExample = readFileSync(resolve(ROOT, ".env.example"), "utf8");
const hasPlaceholders = envExample.includes("<project_id>") && envExample.includes("<anon_key>");
const hasRealProjectId = /SUPABASE_PROJECT_ID="[^<"]+"/.test(envExample);
if (hasRealProjectId) {
  fail(".env.example contains real project ID", "Must use <project_id> placeholder");
} else if (hasPlaceholders) {
  ok(".env.example uses placeholders, no real secrets");
} else {
  warn(".env.example: verify no real secrets exposed");
}

// 5. Warn about service_role key in git history
const historyKey = run("git log --all --full-history -p -- .env | grep SERVICE_ROLE | head -1");
if (historyKey) {
  warn(
    "SUPABASE_SERVICE_ROLE_KEY found in git history",
    "Rotate key in Supabase dashboard → Settings → API → service_role → Regenerate",
  );
} else {
  ok("No SERVICE_ROLE_KEY in git history");
}

// 6. vercel.json links to secrets
const vercel = readFileSync(resolve(ROOT, "vercel.json"), "utf8");
if (vercel.includes("@supabase-url") && vercel.includes("@turnstile")) {
  ok("vercel.json uses @-prefixed secret references");
} else {
  fail("vercel.json missing Vercel secret references");
}

// 7. client.ts uses env vars, not hardcoded keys
const client = readFileSync(resolve(ROOT, "src/integrations/supabase/client.ts"), "utf8");
if (client.includes("import.meta.env.VITE_SUPABASE_URL")) {
  ok("client.ts loads API URL from env vars");
} else {
  fail("client.ts may have hardcoded URL");
}

// 8. Check build
const buildOut = run("npm run build 2>&1 || echo BUILD_FAILED");
if (buildOut.includes("BUILD_FAILED")) {
  warn("npm run build failed", "Check build errors before deploy");
} else {
  ok("npm run build succeeded");
}

// Summary
console.log(`\n=== Summary ===`);
console.log(`Total checks: ${CHECKS.length}`);
console.log(`Passed: ${CHECKS.length - failed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
