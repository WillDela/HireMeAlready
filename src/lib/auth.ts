import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  // Settings > Your data > Delete account. No verification email configured, so this
  // deletes immediately (still gated by session freshness) — see /api/account.
  user: {
    deleteUser: {
      enabled: true,
    },
  },
  // Redirect URI to register in Google Cloud: <BETTER_AUTH_URL>/api/auth/callback/google.
  // Google verifies emails, so a Google sign-in links to an existing email/password
  // account with the same address instead of creating a second user.
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      prompt: "select_account",
    },
  },
  // Keep last so Server Actions that call auth.api.* can set cookies.
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
