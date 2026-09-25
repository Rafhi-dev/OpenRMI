import { Queue } from 'bullmq';
import { getRedisClient } from '../../../config/redis';
import { processDocumentIngestionJob } from './rag.worker';

export interface DocumentIngestionJobData {
  tenantId: string;
  fileUrl: string;
  fileName: string;
  evidenceId?: string;
  supplementaryDocId?: string;
}

let ingestionQueue: Queue | null = null;

export const initIngestionQueue = (): Queue | null => {
  const redis = getRedisClient();
  if (!redis || process.env.NODE_ENV === 'test') {
    return null;
  }

  if (!ingestionQueue) {
    try {
      ingestionQueue = new Queue('document-ingestion', {
        connection: redis,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      });
    } catch (err: any) {
      console.warn('[BullMQ Ingestion Queue Init Error]:', err.message);
      ingestionQueue = null;
    }
  }

  return ingestionQueue;
};

/**
 * Memasukkan dokumen bukti atau dokumen tambahan ke dalam antrean pemrosesan RAG
 * Jika Redis offline / test environment, proses berjalan otomatis di latar belakang (asinkron non-blocking)
 */
export const addDocumentIngestionJob = async (data: DocumentIngestionJobData): Promise<void> => {
  const queue = initIngestionQueue();

  if (queue) {
    await queue.add('ingest-document', data);
  } else {
    // Non-blocking in-memory asynchronous worker fallback
    setImmediate(async () => {
      try {
        await processDocumentIngestionJob(data);
      } catch (err: any) {
        console.error('[Async Ingestion Worker Fallback Error]:', err.message);
      }
    });
  }
};
