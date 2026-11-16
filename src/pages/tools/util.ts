import { useEffect, useState } from 'react';

/** Unique id; falls back when `crypto.randomUUID` is unavailable (insecure contexts, old browsers). */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Current time, refreshed every `intervalMs` and whenever the tab becomes visible again. */
export function useNow(intervalMs = 1000, active = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [intervalMs, active]);
  return now;
}

/** `mm:ss`, or `h:mm:ss` from one hour on. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pair = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pair(minutes)}:${pair(seconds)}` : `${pair(minutes)}:${pair(seconds)}`;
}

/** "45 min", "1 h 05 min" or "<1 min". */
export function formatDuration(ms: number): string {
  if (ms <= 0) return '0 min';
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return '<1 min';
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
}

export const formatPercent = (rate: number | null): string => (rate === null ? '—' : `${Math.round(rate * 100)}%`);
export const formatDate = (timestamp: number): string => new Date(timestamp).toLocaleDateString('pt-BR');
export const formatDateTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
export const formatLongDate = (timestamp: number): string =>
  new Date(timestamp).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

/** `YYYY-MM-DD` to `DD/MM/YYYY` without going through Date (no time-zone shift). */
export function formatDue(due: string): string {
  const [year, month, day] = due.split('-');
  return year && month && day ? `${day}/${month}/${year}` : due;
}

export const plural = (count: number, one: string, many: string): string => (count === 1 ? one : many);

/** Offers `text` as a file download; the object URL is released after the browser starts the download. */
export function downloadText(filename: string, text: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const todayStamp = (): string => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
