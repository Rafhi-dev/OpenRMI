import { sanitizeString, sanitizeData } from '../../src/utils/sanitizer';
import { validateFileType, ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES } from '../../src/middlewares/fileValidator';

describe('Security: Input Validation, Sanitization & File Type Restriction', () => {
  describe('1. Sanitasi Input (Anti-XSS, Null Bytes & Script Injection)', () => {
    it('harus menghapus tag <script> dan isinya', () => {
      const malicious = "Halo <script>alert('hacked')</script> BUMN";
      const sanitized = sanitizeString(malicious);
      expect(sanitized).toBe('Halo  BUMN');
      expect(sanitized).not.toContain('<script>');
    });

    it('harus menghapus skema javascript: berbahaya', () => {
      const malicious = "javascript:alert('xss')";
      const sanitized = sanitizeString(malicious);
      expect(sanitized).toBe("alert('xss')");
      expect(sanitized).not.toContain('javascript:');
    });

    it('harus menghapus null bytes (\\0)', () => {
      const malicious = 'filename\0.pdf.exe';
      const sanitized = sanitizeString(malicious);
      expect(sanitized).toBe('filename.pdf.exe');
      expect(sanitized).not.toContain('\0');
    });

    it('harus melakukan sanitasi mendalam pada nested JSON body dan array', () => {
      const payload = {
        name: "  PT BUMN <script>hack()</script>  ",
        meta: {
          note: "javascript:evil() Catatan Tambahan ",
          tags: [" normal ", " <script>alert(1)</script>bahaya "],
        },
      };

      const cleaned = sanitizeData(payload);
      expect(cleaned.name).toBe('PT BUMN');
      expect(cleaned.meta.note).toBe('evil() Catatan Tambahan');
      expect(cleaned.meta.tags[0]).toBe('normal');
      expect(cleaned.meta.tags[1]).toBe('bahaya');
    });
  });

  describe('2. Validasi Tipe Berkas (HANYA pdf, docx, xlsx, jpeg, jpg, png)', () => {
    it('harus MENERIMA berkas PDF yang valid', () => {
      const res = validateFileType('Laporan_Tahunan_RMI.pdf', 'application/pdf');
      expect(res.isValid).toBe(true);
    });

    it('harus MENERIMA berkas DOCX yang valid', () => {
      const res = validateFileType(
        'Kebijakan_Manajemen_Risiko.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      expect(res.isValid).toBe(true);
    });

    it('harus MENERIMA berkas XLSX yang valid', () => {
      const res = validateFileType(
        'Kertas_Kerja_RMI.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(res.isValid).toBe(true);
    });

    it('harus MENERIMA berkas gambar JPEG dan JPG yang valid', () => {
      const resJpg = validateFileType('Screenshot_Struktur.jpg', 'image/jpeg');
      expect(resJpg.isValid).toBe(true);

      const resJpeg = validateFileType('Bukti_Organisasi.jpeg', 'image/jpeg');
      expect(resJpeg.isValid).toBe(true);
    });

    it('harus MENERIMA berkas gambar PNG yang valid', () => {
      const res = validateFileType('Radar_Chart.png', 'image/png');
      expect(res.isValid).toBe(true);
    });

    it('harus MENOLAK berkas eksekutabel berbahaya (.exe, .sh, .bat)', () => {
      const resExe = validateFileType('virus.exe', 'application/x-msdownload');
      expect(resExe.isValid).toBe(false);
      expect(resExe.message).toContain('tidak diizinkan');

      const resSh = validateFileType('script.sh', 'text/x-shellscript');
      expect(resSh.isValid).toBe(false);
    });

    it('harus MENOLAK skrip berbahaya (.php, .js, .html, .svg)', () => {
      const resPhp = validateFileType('webshell.php', 'application/x-php');
      expect(resPhp.isValid).toBe(false);

      const resHtml = validateFileType('phishing.html', 'text/html');
      expect(resHtml.isValid).toBe(false);

      const resSvg = validateFileType('xss.svg', 'image/svg+xml');
      expect(resSvg.isValid).toBe(false);
    });

    it('harus MENOLAK arsip (.zip, .rar, .tar.gz)', () => {
      const resZip = validateFileType('dokumen.zip', 'application/zip');
      expect(resZip.isValid).toBe(false);
    });

    it('harus memvalidasi daftar lengkap ALLOWED_EXTENSIONS', () => {
      expect(ALLOWED_EXTENSIONS).toEqual(['.pdf', '.docx', '.xlsx', '.jpeg', '.jpg', '.png']);
      expect(ALLOWED_MIME_TYPES.length).toBe(5);
    });
  });
});
