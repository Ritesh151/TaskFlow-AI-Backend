"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = require("dotenv");
const zod_1 = require("zod");
(0, dotenv_1.config)();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    PORT: zod_1.z.coerce.number().int().min(1).max(65535).default(4000),
    DATABASE_URL: zod_1.z.string().trim().min(1),
    JWT_SECRET: zod_1.z.string().trim().min(32),
    COOKIE_SECRET: zod_1.z.string().trim().min(16),
    FRONTEND_URL: zod_1.z.string().trim().min(1),
    ACCESS_TOKEN_TTL_MINUTES: zod_1.z.coerce.number().int().min(5).max(1440).default(15),
    REFRESH_TOKEN_TTL_DAYS: zod_1.z.coerce.number().int().min(1).max(30).default(7),
    BCRYPT_SALT_ROUNDS: zod_1.z.coerce.number().int().min(10).max(15).default(12),
    SEED_USER_NAME: zod_1.z.string().trim().min(1),
    SEED_USER_EMAIL: zod_1.z.string().email(),
    SEED_USER_PASSWORD: zod_1.z.string().min(12),
});
const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
    console.error('Invalid backend environment variables:', parsedEnv.error.flatten().fieldErrors);
    process.exit(1);
}
const baseEnv = parsedEnv.data;
exports.env = {
    ...baseEnv,
    IS_PRODUCTION: baseEnv.NODE_ENV === 'production',
    FRONTEND_ORIGINS: baseEnv.FRONTEND_URL.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
};
