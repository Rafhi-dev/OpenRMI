import { z } from 'zod';

export const updateAiConfigSchema = z.object({
  deepseekApiKey: z.string().min(5).optional(),
  deepseekBaseUrl: z.string().url().optional(),
  activeLlmModel: z.enum(['deepseek-flash', 'deepseek-v4-pro']).optional(),
  thinkingMode: z.boolean().optional(),
  jinaApiKey: z.string().min(5).optional(),
  activeEmbeddingModel: z.enum(['jina-embeddings-v4', 'jina-embeddings-v3']).optional(),
  mineruApiKey: z.string().min(5).optional().nullable(),
  temperature: z.number().min(0.0).max(1.0).optional(),
  maxTokens: z.number().int().min(512).max(8192).optional(),
});

export type UpdateAiConfigInput = z.infer<typeof updateAiConfigSchema>;
