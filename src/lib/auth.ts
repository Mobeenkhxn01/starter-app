import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      // Google sign-in requests Gmail read-only access; other sign-in methods can link it later.
      // "offline" + "consent" makes Google issue a refresh token.
      accessType: "offline",
      prompt: "select_account consent",
    },
  },
  account: {
    // Encrypts access/refresh/id tokens in the `account` table using BETTER_AUTH_SECRET.
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
});
