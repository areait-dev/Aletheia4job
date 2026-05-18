import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getScoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return '';
  if (score >= 80) return 'bg-emerald-500/15 text-emerald-600 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-800';
  if (score >= 50) return 'bg-amber-500/15 text-amber-600 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-800';
  return 'bg-red-500/15 text-red-600 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-800';
}

export function getScoreLabel(score: number | null | undefined): string {
  if (score === null || score === undefined) return '';
  if (score >= 80) return 'Alto';
  if (score >= 50) return 'Medio';
  return 'Basso';
}
