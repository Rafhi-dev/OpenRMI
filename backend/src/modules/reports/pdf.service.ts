import PDFDocument from 'pdfkit';
import { FullReportAssessmentData } from './excel.service';

export class PdfReportService {
  /**
   * Menghasilkan dokumen PDF Formulir Resmi Ringkasan Hasil RMI (Format 1.2.8)
   */
  async generateSummaryPdf(data: FullReportAssessmentData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `Ringkasan Hasil Penilaian RMI - ${data.tenant.name} (${data.period.year})`,
          Author: 'OpenRMI Enterprise Platform',
          Subject: 'Format 1.2.8 Peraturan Menteri BUMN PER-2/MBU/03/2023',
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // 1. Header Resmi KBUMN
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#475569')
        .text('KEMENTERIAN BADAN USAHA MILIK NEGARA REPUBLIK INDONESIA', { align: 'center' });
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#64748b')
        .text('Lampiran Peraturan Menteri BUMN No. PER-2/MBU/03/2023 & Juknis 8 Per-2 BUMN 2023', {
          align: 'center',
        });

      doc.moveDown(0.8);
      doc
        .fontSize(13)
        .font('Helvetica-Bold')
        .fillColor('#1e3a8a')
        .text('FORMULIR RINGKASAN HASIL PENILAIAN RISK MATURITY INDEX (RMI)', { align: 'center' });
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#2563eb')
        .text('FORMAT 1.2.8', { align: 'center' });

      doc.moveDown(1);
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.8);

      // 2. Profil Entitas BUMN & Asesmen
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a').text('A. IDENTITAS ASESMEN');
      doc.moveDown(0.4);

      const metaX = 40;
      let currY = doc.y;

      const printMetaRow = (label: string, value: string) => {
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155').text(label, metaX, currY, { width: 140 });
        doc.font('Helvetica').fontSize(8.5).fillColor('#0f172a').text(`:  ${value}`, metaX + 145, currY, { width: 360 });
        currY += 15;
      };

