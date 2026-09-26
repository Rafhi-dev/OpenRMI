import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

export async function seedMasterRmi(externalPrisma?: PrismaClient) {
  const db = externalPrisma || prisma;
  console.log('📖 Loading SCORE RMI.xlsx regulation workbook...');

  const possiblePaths = [
    path.resolve(__dirname, '../../SCORE RMI.xlsx'),
    path.resolve(process.cwd(), 'SCORE RMI.xlsx'),
    path.resolve(process.cwd(), '../SCORE RMI.xlsx'),
    'C:/Users/user/Documents/AppDev/OpenRMI/SCORE RMI.xlsx',
  ];

  let excelPath = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      excelPath = p;
      break;
    }
  }

  if (!excelPath) {
    throw new Error('File SCORE RMI.xlsx tidak ditemukan di direktori proyek.');
  }

  console.log(`📁 Found SCORE RMI.xlsx at: ${excelPath}`);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);

  // ==========================================
  // 1. Ekstraksi Dimensi & Sub-Dimensi dari Sheet 'Score Dimensi'
  // ==========================================
  console.log("🏛️ Membaca struktur 5 Dimensi & Sub-dimensi dari sheet 'Score Dimensi'...");
  const scoreDimSheet = workbook.getWorksheet('Score Dimensi');
  if (!scoreDimSheet) {
    throw new Error("Sheet 'Score Dimensi' tidak ditemukan dalam file Excel.");
  }

  interface ParamMeta {
    dimId: number;
    dimName: string;
    subDimCode: string;
    subDimName: string;
    paramNum: number;
    paramTitle: string;
  }

  const paramMetaMap = new Map<number, ParamMeta>();
  const dimMap = new Map<number, string>();
  const subDimMap = new Map<string, { dimId: number; code: string; name: string }>();

  for (let r = 3; r <= 44; r++) {
    const row = scoreDimSheet.getRow(r);
    const dimId = Number(row.getCell(2).value);
    const dimName = String(row.getCell(3).value || '').trim();
    const subDimCode = String(row.getCell(4).value || '').trim();
    const subDimName = String(row.getCell(5).value || '').trim();
    const paramNum = Number(row.getCell(6).value);
    const paramTitle = String(row.getCell(7).value || '').trim();

    if (!dimId || !paramNum) continue;

    dimMap.set(dimId, dimName);
    const subDimKey = `${dimId}_${subDimCode}`;
    if (!subDimMap.has(subDimKey)) {
      subDimMap.set(subDimKey, { dimId, code: subDimCode, name: subDimName });
    }

    paramMetaMap.set(paramNum, {
      dimId,
      dimName,
      subDimCode,
      subDimName,
      paramNum,
      paramTitle,
    });
  }

  // Upsert Dimensi
  for (const [dimId, dimName] of dimMap.entries()) {
    const code = `D${dimId}`;
    await db.dimension.upsert({
      where: { id: dimId },
      update: { code, name: dimName },
      create: { id: dimId, code, name: dimName },
    });
  }
  console.log(`✅ 5 Dimensi berhasil di-upsert.`);

  // Upsert SubDimensi & simpan Map ID database
  const subDimDbIdMap = new Map<string, number>();
  for (const [key, sub] of subDimMap.entries()) {
    const existing = await db.subDimension.findFirst({
      where: { dimensionId: sub.dimId, code: sub.code },
    });

    if (existing) {
      const updated = await db.subDimension.update({
        where: { id: existing.id },
        data: { name: sub.name },
      });
      subDimDbIdMap.set(key, updated.id);
    } else {
      const created = await db.subDimension.create({
        data: {
          dimensionId: sub.dimId,
          code: sub.code,
          name: sub.name,
        },
      });
      subDimDbIdMap.set(key, created.id);
    }
  }
  console.log(`✅ ${subDimDbIdMap.size} Sub-Dimensi berhasil di-upsert.`);

  // ==========================================
  // 2. Ekstraksi 42 Parameter
  // ==========================================
  console.log('📋 Meng-upsert 42 Parameter KBUMN...');
  const paramDbIdMap = new Map<number, number>();

  for (let pNum = 1; pNum <= 42; pNum++) {
    const meta = paramMetaMap.get(pNum);
    if (!meta) continue;

    const subDimKey = `${meta.dimId}_${meta.subDimCode}`;
    const subDimDbId = subDimDbIdMap.get(subDimKey);
    if (!subDimDbId) {
      throw new Error(`SubDimensi untuk parameter ${pNum} (${subDimKey}) tidak ditemukan.`);
    }

    const code = `P${String(pNum).padStart(2, '0')}`;
    const param = await db.parameter.upsert({
      where: { code },
      update: {
        subDimensionId: subDimDbId,
        parameterNumber: pNum,
        title: meta.paramTitle,
        description: `Parameter ${pNum} regulasi KBUMN Juknis 8 Per-2 BUMN 2023: ${meta.paramTitle}`,
      },
      create: {
        subDimensionId: subDimDbId,
        parameterNumber: pNum,
        code,
        title: meta.paramTitle,
        description: `Parameter ${pNum} regulasi KBUMN Juknis 8 Per-2 BUMN 2023: ${meta.paramTitle}`,
      },
    });

    paramDbIdMap.set(pNum, param.id);
  }
  console.log(`✅ 42 Parameter KBUMN berhasil di-upsert.`);

  // ==========================================
  // 3. Ekstraksi 281 Kriteria & Dokumen yang Diperlukan dari Sheet 'Reviu Dokumen'
  // ==========================================
  console.log("📑 Membaca seluruh Kriteria & Dokumen Wajib dari sheet 'Reviu Dokumen'...");
  const revSheet = workbook.getWorksheet('Reviu Dokumen');
  if (!revSheet) {
    throw new Error("Sheet 'Reviu Dokumen' tidak ditemukan dalam file Excel.");
  }

  let criteriaCount = 0;
  const paramLetterCounts = new Map<number, number>();

  for (let r = 3; r <= revSheet.rowCount; r++) {
    const row = revSheet.getRow(r);
    const pVal = row.getCell(4).value;
    const lVal = row.getCell(6).value;
    const sVal = row.getCell(7).value;
    const docNumVal = row.getCell(8).value;
    const docVal = row.getCell(9).value;

    if (!pVal || !lVal || !sVal) continue;

    const paramNum = Number(pVal);
    const paramDbId = paramDbIdMap.get(paramNum);
    if (!paramDbId) continue;

    // Normalisasi letterCode: jika huruf duplikat dalam 1 parameter (misal P42 baris 283 tertulis 'f'),
    // gunakan urutan alfabet yang benar (a, b, c, d, e, f, g, h...)
    const count = paramLetterCounts.get(paramNum) || 0;
    const sequentialLetter = String.fromCharCode(97 + count); // 97 = 'a'
    const rawLetter = String(lVal).trim().toLowerCase();
    const finalLetter = rawLetter === sequentialLetter ? rawLetter : sequentialLetter;
    paramLetterCounts.set(paramNum, count + 1);

    const statement = String(sVal).trim();
    const defaultEvidences = docVal ? String(docVal).trim() : null;
    const guidanceNotes = docNumVal
      ? `Standar Dokumen Pemenuhan (No. 1 s.d. ${String(docNumVal).trim().split('\n').pop() || '1'})`
      : 'Dokumen bukti dukung resmi perusahaan';

    await db.criterion.upsert({
      where: {
        parameterId_letterCode_level: {
          parameterId: paramDbId,
          letterCode: finalLetter,
          level: 1,
        },
      },
      update: {
        statement,
        guidanceNotes,
        defaultEvidences,
      },
      create: {
        parameterId: paramDbId,
        letterCode: finalLetter,
        level: 1,
        statement,
        guidanceNotes,
        defaultEvidences,
      },
    });

    criteriaCount++;
  }

  console.log(`✅ Berhasil meng-upsert ${criteriaCount} Kriteria Penilaian beserta Standar Dokumen Pemenuhan.`);
  return {
    dimensions: dimMap.size,
    subDimensions: subDimDbIdMap.size,
    parameters: paramDbIdMap.size,
    criteria: criteriaCount,
  };
}

// Eksekusi langsung jika dipanggil via CLI
if (require.main === module) {
  seedMasterRmi()
    .then((stats) => {
      console.log('🎉 Seeding Master RMI Selesai!');
      console.log(stats);
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Gagal seeding master RMI:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
