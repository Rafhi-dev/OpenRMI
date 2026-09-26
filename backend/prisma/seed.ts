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

  // 3. Seed 5 Dimensi Baku KBUMN
  console.log('🏛️ Seeding 5 Dimensions & Sub-dimensions...');
  const dimensions = [
    {
      id: 1,
      code: 'D1',
      name: 'Budaya & Kapabilitas Risiko',
      subDimensions: [
        { code: 'a', name: 'Budaya Risiko' },
        { code: 'b', name: 'Kapabilitas Risiko' },
      ],
    },
    {
      id: 2,
      code: 'D2',
      name: 'Organisasi & Tata Kelola Risiko',
      subDimensions: [
        { code: 'a', name: 'Organ Pengelola Risiko' },
        { code: 'b', name: 'Peran & Tanggung Jawab Organ Pengelola Risiko' },
        { code: 'c', name: 'Model Tata Kelola Tiga Lini & Terintegrasi' },
      ],
    },
    {
      id: 3,
      code: 'D3',
      name: 'Kerangka Risiko & Kepatuhan',
      subDimensions: [
        { code: 'a', name: 'Strategi Risiko' },
        { code: 'b', name: 'Kebijakan & Prosedur' },
        { code: 'c', name: 'Fungsi Kepatuhan' },
        { code: 'd', name: 'Efektivitas MR & Pengendalian Intern' },
      ],
    },
    {
      id: 4,
      code: 'D4',
      name: 'Proses & Kontrol Risiko',
      subDimensions: [
        { code: 'a', name: 'Identifikasi Risiko' },
        { code: 'b', name: 'Pengukuran & Prioritisasi Risiko' },
        { code: 'c', name: 'Perlakuan Risiko' },
        { code: 'd', name: 'Pelaporan Risiko Real-time' },
      ],
    },
    {
      id: 5,
      code: 'D5',
      name: 'Model, Data & Teknologi Risiko',
      subDimensions: [
        { code: 'a', name: 'Permodelan & Teknologi Risiko' },
        { code: 'b', name: 'Data Risiko' },
      ],
    },
  ];

  for (const dim of dimensions) {
    await prisma.dimension.upsert({
      where: { id: dim.id },
      update: { code: dim.code, name: dim.name },
      create: {
        id: dim.id,
        code: dim.code,
        name: dim.name,
      },
    });

    for (const sub of dim.subDimensions) {
      const existingSub = await prisma.subDimension.findFirst({
        where: { dimensionId: dim.id, code: sub.code },
      });

      if (!existingSub) {
        await prisma.subDimension.create({
          data: {
            dimensionId: dim.id,
            code: sub.code,
            name: sub.name,
          },
        });
      }
    }
  }

  // 4. Seed Parameter 01 s.d. 03 (Sampel Dimensi 1)
  console.log('📋 Seeding Initial Sample Parameters...');
  const subDimBudaya = await prisma.subDimension.findFirst({
    where: { dimensionId: 1, code: 'a' },
  });

  if (subDimBudaya) {
    const param1 = await prisma.parameter.upsert({
      where: { code: 'P01' },
      update: { title: 'Internalisasi Budaya Sadar Risiko' },
      create: {
        subDimensionId: subDimBudaya.id,
        parameterNumber: 1,
        code: 'P01',
        title: 'Internalisasi Budaya Sadar Risiko',
        description: 'Menilai efektivitas penanaman dan internalisasi budaya sadar risiko di seluruh jajaran organisasi BUMN.',
      },
    });

    // Kriteria untuk Parameter 01
    const criteriaP01 = [
      {
        letterCode: 'a',
        level: 1,
        statement: 'Belum ada program penanaman budaya sadar risiko yang terstruktur.',
        guidanceNotes: 'Cek keberadaan dokumen sosialisasi atau bukti program budaya risiko.',
        defaultEvidences: 'Laporan Sosialisasi MR, Materi Townhall MR, Surat Edaran.',
      },
      {
        letterCode: 'a',
        level: 3,
        statement: 'Telah diselenggarakan program sosialisasi budaya risiko minimal 1 kali per tahun untuk seluruh pegawai.',
        guidanceNotes: 'Periksa daftar hadir, notulensi, dan materi sosialisasi.',
        defaultEvidences: 'Daftar Hadir Sosialisasi, Notulen Townhall, Sertifikat Pelatihan MR.',
      },
      {
        letterCode: 'a',
        level: 5,
        statement: 'Budaya sadar risiko telah terinternalisasi secara menyeluruh, diukur melalui survei berkala dan tercermin dalam KPI individu.',
        guidanceNotes: 'Periksa laporan hasil survei budaya risiko dan integrasi KPI.',
        defaultEvidences: 'Laporan Hasil Survei Budaya Risiko, Dokumen KPI Direksi & Pegawai, Reward System Policy.',
      },
    ];

    for (const crit of criteriaP01) {
      await prisma.criterion.upsert({
        where: {
          parameterId_letterCode_level: {
            parameterId: param1.id,
            letterCode: crit.letterCode,
            level: crit.level,
          },
        },
        update: {
          statement: crit.statement,
          guidanceNotes: crit.guidanceNotes,
          defaultEvidences: crit.defaultEvidences,
        },
        create: {
          parameterId: param1.id,
          letterCode: crit.letterCode,
          level: crit.level,
          statement: crit.statement,
          guidanceNotes: crit.guidanceNotes,
          defaultEvidences: crit.defaultEvidences,
        },
      });
    }
  }

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
