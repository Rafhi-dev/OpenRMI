import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting OpenRMI database seeding...');

  // 1. Seed Global AI Configuration (Default)
  console.log('🤖 Seeding Global AI Configuration...');
  await prisma.aiConfiguration.upsert({
    where: { id: 'global_ai_config' },
    update: {
      deepseekApiKey: process.env.DEEPSEEK_API_KEY || 'sk-5fc4dee4224e4a848d4096a99985b175',
      deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      activeLlmModel: process.env.DEEPSEEK_ACTIVE_MODEL || 'deepseek-flash',
      thinkingMode: true,
      jinaApiKey: process.env.JINA_API_KEY || 'jina_f4a16049100d4c6d8bd8dc3c31f825c6HjIQHAFVgCpNkq5J9r-p_OWfr8wr',
      activeEmbeddingModel: process.env.JINA_ACTIVE_MODEL || 'jina-embeddings-v4',
      mineruApiKey: process.env.MINERU_API_KEY || 'sk-UPh2rYndM1ArNcWpL9uoPAu58lPpHLbqt25zyNYCXP705ETP',
      temperature: 0.1,
      maxTokens: 4096,
    },
    create: {
      id: 'global_ai_config',
      deepseekApiKey: process.env.DEEPSEEK_API_KEY || 'sk-5fc4dee4224e4a848d4096a99985b175',
      deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      activeLlmModel: process.env.DEEPSEEK_ACTIVE_MODEL || 'deepseek-flash',
      thinkingMode: true,
      jinaApiKey: process.env.JINA_API_KEY || 'jina_f4a16049100d4c6d8bd8dc3c31f825c6HjIQHAFVgCpNkq5J9r-p_OWfr8wr',
      activeEmbeddingModel: process.env.JINA_ACTIVE_MODEL || 'jina-embeddings-v4',
      mineruApiKey: process.env.MINERU_API_KEY || 'sk-UPh2rYndM1ArNcWpL9uoPAu58lPpHLbqt25zyNYCXP705ETP',
      temperature: 0.1,
      maxTokens: 4096,
    },
  });

  // 1.1 Seed Global System Settings (Termasuk Batas Ukuran File Upload)
  console.log('⚙️ Seeding Global System Settings...');
  await prisma.systemSetting.upsert({
    where: { id: 'global_system_setting' },
    update: {},
    create: {
      id: 'global_system_setting',
      maxUploadFileSizeMb: 50,
      allowedFileTypes: 'pdf,docx,xlsx,jpeg,jpg,png',
    },
  });

  // 2. Seed Root Administrator
  console.log('👤 Seeding Root Administrator...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('AdminOpenRMI2024!', salt);

  await prisma.user.upsert({
    where: { email: 'admin@openrmi.id' },
    update: {
      username: 'admin',
    },
    create: {
      email: 'admin@openrmi.id',
      username: 'admin',
      fullName: 'System Administrator Root',
      passwordHash,
      role: UserRole.ADMINISTRATOR,
      isActive: true,
    },
  });

  // 3. Seed Seluruh Master Regulasi KBUMN (5 Dimensi, 15 Sub-Dimensi, 42 Parameter, 281 Kriteria & Dokumen Wajib)
  console.log('🏛️ Seeding Full KBUMN Master Model from SCORE RMI.xlsx...');
  const { seedMasterRmi } = await import('./seed_master_rmi');
  await seedMasterRmi(prisma);

  // 5. Seed Demo Vendor, Client Tenant, Consultant & Counterpart
  console.log('🏢 Seeding Demo Vendor, Tenant, Consultant & Counterpart...');
  
  // Vendor
  const demoVendor = await prisma.vendor.upsert({
    where: { code: 'VEND-MAS' },
    update: {},
    create: {
      name: 'PT Mitra Audit Solusindo (Vendor Konsultan)',
      code: 'VEND-MAS',
      phone: '08123456789',
      email: 'vendor@openrmi.id',
      maxTenants: 10,
    },
  });

  const vendorPassword = await bcrypt.hash('VendorOpenRMI2024!', salt);
  await prisma.user.upsert({
    where: { email: 'vendor@openrmi.id' },
    update: {
      vendorId: demoVendor.id,
      username: 'vendor',
    },
    create: {
      email: 'vendor@openrmi.id',
      username: 'vendor',
      fullName: 'Budi Santoso (Admin Vendor MAS)',
      passwordHash: vendorPassword,
      role: UserRole.VENDOR,
      vendorId: demoVendor.id,
      isActive: true,
    },
  });

  // Client Tenant
  const demoTenant = await prisma.tenant.upsert({
    where: { code: 'PELINDO' },
    update: {
      vendorId: demoVendor.id,
    },
    create: {
      vendorId: demoVendor.id,
      name: 'PT Pelabuhan Indonesia Persero',
      code: 'PELINDO',
      industryCluster: 'UMUM',
    },
  });

  // Active Assessment Period 2025
  const activePeriod = await prisma.assessmentPeriod.upsert({
    where: {
      tenantId_year: {
        tenantId: demoTenant.id,
        year: 2025,
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      year: 2025,
      status: 'SCORING_STAGE',
      modelCluster: 'UMUM',
      aspectDimScore: 3.50,
      perfScore: 85.00,
      adjustmentScore: 0.00,
      finalRmiScore: 3.50,
      maturityPhase: 'Praktik yang Baik (+)',
    },
  });

  // Consultant User
  const consultantPassword = await bcrypt.hash('ConsultantOpenRMI2024!', salt);
  const consultantUser = await prisma.user.upsert({
    where: { email: 'consultant@openrmi.id' },
    update: {
      vendorId: demoVendor.id,
      username: 'consultant',
    },
    create: {
      email: 'consultant@openrmi.id',
      username: 'consultant',
      fullName: 'Dr. Hendra Gunawan, CRMA (Lead Assessor)',
      passwordHash: consultantPassword,
      role: UserRole.EXTERNAL_CONSULTANT,
      vendorId: demoVendor.id,
      agencyName: 'PT Mitra Audit Solusindo',
      isActive: true,
    },
  });

  // Assign Consultant to Tenant & Period
  const existingAssignment = await prisma.consultantAssignment.findFirst({
    where: {
      tenantId: demoTenant.id,
      consultantId: consultantUser.id,
      periodId: activePeriod.id,
    },
  });

  if (!existingAssignment) {
    await prisma.consultantAssignment.create({
      data: {
        tenantId: demoTenant.id,
        consultantId: consultantUser.id,
        periodId: activePeriod.id,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        isActive: true,
      },
    });
  }

  // Counterpart User
  const counterpartPassword = await bcrypt.hash('CounterpartOpenRMI2024!', salt);
  await prisma.user.upsert({
    where: { email: 'counterpart@openrmi.id' },
    update: {
      tenantId: demoTenant.id,
      username: 'counterpart',
    },
    create: {
      email: 'counterpart@openrmi.id',
      username: 'counterpart',
      fullName: 'Siti Rahmawati (Risk Counterpart PELINDO)',
      passwordHash: counterpartPassword,
      role: UserRole.COUNTERPART_TEAM,
      tenantId: demoTenant.id,
      isActive: true,
    },
  });

  console.log('✅ OpenRMI Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
