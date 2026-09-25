import prisma from '../../../config/database';
import { setMaxUploadFileSizeCache } from '../../../middlewares/fileValidator';
import { logAuditEvent } from '../../../utils/auditLogger';
import { UpdateSystemSettingsInput } from './settings.schema';

export class SystemSettingsService {
  async getSettings() {
    return prisma.systemSetting.upsert({
      where: { id: 'global_system_setting' },
      update: {},
      create: {
        id: 'global_system_setting',
        maxUploadFileSizeMb: 50,
        allowedFileTypes: 'pdf,docx,xlsx,jpeg,jpg,png',
      },
    });
  }

  async updateSettings(adminId: string, input: UpdateSystemSettingsInput) {
    const current = await this.getSettings();

    const updated = await prisma.systemSetting.update({
      where: { id: 'global_system_setting' },
      data: {
        ...(input.maxUploadFileSizeMb !== undefined ? { maxUploadFileSizeMb: input.maxUploadFileSizeMb } : {}),
        ...(input.allowedFileTypes ? { allowedFileTypes: input.allowedFileTypes } : {}),
      },
    });

    // Perbarui cache in-memory untuk efisiensi instan di middleware file upload
    setMaxUploadFileSizeCache(updated.maxUploadFileSizeMb);

    // Catat ke audit log
    await logAuditEvent({
      userId: adminId,
      action: 'SYSTEM_SETTINGS_UPDATE',
      targetTable: 'system_settings',
      targetId: updated.id,
      oldValues: { maxUploadFileSizeMb: current.maxUploadFileSizeMb, allowedFileTypes: current.allowedFileTypes },
      newValues: { maxUploadFileSizeMb: updated.maxUploadFileSizeMb, allowedFileTypes: updated.allowedFileTypes },
    });

    return updated;
  }
}

export const systemSettingsService = new SystemSettingsService();
export default systemSettingsService;
