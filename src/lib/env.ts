import { z } from 'zod';

const envSchema = z.object({
  DASHSCOPE_API_KEY: z.string().min(1, 'DASHSCOPE_API_KEY required'),
  DATABASE_PATH: z.string().default('./data/tasks.db'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid env: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
    );
  }
  return parsed.data;
}

export const env = loadEnv();
