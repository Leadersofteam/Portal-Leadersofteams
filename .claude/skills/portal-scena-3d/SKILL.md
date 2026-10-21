---
name: portal-scena-3d
description: Budowa i zmiana sceny 3D (pole cząstek WebGL) w Portalu LoT — drabinka 3D w hero, nowe sceny na stronach publicznych, płynne przejścia sterowane przewijaniem, ADR-009 (zero sieci), tokeny --level-*, SVG jako stan bez WebGL, weryfikacja filmem klatek 390 + 1440. Użyj przy pracy nad `components/ui/ladder-scene.tsx`, `components/scene/` albo gdy użytkownik mówi „3D", „scena", „cząsteczki", „particles", „WebGL", „przejścia", „płynność", „drabinka w 3D".
---

# Scena 3D Portalu — „Drabinka w przestrzeni"

Kanon kierunku: **`docs/KIERUNEK-3D.md`** (kopia z leadersofteams.com). Miny: `docs/MINY.md` → „Scena 3D".

## Reguły twarde

1. **ADR-009.** Silnik to własny WebGL (`components/scene/particleField.ts`), zero CDN, zero fetchy.
   three.js, Spline, Lottie z sieci — nie. Ikony i ilustracje dalej rysujemy sami.
2. **ADR-010 dotyczy też ruchu.** Scena nie może nagradzać obecności: żadnego licznika, streaku,
   „pulsowania, gdy ktoś coś zrobił". Ruch opowiada regułę produktu (status się zdobywa), nie aktywność.
3. **Punkt = poziom**, kolor = `--level-1…7` (te same tokeny co `LevelBadge`). Bursztyn tylko na szczycie.
4. **SVG `LadderArt` zostaje w DOM-ie zawsze** i gaśnie dopiero po `onReady` (`data-scene="on"`).
5. **Komponent sceny to `'use client'`** z dynamicznym `import()` silnika w `useEffect` — strona główna
   zostaje komponentem serwerowym, a kanwa nie istnieje w HTML-u z serwera.
6. Silnik ma trzy kopie (Portal, App, .com = kanon) + `FIELD_VERSION`. **Typecheck Portalu jest najostrzejszy**
   (`noUncheckedIndexedAccess`) — poprawki rób w kanonie, potem kopiuj.

## Weryfikacja

```bash
pnpm format && pnpm lint && pnpm --filter @lot/web typecheck
cd apps/web && npx next build && npx next start --port 3011 &
CHROMIUM_PATH=/opt/pw-browsers/chromium node ../../.claude/skills/portal-scena-3d/film.mjs \
  http://127.0.0.1:3011/ /tmp/portal 1440 900 0 600 300      # + 390 × 844, REDUCE=1
```

Pełny rytm sprintu dalej obowiązuje: `portal-bramki` (realny MySQL/Redis, e2e) → `portal-zrzuty` → staging → prod.
Na arkuszu: drabina kompletna przy 0 px, wspinaczka widoczna przy ~300 px, SVG niewidoczny pod sceną, konsola czysta.
