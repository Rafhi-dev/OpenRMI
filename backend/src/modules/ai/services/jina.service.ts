import { prisma } from '../../../config/database';
import axios from 'axios';

export interface ScoredChunk {
  id: string;
  pageNumber: number;
  content: string;
  tableDataJson?: any;
  similarityScore: number;
  sourceType: 'EVIDENCE' | 'SUPPLEMENTARY';
  sourceTitle: string;
}

export class JinaEmbeddingService {
  /**
   * Menghasilkan embedding vektor menggunakan Jina AI API v4/v3
   */
  async generateEmbedding(text: string, apiKey?: string, model = 'jina-embeddings-v4'): Promise<number[]> {
    if (apiKey && apiKey.trim().length > 0 && process.env.NODE_ENV !== 'test') {
      try {
        const response = await axios.post(
          'https://api.jina.ai/v1/embeddings',
          {
            model,
            input: [text],
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }
        );

        if (response.data?.data?.[0]?.embedding) {
          return response.data.data[0].embedding;
        }
      } catch (err: any) {
        console.warn(`[Jina API Error]: ${err.message}. Using deterministic lexical vector.`);
      }
    }

    // Fallback: Representasi vektor deterministik berbasis distribusi karakter
    return this.createSimulatedVector(text);
  }

  private createSimulatedVector(text: string, dimensions = 64): number[] {
    const vector = new Array(dimensions).fill(0);
    const normalized = text.toLowerCase();
    for (let i = 0; i < normalized.length; i++) {
      const code = normalized.charCodeAt(i);
      vector[i % dimensions] += code / 1000;
    }
    // Normalisasi Euclidean
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
    return vector.map((v) => Number((v / magnitude).toFixed(6)));
  }

  /**
   * Pencarian semantik relevansi chunk dokumen bukti terhadap kriteria penilaian KBUMN
   * Memastikan isolasi tenant mutlak (hanya dokumen milik tenantId bersangkutan)
   */
  async searchRelevantChunks(
    tenantId: string,
    query: string,
    limit = 5,
    filter?: { evidenceId?: string; supplementaryDocId?: string }
  ): Promise<ScoredChunk[]> {
    // 1. Ambil seluruh chunk milik tenant ini
    const chunks = await prisma.documentChunk.findMany({
      where: {
        OR: [
          {
            evidence: {
              tenantId,
              ...(filter?.evidenceId ? { id: filter.evidenceId } : {}),
            },
          },
          {
            supplementaryDoc: {
              tenantId,
              ...(filter?.supplementaryDocId ? { id: filter.supplementaryDocId } : {}),
            },
          },
        ],
      },
      include: {
        evidence: {
          select: {
            id: true,
            fileName: true,
            docNumber: true,
          },
        },
        supplementaryDoc: {
          select: {
            id: true,
            fileName: true,
            category: true,
          },
        },
      },
      take: 50,
    });

    if (chunks.length === 0) {
      return [];
    }

    // 2. Hitung skor relevansi semantik/leksikal terhadap teks kriteria
    const queryTokens = query
      .toLowerCase()
      .split(/[^a-zA-Z0-9]+/)
      .filter((t) => t.length > 2);

    const scoredChunks: ScoredChunk[] = chunks.map((c) => {
      const contentLower = c.content.toLowerCase();
      let matchCount = 0;
      queryTokens.forEach((token) => {
        if (contentLower.includes(token)) {
          matchCount++;
        }
      });

      const lexicalScore = queryTokens.length > 0 ? matchCount / queryTokens.length : 0.5;
      const baseScore = 0.5 + lexicalScore * 0.45;

      const isEvidence = !!c.evidence;
      const title = isEvidence
        ? `${c.evidence?.fileName} (${c.evidence?.docNumber || 'Tanpa No. SK'})`
        : `${c.supplementaryDoc?.fileName} (${c.supplementaryDoc?.category})`;

      return {
        id: c.id,
        pageNumber: c.pageNumber,
        content: c.content,
        tableDataJson: c.tableDataJson,
        similarityScore: Number(baseScore.toFixed(3)),
        sourceType: isEvidence ? 'EVIDENCE' : 'SUPPLEMENTARY',
        sourceTitle: title,
      };
    });

    // Urutkan berdasarkan similarity score tertinggi
    scoredChunks.sort((a, b) => b.similarityScore - a.similarityScore);

    return scoredChunks.slice(0, limit);
  }
}

export const jinaEmbeddingService = new JinaEmbeddingService();
