import { useSyncExternalStore } from 'react';
import { fr } from './fr';

export type Locale = 'fr' | 'en';
export const LANGUAGE_STORAGE_KEY = 'xyzdsl-language';
export function readLocale(): Locale {
  try { return localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'en' ? 'en' : 'fr'; }
  catch { return 'fr'; }
}
let locale: Locale = readLocale();
const listeners = new Set<() => void>();
export const getLocale = () => locale;
function publish(next: Locale) {
  locale = next;
  if (typeof document !== 'undefined') document.documentElement.lang = next;
  listeners.forEach(listener => listener());
}
export function setLocale(next: Locale) {
  try { localStorage.setItem(LANGUAGE_STORAGE_KEY, next); } catch { /* Session choice still works when storage is unavailable. */ }
  publish(next);
}
export function initializeLocale() {
  publish(readLocale());
  const sync = (event: StorageEvent) => {
    if (event.key === LANGUAGE_STORAGE_KEY || event.key === null) publish(readLocale());
  };
  window.addEventListener('storage', sync);
  return () => window.removeEventListener('storage', sync);
}
export function useLocale() {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, getLocale, () => 'fr' as const);
}
export function t(message: string, values: Record<string, string | number> = {}): string {
  const translated = locale === 'fr' ? (fr[message] ?? message) : message;
  return translated.replace(/\{(\w+)\}/g, (placeholder, key: string) => String(values[key] ?? placeholder));
}
