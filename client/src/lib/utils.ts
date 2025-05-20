import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { 
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true
  }).format(date);
}

export function formatDateSimple(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { 
    month: 'numeric',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '…';
}

export function calculateFileSizeDisplay(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2);
}

export function isCobolFile(filename: string): boolean {
  const ext = getFileExtension(filename).toLowerCase();
  return ['cbl', 'cob', 'cobol'].includes(ext);
}

export function downloadFile(data: any, filename: string, type: string): void {
  const blob = type === 'json' 
    ? new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    : new Blob([data], { type: 'text/plain' });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Color mapping for different entity types
export const entityColorMap: Record<string, { bg: string, border: string, text: string }> = {
  Program: { bg: 'bg-blue-600', border: 'border-blue-400', text: 'text-blue-600' },
  Copybook: { bg: 'bg-purple-600', border: 'border-purple-400', text: 'text-purple-600' },
  Database: { bg: 'bg-green-600', border: 'border-green-400', text: 'text-green-600' },
  Table: { bg: 'bg-emerald-600', border: 'border-emerald-400', text: 'text-emerald-600' },
  Screen: { bg: 'bg-amber-600', border: 'border-amber-400', text: 'text-amber-600' },
  File: { bg: 'bg-indigo-600', border: 'border-indigo-400', text: 'text-indigo-600' },
  DataArea: { bg: 'bg-rose-600', border: 'border-rose-400', text: 'text-rose-600' },
  Paragraph: { bg: 'bg-teal-600', border: 'border-teal-400', text: 'text-teal-600' },
  Section: { bg: 'bg-cyan-600', border: 'border-cyan-400', text: 'text-cyan-600' },
  Module: { bg: 'bg-orange-600', border: 'border-orange-400', text: 'text-orange-600' },
  External: { bg: 'bg-gray-600', border: 'border-gray-400', text: 'text-gray-600' }
};

export function getEntityColorMap() {
  return entityColorMap;
}
