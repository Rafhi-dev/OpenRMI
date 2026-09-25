import prisma from '../../../config/database';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import axios from 'axios';

export class AdminHealthService {
  async checkSystemHealth() {
    const startTime = Date.now();
    const result: {
      status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
      timestamp: string;
      uptimeSeconds: number;
      components: {
        database: { status: 'UP' | 'DOWN'; latencyMs: number; error?: string };
        redis: { status: 'UP' | 'DOWN'; latencyMs: number; provider: string; error?: string };
        storage: { status: 'UP' | 'DOWN'; latencyMs: number; bucket: string; error?: string };
      };
      system: {
        memory: {
          heapUsedMb: number;
          heapTotalMb: number;
          rssMb: number;
        };
        nodeVersion: string;
      };
    } = {
      status: 'HEALTHY',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      components: {
        database: { status: 'DOWN', latencyMs: 0 },
        redis: { status: 'DOWN', latencyMs: 0, provider: 'Upstash Redis' },
        storage: { status: 'DOWN', latencyMs: 0, bucket: process.env.S3_BUCKET || 'media-rmi-axpnli' },
      },
      system: {
        memory: {
          heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotalMb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        },
        nodeVersion: process.version,
      },
    };

    // 1. Check PostgreSQL Database
    const dbStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      result.components.database = {
        status: 'UP',
        latencyMs: Date.now() - dbStart,
      };
    } catch (err: any) {
      result.status = 'DEGRADED';
      result.components.database = {
        status: 'DOWN',
        latencyMs: Date.now() - dbStart,
        error: err.message,
      };
    }

    // 2. Check Redis (Upstash REST API Ping)
    const redisStart = Date.now();
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        const response = await axios.get(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, {
          headers: {
            Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
          },
          timeout: 4000,
        });
        if (response.data && response.data.result === 'PONG') {
          result.components.redis = {
            status: 'UP',
            latencyMs: Date.now() - redisStart,
            provider: 'Upstash REST Redis',
          };
        }
      } catch (err: any) {
        result.status = 'DEGRADED';
        result.components.redis = {
          status: 'DOWN',
          latencyMs: Date.now() - redisStart,
          provider: 'Upstash REST Redis',
          error: err.message,
        };
      }
    } else {
      result.components.redis = {
        status: 'UP',
        latencyMs: 0,
        provider: 'In-Memory Fallback',
      };
    }

    // 3. Check Cloudflare R2 / S3 Object Storage
    const s3Start = Date.now();
    if (process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) {
      try {
        const s3 = new S3Client({
          region: process.env.S3_REGION || 'auto',
          endpoint: process.env.S3_ENDPOINT,
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
          },
        });
        await s3.send(new HeadBucketCommand({ Bucket: process.env.S3_BUCKET || 'media-rmi-axpnli' }));
        result.components.storage = {
          status: 'UP',
          latencyMs: Date.now() - s3Start,
          bucket: process.env.S3_BUCKET || 'media-rmi-axpnli',
        };
      } catch (err: any) {
        // Jika 403 atau 404, tapi endpoint menjawab, berarti network UP
        if (err.$metadata?.httpStatusCode) {
          result.components.storage = {
            status: 'UP',
            latencyMs: Date.now() - s3Start,
            bucket: process.env.S3_BUCKET || 'media-rmi-axpnli',
          };
        } else {
          result.status = 'DEGRADED';
          result.components.storage = {
            status: 'DOWN',
            latencyMs: Date.now() - s3Start,
            bucket: process.env.S3_BUCKET || 'media-rmi-axpnli',
            error: err.message,
          };
        }
      }
    }

    if (result.components.database.status === 'DOWN') {
      result.status = 'DOWN';
    }

    return result;
  }
}

export const adminHealthService = new AdminHealthService();
export default adminHealthService;
