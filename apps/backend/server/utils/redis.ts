import { Redis } from '@upstash/redis';

let redis: Redis | null = null;
let credentialsWarned = false;

export function getRedisClient(): Redis | null {
  if (redis) return redis;

  const config = useRuntimeConfig();
  const url = config.upstashRedisRestUrl as string | undefined;
  const token = config.upstashRedisRestToken as string | undefined;

  if (!url || !token) {
    if (!credentialsWarned) {
      console.warn('Upstash Redis credentials are missing from runtime config');
      credentialsWarned = true;
    }
    return null;
  }

  try {
    redis = new Redis({ url, token });
    return redis;
  } catch (err) {
    console.warn('Failed to initialize Redis client:', err);
    return null;
  }
}
