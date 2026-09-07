/**
 * scripts/create-load-test-user.ts
 *
 * Creates a dedicated load-test user in Supabase and prints its JWT access token.
 * Run once locally; NEVER commit the output token.
 *
 * Usage:
 *   npx tsx scripts/create-load-test-user.ts
 *
 * Prerequisites:
 *   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment
 *   (they are read from .env.local automatically via dotenv).
 *
 * After running, copy the printed token and store it as a GitHub Secret named
 * TEST_AUTH_TOKEN (Settings → Secrets and variables → Actions → New repository secret).
 */

import { createClient } from "@supabase/supabase-js";

// Load .env.local automatically when running with tsx
import { config } from "dotenv";
config({ path: ".env.local" });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "❌  SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local",
  );
  process.exit(1);
}

const LOAD_TEST_EMAIL = "test+load@pelonaroupa.app";
// Use a strong fixed password — safe because this account has no production access.
const LOAD_TEST_PASSWORD = "LoadTest#2026!Secure";

async function main() {
  // Admin client — uses SERVICE_ROLE_KEY, bypasses RLS
  const admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Anon client — used to sign in and get the access token
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!anonKey) {
    console.error("❌  SUPABASE_ANON_KEY must be set in .env.local");
    process.exit(1);
  }
  const anon = createClient(SUPABASE_URL!, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Step 1: Create user (idempotent — ignore "already exists" errors)
  console.log(`\n🔧  Creating load-test user: ${LOAD_TEST_EMAIL} …`);
  const { data: createData, error: createError } =
    await admin.auth.admin.createUser({
      email: LOAD_TEST_EMAIL,
      password: LOAD_TEST_PASSWORD,
      email_confirm: true, // skip email verification for test accounts
      user_metadata: {
        role: "load_test",
        created_by: "create-load-test-user.ts",
      },
    });

  if (createError) {
    if (createError.message.includes("already been registered")) {
      console.log("ℹ️   User already exists — skipping creation.");
    } else {
      console.error("❌  Failed to create user:", createError.message);
      process.exit(1);
    }
  } else {
    console.log(`✅  User created: ${createData.user?.id}`);
  }

  // Step 2: Sign in to get JWT access token
  console.log("\n🔑  Signing in to obtain JWT access token …");
  const { data: signInData, error: signInError } =
    await admin.auth.signInWithPassword({
      email: LOAD_TEST_EMAIL,
      password: LOAD_TEST_PASSWORD,
    });

  if (signInError || !signInData?.session) {
    console.error("❌  Sign-in failed:", signInError?.message ?? "no session");
    process.exit(1);
  }

  const { access_token, expires_at } = signInData.session;

  console.log(
    "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );
  console.log(
    "✅  JWT ACCESS TOKEN (copy this to GitHub Secrets → TEST_AUTH_TOKEN):",
  );
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );
  console.log("\n" + access_token + "\n");
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );
  console.log(
    `⏰  Token expires at: ${new Date((expires_at ?? 0) * 1000).toISOString()}`,
  );
  console.log("\n📌  Next steps:");
  console.log("  1. Copy the token above.");
  console.log(
    "  2. Go to GitHub → Settings → Secrets → Actions → New secret.",
  );
  console.log("  3. Name: TEST_AUTH_TOKEN, Value: <paste token>.");
  console.log("  4. Test with:");
  console.log(
    `     curl -i -X POST 'https://firstoff-animalmind-backend.hf.space/v1/classify-breed' \\`,
  );
  console.log(`       -H "Authorization: Bearer <token>" \\`);
  console.log(
    `       -F 'file=@./loadtests/fixtures/test-dog-synthetic.jpg;type=image/jpeg'`,
  );
  console.log("\n⚠️   DO NOT commit this token. It is only valid for ~1 hour.\n");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