      printMetaRow('Nama BUMN / Perusahaan', data.tenant.name);
      printMetaRow('Klaster Industri', data.tenant.industryCluster);
      printMetaRow('Tahun Buku Observasi', String(data.period.year));
      printMetaRow('Lembaga Penilai Independen', data.vendor?.name || 'Kantor Jasa Penilai / Konsultan Risiko');
      printMetaRow('Lead Assessor', data.leadConsultant?.fullName || 'Tim Asesor Independen');
      printMetaRow('Status Asesmen', data.period.status);
      printMetaRow('Tanggal Penerbitan Laporan', new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }));

      doc.y = currY + 10;
      doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.8);

      // 3. Rekapitulasi Capaian 5 Dimensi
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a').text('B. REKAPITULASI CAPAIAN 5 DIMENSI RMI');
      doc.moveDown(0.5);

      const tableTop = doc.y;
      // Header Table
      doc.rect(40, tableTop, 515, 20).fill('#1e3a8a');
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
      doc.text('No', 45, tableTop + 6, { width: 25, align: 'center' });
      doc.text('Kode', 75, tableTop + 6, { width: 35, align: 'center' });
      doc.text('Nama Dimensi Penilaian', 115, tableTop + 6, { width: 240 });
      doc.text('Jumlah Param', 360, tableTop + 6, { width: 75, align: 'center' });
      doc.text('Skor Dimensi', 445, tableTop + 6, { width: 100, align: 'center' });

      let rowY = tableTop + 20;
      data.dimensions.forEach((dim, idx) => {
        const bg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
        doc.rect(40, rowY, 515, 18).fill(bg);

        doc.font('Helvetica').fontSize(8).fillColor('#1e293b');
        doc.text(String(idx + 1), 45, rowY + 5, { width: 25, align: 'center' });
        doc.text(dim.code, 75, rowY + 5, { width: 35, align: 'center' });
        doc.text(dim.name, 115, rowY + 5, { width: 240 });
        doc.text(String(dim.parameters.length), 360, rowY + 5, { width: 75, align: 'center' });
        doc.font('Helvetica-Bold').text(dim.score !== null ? dim.score.toFixed(2) : '-', 445, rowY + 5, {
          width: 100,
          align: 'center',
        });

        rowY += 18;
      });

      // Total Aspek Dimensi
      doc.rect(40, rowY, 515, 20).fill('#e2e8f0');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a');
      doc.text('SKOR ASPEK DIMENSI (Rata-rata 42 Parameter):', 45, rowY + 6, { width: 390, align: 'right' });
      doc.text(
        data.period.aspectDimScore !== null ? data.period.aspectDimScore.toFixed(2) : '-',
        445,
        rowY + 6,
        { width: 100, align: 'center' }
      );

      doc.y = rowY + 30;

      // 4. Aspek Kinerja & Klausul Gating
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a').text('C. ASPEK KINERJA (PERFORMANCE FACTOR)');
      doc.moveDown(0.4);

      const perf = data.performance;
      const aspectScore = data.period.aspectDimScore || 0;
      const isGatingActive = aspectScore >= 3.0;

      currY = doc.y;
      printMetaRow('Tingkat Kesehatan (Final Rating)', perf?.finalRating || 'Belum Dievaluasi');
      printMetaRow('Peringkat Komposit Risiko', perf ? `Peringkat ${perf.compositeRating}` : 'Belum Dievaluasi');
      printMetaRow(
        'Klausul Ambang Batas (Gating Condition)',
        isGatingActive
          ? 'MEMENUHI SYARAT (Skor Dimensi >= 3.00, Aspek Kinerja Dihitung)'
          : 'TIDAK DIHITUNG (Skor Dimensi < 3.00, Penyesuaian Skor = 0.00)'
      );
      printMetaRow(
        'Faktor Penyesuaian Skor Kinerja',
        perf?.penalty !== undefined ? (perf.penalty > 0 ? `+${perf.penalty.toFixed(2)}` : perf.penalty.toFixed(2)) : '0.00'
      );

      doc.y = currY + 10;
      doc.moveDown(0.5);

      // 5. Kesimpulan Skor Akhir RMI & Fase Kematangan (Highlight Box)
      const boxY = doc.y;
      doc.rect(40, boxY, 515, 55).fillAndStroke('#eff6ff', '#2563eb');

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e40af');
      doc.text('KESIMPULAN SKOR AKHIR RISK MATURITY INDEX (RMI):', 50, boxY + 10);

      doc.fontSize(16).fillColor('#1d4ed8').text(
        data.period.finalRmiScore !== null ? data.period.finalRmiScore.toFixed(2) : 'N/A',
        50,
        boxY + 28
      );

      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(
        `Fase Kematangan Risiko: ${data.period.maturityPhase || '-'}`,
        130,
        boxY + 30
      );

      doc.y = boxY + 70;

      // 6. Kolom Tanda Tangan Pengesahan (Format 1.2.8)
      doc.moveDown(0.5);
      const signY = doc.y;

      // Kiri: Tim Counterpart Perusahaan
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155');
      doc.text('Mengetahui & Menyetujui,', 60, signY);
      doc.text(data.tenant.name, 60, signY + 12);
      doc.text('(Tim Counterpart & Direksi Terkait)', 60, signY + 24);

      doc.text('( __________________________ )', 60, signY + 75);
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b');
      doc.text('Tanda Tangan & Cap Perusahaan', 60, signY + 88);

      // Kanan: Lembaga Penilai Independen
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155');
      doc.text('Disusun & Disahkan Oleh,', 360, signY);
      doc.text(data.vendor?.name || 'Lembaga Penilai Independen', 360, signY + 12);
      doc.text('(Lead Assessor / Ketua Tim)', 360, signY + 24);

      doc.text(`( ${data.leadConsultant?.fullName || '__________________________'} )`, 360, signY + 75);
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b');
      doc.text('Sertifikasi CRMO / QRMO / ERMCP', 360, signY + 88);

      doc.end();
    });
  }
}

export const pdfReportService = new PdfReportService();
