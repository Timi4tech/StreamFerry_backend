const {z} = require ("zod")
const dotenv = require('dotenv');
dotenv.config();

const envSchema =  z.object({
    MICROSOFT_TENANT_ID:z.string(),
    MICROSOFT_URL_REDIRECT:z.string().url(),
    SESSION_SECRET:z.string(),
    DATABASE_URL: z.string(),
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    UPSTASH_REDIS_URL: z.string().url(),
    UPSTASH_REDIS_TOKEN: z.string(),
    FRONTEND_URL: z.string().url(),
    BACKEND_URL: z.string().url(),
    MONGO_URI:z.string().url(),
    DB_NAME: z.string(),
    ZOOM_ACCOUNT_ID:z.string(),
    ZOOM_CLIENT_ID:z.string(),
    ZOOM_CLIENT_SECRET:z.string(),
    ZOOM_REDIRECT_URI:z.string().url(),
    GOOGLE_CLIENT_ID:z.string(),
    GOOGLE_CLIENT_SECRET:z.string(),
    GOOGLE_REDIRECT_URI:z.string().url(),
    GOOGLE_REFRESH_TOKEN: z.string(),
    MICROSOFT_CLIENT_ID: z.string(),
    MICROSOFT_CLIENT_SECRET: z.string(),
    ZOOM_CLIENT_SCRET:z.string(),
    IOREDIS_TCP_URL:z.string()
})

export const env =  envSchema.parse('process.env')