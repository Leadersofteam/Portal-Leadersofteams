// Czyste pomocniki V17 „Światło” (bez Reacta): formatowanie, kolory z nazwy, postęp szczebla.
// Progi i nazwy szczebli bierzemy z lib/levels.ts (lustro rules.ts) — NIE kopiujemy liczb z makiety.
import { LEVEL_RULES_FALLBACK, type LevelRule } from '@/lib/levels';

export const nf = (x: number) => x.toLocaleString('pl-PL').replace(/\s/g, ' ');

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter((w) => /^[A-ZĄĆĘŁŃÓŚŹŻ]/.test(w))
      .slice(0, 2)
      .map((w) => w[0])
      .join('') ||
    name.slice(0, 1).toUpperCase() ||
    '•'
  );
}

// Ten sam odcień dla tej samej nazwy — „kto dał światło” ma stałą twarz między ekranami.
export function hue(s: string): number {
  return [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
}

export function levelsOrFallback(levels: LevelRule[] | null | undefined): LevelRule[] {
  return levels && levels.length === 7 ? levels : LEVEL_RULES_FALLBACK;
}

// Ułamek drogi od progu bieżącego szczebla do następnego (0 przy L7 i bez poziomu).
export function progress(level: number, total: number, rules: LevelRule[]): number {
  if (level < 0 || level >= 7) return 0;
  const from = level === 0 ? 0 : (rules[level - 1]?.pointsRequired ?? 0);
  const to = rules[level]?.pointsRequired ?? from;
  if (to <= from) return 0;
  return Math.min(1, Math.max(0, (total - from) / (to - from)));
}

export function timeAgo(iso: string | Date, now = new Date()): string {
  const d = new Date(iso);
  const min = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (min < 1) return 'teraz';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24 && d.toDateString() === now.toDateString()) return `${h} godz.`;
  const days = Math.floor(
    (now.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86_400_000,
  );
  if (days <= 1) return 'wczoraj';
  if (days < 30) return `${days} dni`;
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
}

export function budget(min: number, max: number): string {
  const k = (v: number) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}`.replace('.', ',') : String(v));
  if (min >= 1000 && max >= 1000) return `${k(min)}–${k(max)} tys. zł`;
  return `${nf(min)}–${nf(max)} zł`;
}

export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const t = n % 10;
  const h = n % 100;
  return t >= 2 && t <= 4 && !(h >= 12 && h <= 14) ? few : many;
}

// Punkty bazowe za ocenę — jawna reguła z rules.ts (basePointsForRating): 5→100, 4→80, 3→40, reszta 0.
// Uwaga: to BAZA. Wagi (kolejna ocena od tej samej firmy ×0,5ⁿ, młoda firma ×0,5) żyją w księdze
// Lidera, która jest prywatna (PL3) — dlatego ekrany publiczne pokazują bazę i tak ją opisują.
export function basePoints(rating: number): number {
  return rating >= 5 ? 100 : rating === 4 ? 80 : rating === 3 ? 40 : 0;
}

// „3 dni temu”, „2 tyg. temu”, „4 mies. temu” — zawsze względnie (lista zleceń nie pokazuje dat). „teraz” i „wczoraj” bez „temu”.
export function temu(iso: string | Date, now = new Date()): string {
  const d = new Date(iso);
  const dni = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (dni >= 30) {
    if (dni < 60) return `${Math.floor(dni / 7)} tyg. temu`;
    if (dni < 730) return `${Math.floor(dni / 30)} mies. temu`;
    return `${Math.floor(dni / 365)} lat temu`;
  }
  const t = timeAgo(d, now);
  return /(min|godz\.|dni)$/.test(t) ? `${t} temu` : t;
}

// „dodane wczoraj, 16:40” — względnie plus godzina (strefa Polski, niezależnie od strefy serwera).
export function dodaneGodz(iso: string | Date, now = new Date()): string {
  const d = new Date(iso);
  const godz = d.toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Warsaw',
  });
  const dzien = (x: Date) => x.toLocaleDateString('sv-SE', { timeZone: 'Europe/Warsaw' });
  const wczoraj = new Date(now.getTime() - 86_400_000);
  const rel =
    dzien(d) === dzien(now) ? 'dziś' : dzien(d) === dzien(wczoraj) ? 'wczoraj' : temu(d, now);
  return `${rel}, ${godz}`;
}
