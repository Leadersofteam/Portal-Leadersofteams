# Portal LOT — następna sesja (jeden ekran)

## Stan (zmierzony 25.11 ~16:35 UTC)

- Prod web = `3787e5b` (api+worker bez zmian, `d8c6834`), gałąź `feat/v17-portal` +104 vs main, brak z main 0, wypchnięta.
  `healthz`: mysql/redis ok, `worker.alive` true, uploads ok. Rollback web: obraz `portal-web:przed-flaga-on-2511`.
- **V17 „Światło” (`/feed`, `/profil/[handle]`, `/drabinka`) WŁĄCZONE DLA WSZYSTKICH** (Maciej 25.11). Opt-out `?wyglad=off`
  (ciasteczko `lot_wyglad=off`). Zmierzone: bez ciasteczka HTML `/drabinka` ma klasy `v17`, z `off` — nie; bio w lewej = 2 linie.
- Makieta **P1 „Rynek”** zaakceptowana („Akceptuję Rynek”, `docs/PROGRAM-V17-PORTAL.md`), źródło
  `docs/redesign-propozycje/v17/pro/{zlecenia,zlecenie,uslugi,usluga}.html`, zrzuty `audyt/zrzuty/v17-p1-*.png` (64). Kodu P1 brak.
- Szkice „Pierwszy Krąg”: `docs/PIERWSZY-KRAG-SZKICE.md` (20 osób, wysyła Maciej). Realni użytkownicy: 2, wejścia z Google: 0.
- Dysk 86 % (14 GB wolne); cache budowy 14,3 GB — `--max-used-space 4GB` odzyskał tylko 0,04 GB (reszta współdzielona z obrazami).

## Zadania w kolejności

1. **Kod P1 „Rynek” za flagą** (sesja Sonnet, worktree z `feat/v17-portal`): trasy `app/v17/{zlecenia,uslugi}` + rewrite
   w `V17_ROUTES` (`apps/web/middleware.ts`), 1:1 z makietą; kółka wyboru oferty ≥ 44 px (uwaga z akceptacji).
   Potem `zgodnosc-makiety` ZGODNY w 4 parach × 4 ekrany → `portal-bramki` → wdrożenie.
2. Przejść ścieżką na prodzie V17 jako zalogowany Lider (feed → profil → Drabinka) na telefonie; konto testowe posprzątać.
3. Miara Pierwszego Kręgu po 14 dniach (≥ 5 z 20: profil + usługa albo odpowiedź), etapy w `lejek-tworcow.csv`.
4. Scena 3D na telefonie: TBT `/` 394–1002 ms (CPU ×4) — pomiar na prawdziwym telefonie.
5. Dziura w analityce 30.09–14.10 — czy nie działał zapis, czy Portal.

## Czeka na właściciela

- D5 Search Console + Bing (DNS, sitemap) — 10 min. 3–5 prawdziwych zleceń HydroSpark. D3 purge demo (25.11: „nie teraz”).
- Wysłanie 20 wiadomości Pierwszego Kręgu.
- Gałęzie do zamknięcia (wchłonięte): `claude/charming-mcclintock-043cc3`, `claude/dazzling-bose-0da725`,
  `claude/v17-p0-domkniecie-fd4ade`, `claude/v17-p1-makieta-f98340`, `claude/youthful-grothendieck-7ef708`,
  `docs/program-droga-lidera`, `feat/droga-lidera-pl0-pl1`, `feat/s12-widziec-i-reagowac`, `fix/ux-fala2-2110`, `fix/ux-szybkie-2110`.
- Workflow `.github/workflows/deploy-staging.yml` sprzeczny z „wdrożenia ręczne” — decyzja przed PR do main.

## Czego nie robić

- Kodu V17 poza zaakceptowanymi makietami (P0 „Światło”, P1 „Rynek”). `pnpm lint` = eslint + lint-tokens.
- `loading.tsx` tylko obok page.tsx listy, nigdy nad `[id]`/`[slug]`/`[handle]` (200 zamiast 404).
- Nie wdrażaj `main` wprost — `feat/v17-portal`. Pierwsze sekundy po starcie `web` potrafią dać 404 — mierz po `healthy` + 10 s.
- `docker builder prune` tylko pod `vps-kolejka.sh budowa --`; pełne `-af` kasuje cache trzem repo. Po budowie czytaj `po-budowie:`
  (sprzątanie zdejmuje starsze tagi — sprawdź, że został obraz do wycofania).

## Prompt startowy

Jesteś Liderem Portalu LOT (Opus, repo /docker/portal-staging, gałąź feat/v17-portal). Skill `portal-lider-dnia`, potem punkt 1:
kod P1 „Rynek” za flagą przez sesję Sonnet, 1:1 z zaakceptowaną makietą; każde „zrobione” weryfikujesz własnym pomiarem.
