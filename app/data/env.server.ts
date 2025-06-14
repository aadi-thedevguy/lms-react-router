import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string(),
  SESSION_SECRET: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1),
  TEST_IP_ADDRESS: z.string().min(1).optional(),
  PPP_50_COUPON_ID: z.string().min(1),
  PPP_40_COUPON_ID: z.string().min(1),
  PPP_30_COUPON_ID: z.string().min(1),
  PPP_20_COUPON_ID: z.string().min(1),
  PAYMENT_SECRET_KEY: z.string().min(1),
  PAYMENT_WEBHOOK_SECRET: z.string().min(1),
  CLERK_SIGN_IN_URL: z.string().min(1),
  CLERK_SIGN_UP_URL: z.string().min(1),
  CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: z.string().min(1),
  CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: z.string().min(1),
  SERVER_URL: z.string().min(1),
  ARCJET_KEY: z.string().min(1),
  NODE_ENV: z.string().min(1),
  // Client Side
  VITE_CLERK_PUBLISHABLE_KEY: z.string().min(1),
});

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof schema> {}
  }
}

export function init() {
  const parsed = schema.safeParse(process.env);

  if (parsed.success === false) {
    console.error(
      "❌ Invalid environment variables:",
      parsed.error.flatten().fieldErrors
    );

    throw new Error("Invalid environment variables");
  }
}

/**
 * This is used in both `entry.server.ts` and `root.tsx` to ensure that
 * the environment variables are set and globally available before the app is
 * started.
 *
 * NOTE: Do *not* add any environment variables in here that you do not wish to
 * be included in the client.
 * @returns all public ENV variables
 */
export function getEnv() {
  return {
    VITE_CLERK_PUBLISHABLE_KEY: process.env.VITE_CLERK_PUBLISHABLE_KEY,
    // CLERK_SIGN_IN_URL: process.env.CLERK_SIGN_IN_URL,
    // CLERK_SIGN_UP_URL: process.env.CLERK_SIGN_UP_URL,
    // SERVER_URL: process.env.SERVER_URL,
  };
}

type ENV = ReturnType<typeof getEnv>;

declare global {
  var ENV: ENV;
  interface Window {
    ENV: ENV;
  }
}
