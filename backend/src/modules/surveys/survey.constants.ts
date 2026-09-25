export interface SurveyQuestion {
  id: number;
  category: 'TONE_FROM_TOP' | 'ACCOUNTABILITY' | 'COMMUNICATION' | 'DECISION_MAKING' | 'INCENTIVES';
  categoryLabel: string;
  questionText: string;
  description: string;
}

export const DEFAULT_RISK_CULTURE_QUESTIONS: SurveyQuestion[] = [
  {
    id: 1,
    category: 'TONE_FROM_TOP',
    categoryLabel: 'Keteladanan Pimpinan (Tone from the Top)',
    questionText: 'Dewan Direksi dan pimpinan secara nyata menunjukkan komitmen dan konsistensi terhadap pengelolaan risiko dalam setiap arahan strategis.',
    description: '1 = Sangat Tidak Setuju, 5 = Sangat Setuju',
  },
  {
    id: 2,
    category: 'ACCOUNTABILITY',
    categoryLabel: 'Akuntabilitas Risiko',
    questionText: 'Setiap fungsi/unit kerja memahami peran dan tanggung jawabnya sebagai risk owner dalam mengidentifikasi dan memitigasi risiko.',
    description: '1 = Sangat Tidak Setuju, 5 = Sangat Setuju',
  },
  {
    id: 3,
    category: 'COMMUNICATION',
    categoryLabel: 'Keterbukaan Komunikasi & Eskalasi',
    questionText: 'Terdapat budaya keterbukaan dan lingkungan yang aman (no-blame culture) untuk melaporkan potensi risiko, insiden, atau kegagalan kontrol secara transparan.',
    description: '1 = Sangat Tidak Setuju, 5 = Sangat Setuju',
  },
  {
    id: 4,
    category: 'DECISION_MAKING',
    categoryLabel: 'Pengambilan Keputusan Berbasis Risiko',
    questionText: 'Profil risiko dan kajian mitigasi selalu dijadikan dasar pertimbangan utama sebelum mengeksekusi proyek atau inisiatif bisnis baru.',
    description: '1 = Sangat Tidak Setuju, 5 = Sangat Setuju',
  },
  {
    id: 5,
    category: 'INCENTIVES',
    categoryLabel: 'Pemberian Reward & Konsekuensi',
    questionText: 'Perusahaan memberikan apresiasi atas kepatuhan terhadap manajemen risiko dan menerapkan konsekuensi yang tegas terhadap pelanggaran risk appetite.',
    description: '1 = Sangat Tidak Setuju, 5 = Sangat Setuju',
  },
];
