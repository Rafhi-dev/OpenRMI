import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRmiScore(score: number | null | undefined): string {
  if (score === null || score === undefined || isNaN(score)) return '-';
  return Number(score).toFixed(2);
}

export function getMaturityColor(score: number | null | undefined): string {
  if (!score) return 'text-slate-400';
  if (score < 2.0) return 'text-rmi-awal';
  if (score < 3.0) return 'text-rmi-berkembang';
  if (score < 4.0) return 'text-rmi-baik';
  if (score < 5.0) return 'text-rmi-lebihbaik';
  return 'text-rmi-terbaik';
}
