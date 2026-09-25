import { Worker, Job } from 'bullmq';
import { getRedisClient } from '../../../config/redis';
import { mineruService } from '../services/mineru.service';
import { prisma } from '../../../config/database';

export interface IngestionJobPayload {
  tenantId: string;
  fileUrl: string;
  fileName: string;
  evidenceId?: string;
  supplementaryDocId?: string;
}

/**
 * Logika eksekusi pekerjaan ingestion dokumen (MinerU parser + chunking + DB write)
 */
export const processDocumentIngestionJob = async (data: IngestionJobPayload) => {
  try {
    // 1. Update status menjadi PROCESSING jika supplementary document
    if (data.supplementaryDocId) {
      await prisma.supplementaryDocument.update({
        where: { id: data.supplementaryDocId },
        data: { ragIngestionStatus: 'PROCESSING' },
      });
    }

    // 2. Ambil MinerU API Key dari konfigurasi AI global
    const aiConfig = await prisma.aiConfiguration.findUnique({
      where: { id: 'global_ai_config' },
    });

    // 3. Ekstraksi dokumen per halaman via MinerU
    const pages = await mineruService.extractDocument(data.fileUrl, data.fileName, aiConfig?.mineruApiKey);

    // 4. Simpan ke tabel DocumentChunk
    const chunks = await mineruService.ingestChunks(pages, {
      evidenceId: data.evidenceId,
      supplementaryDocId: data.supplementaryDocId,
    });

    return {
      success: true,
      totalPages: pages.length,
      totalChunks: chunks.length,
    };
  } catch (error: any) {
    console.error(`[RAG Worker Failure for ${data.fileName}]:`, error.message);

    if (data.supplementaryDocId) {
      await prisma.supplementaryDocument.update({
        where: { id: data.supplementaryDocId },
        data: { ragIngestionStatus: 'FAILED' },
      });
    }

    throw error;
  }
};

let ingestionWorker: Worker | null = null;

export const initIngestionWorker = (): Worker | null => {
  const redis = getRedisClient();
  if (!redis || process.env.NODE_ENV === 'test') {
    return null;
  }

  if (!ingestionWorker) {
    try {
      ingestionWorker = new Worker(
        'document-ingestion',
        async (job: Job<IngestionJobPayload>) => {
          return await processDocumentIngestionJob(job.data);
        },
        {
          connection: redis,
          concurrency: 3,
        }
      );

      ingestionWorker.on('completed', (job) => {
        if (process.env.NODE_ENV !== 'test') {
          console.log(`[RAG Job Completed]: ${job.id} (${job.data.fileName})`);
        }
      });

      ingestionWorker.on('failed', (job, err) => {
        console.error(`[RAG Job Failed]: ${job?.id} error:`, err.message);
      });
    } catch (err: any) {
      console.warn('[BullMQ Ingestion Worker Init Error]:', err.message);
      ingestionWorker = null;
    }
  }

  return ingestionWorker;
};
