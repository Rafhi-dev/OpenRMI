import prisma from '../../../config/database';
import { logAuditEvent } from '../../../utils/auditLogger';
import { UpdateAiConfigInput } from './aiConfig.schema';

export function maskApiKey(key: string | null | undefined): string {
  if (!key) return '-';
  if (key.length <= 8) return '****';
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

export class AdminAiConfigService {
  async getAiConfig() {
    const config = await prisma.aiConfiguration.upsert({
      where: { id: 'global_ai_config' },
      update: {},
      create: {
        id: 'global_ai_config',
        deepseekApiKey: process.env.DEEPSEEK_API_KEY || 'sk-5fc4dee4224e4a848d4096a99985b175',
        deepseekBaseUrl: 'https://api.deepseek.com',
        activeLlmModel: 'deepseek-flash',
        thinkingMode: true,
        jinaApiKey: process.env.JINA_API_KEY || 'jina_f4a16049100d4c6d8bd8dc3c31f825c6HjIQHAFVgCpNkq5J9r-p_OWfr8wr',
        activeEmbeddingModel: 'jina-embeddings-v4',
        mineruApiKey: process.env.MINERU_API_KEY || 'sk-UPh2rYndM1ArNcWpL9uoPAu58lPpHLbqt25zyNYCXP705ETP',
        temperature: 0.1,
        maxTokens: 4096,
      },
    });

    return {
      ...config,
      deepseekApiKeyMasked: maskApiKey(config.deepseekApiKey),
      jinaApiKeyMasked: maskApiKey(config.jinaApiKey),
      mineruApiKeyMasked: maskApiKey(config.mineruApiKey),
      // Sembunyikan plain text key pada respons standar demi keamanan audit
      deepseekApiKey: undefined,
      jinaApiKey: undefined,
      mineruApiKey: undefined,
    };
  }

  async updateAiConfig(adminId: string, input: UpdateAiConfigInput) {
    const current = await prisma.aiConfiguration.findUnique({
      where: { id: 'global_ai_config' },
    });

    const updated = await prisma.aiConfiguration.update({
      where: { id: 'global_ai_config' },
      data: {
        ...(input.deepseekApiKey ? { deepseekApiKey: input.deepseekApiKey } : {}),
        ...(input.deepseekBaseUrl ? { deepseekBaseUrl: input.deepseekBaseUrl } : {}),
        ...(input.activeLlmModel ? { activeLlmModel: input.activeLlmModel } : {}),
        ...(input.thinkingMode !== undefined ? { thinkingMode: input.thinkingMode } : {}),
        ...(input.jinaApiKey ? { jinaApiKey: input.jinaApiKey } : {}),
        ...(input.activeEmbeddingModel ? { activeEmbeddingModel: input.activeEmbeddingModel } : {}),
        ...(input.mineruApiKey !== undefined ? { mineruApiKey: input.mineruApiKey } : {}),
        ...(input.temperature !== undefined ? { temperature: input.temperature } : {}),
        ...(input.maxTokens !== undefined ? { maxTokens: input.maxTokens } : {}),
      },
    });

    await logAuditEvent({
      userId: adminId,
      action: 'AI_CONFIG_UPDATE',
      targetTable: 'ai_configurations',
      targetId: 'global_ai_config',
      oldValues: {
        activeLlmModel: current?.activeLlmModel,
        thinkingMode: current?.thinkingMode,
        activeEmbeddingModel: current?.activeEmbeddingModel,
      },
      newValues: {
        activeLlmModel: updated.activeLlmModel,
        thinkingMode: updated.thinkingMode,
        activeEmbeddingModel: updated.activeEmbeddingModel,
      },
    });

    return {
      ...updated,
      deepseekApiKeyMasked: maskApiKey(updated.deepseekApiKey),
      jinaApiKeyMasked: maskApiKey(updated.jinaApiKey),
      mineruApiKeyMasked: maskApiKey(updated.mineruApiKey),
      deepseekApiKey: undefined,
      jinaApiKey: undefined,
      mineruApiKey: undefined,
    };
  }
}

export const adminAiConfigService = new AdminAiConfigService();
export default adminAiConfigService;
