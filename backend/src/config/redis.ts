import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient: Redis | null = null;

export const getRedisClient = (): Redis | null => {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;
  if (!redisUrl && process.env.NODE_ENV === 'test') {
    return null;
  }

  if (redisUrl) {
    try {
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy(times) {
          if (times > 3) {
            return null; // Stop retrying if Redis is unavailable
          }
          return Math.min(times * 100, 2000);
        },
      });

      redisClient.on('error', (err) => {
        if (process.env.NODE_ENV !== 'test') {
          console.warn('[Redis Warning]:', err.message);
        }
      });
    } catch (err: any) {
      console.warn('[Redis Initialization Failed]:', err.message);
      redisClient = null;
    }
  }

  return redisClient;
};

export default getRedisClient;
