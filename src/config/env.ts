import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().trim().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().trim().min(32, 'JWT_SECRET must be at least 32 characters'),
  COOKIE_SECRET: z.string().trim().min(16, 'COOKIE_SECRET must be at least 16 characters'),
  FRONTEND_URL: z.string().trim().min(1, 'FRONTEND_URL is required'),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().min(5).max(1440).default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  SEED_USER_NAME: z.string().trim().min(1, 'SEED_USER_NAME is required'),
  SEED_USER_EMAIL: z.string().email('SEED_USER_EMAIL must be a valid email'),
  SEED_USER_PASSWORD: z.string().min(12, 'SEED_USER_PASSWORD must be at least 12 characters'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const fieldErrors = parsedEnv.error.flatten().fieldErrors;
  console.error('Invalid backend environment variables:');
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages) {
      console.error(`  - ${field}: ${messages.join(', ')}`);
    }
  }
  process.exit(1);
}

const baseEnv = parsedEnv.data;

export const env = {
  ...baseEnv,
  IS_PRODUCTION: baseEnv.NODE_ENV === 'production',
  FRONTEND_ORIGINS: baseEnv.FRONTEND_URL.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
} as const;
