import { betterAuth } from "better-auth";
import { anonymous } from "better-auth/plugins";
import { db } from "../db";
import { env } from "../env";
import { generateNickname } from "../lib/nickname";

export const auth = betterAuth({
  database: db,
  secret: env.authSecret,
  baseURL: env.baseUrl,
  basePath: "/api/auth",

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },

  user: {
    modelName: "users",
    fields: {
      name: "nickname",
      emailVerified: "email_verified",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    additionalFields: {
      account_type: {
        type: "string",
        defaultValue: "anon",
        input: false,
      },
      token_balance: {
        type: "number",
        defaultValue: 0,
        input: false,
      },
    },
  },

  session: {
    modelName: "sessions",
    fields: {
      userId: "user_id",
      expiresAt: "expires_at",
      ipAddress: "ip_address",
      userAgent: "user_agent",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },

  account: {
    modelName: "accounts",
    fields: {
      userId: "user_id",
      accountId: "account_id",
      providerId: "provider_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
      accessTokenExpiresAt: "access_token_expires_at",
      refreshTokenExpiresAt: "refresh_token_expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },

  verification: {
    modelName: "verifications",
    fields: {
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },

  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: env.isProd,
    },
  },

  plugins: [
    anonymous({
      generateName: () => generateNickname(),
      generateRandomEmail: () => `anon-${crypto.randomUUID().slice(0, 12)}@local.wordchain`,
      schema: {
        user: {
          fields: {
            isAnonymous: "is_anonymous",
          },
        },
      },
    }),
  ],
});
