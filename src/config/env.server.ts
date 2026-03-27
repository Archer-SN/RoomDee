import { z } from "zod";

const serverEnvSchema = z.object({
  // --- Required: app won't start without these ---
  DATABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  CRON_SECRET: z.string().min(1),

  // --- Optional in development: only needed when using the feature ---
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
  OPN_SECRET_KEY: z.string().min(1).optional(),
  OPN_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
});

export const serverEnv = serverEnvSchema.parse(process.env);
