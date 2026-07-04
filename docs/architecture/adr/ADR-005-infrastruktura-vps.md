# ADR-005: Infrastruktura — współdzielony VPS na start, migracja przy skalowaniu

**Status:** Zaakceptowany
**Data:** 2026-07-04
**Decydenci:** Maciej Kucharski (decyzja: bez drugiego VPS na starcie), Fable 5 (realizacja techniczna)

## Kontekst

Istniejący VPS Hostinger (srv1418832.hstgr.cloud) hostuje app.leadersofteams.com (Docker Compose + Traefik + MySQL). Właściciel zdecydował: portal startuje na tym samym VPS; nowy serwer dopiero przy skalowaniu. Wymóg briefu: 10 000 aktywnych użytkowników, jasna ścieżka skalowania bez przepisywania.

## Decyzja 1: Topologia na start (1 współdzielony VPS)

Portal działa jako **osobny projekt Docker Compose** (`portal/docker-compose.yml`), dopięty do istniejącego Traefika przez współdzieloną sieć docker (`traefik_public`):

```
VPS srv1418832 (współdzielony)
├── traefik (istniejący) ─ routing: leadersofteams.pl → portal-web / api.leadersofteams.pl → portal-api
├── [stack app.leadersofteams.com — bez zmian]
└── [stack portalu — nowy projekt compose]
    ├── portal-web      (Next.js)          limity: 1.5 cpu / 1.5 GB
    ├── portal-api      (Fastify)          limity: 2 cpu / 1.5 GB
    ├── portal-worker   (BullMQ)           limity: 1 cpu / 768 MB
    ├── portal-mysql    (MySQL 8, własny wolumen)   limity: 2 cpu / 3 GB
    └── portal-redis    (Redis 7, AOF)     limity: 0.5 cpu / 768 MB
```

- **Własny kontener MySQL z osobnym wolumenem** — nie współdzielimy instancji MySQL z app. Spełnia to literalnie wymóg briefu "dwie osobne bazy danych" i czyni przyszłą migrację przeniesieniem kontenera + wolumenu, a nie operacją na wspólnej bazie. Koszt: ~1 GB RAM na drugą instancję — akceptowalny.
- **Twarde limity zasobów (`cpus`, `mem_limit`) na każdym kontenerze portalu** — otwarta rejestracja portalu oznacza nieprzewidywalny ruch; limity gwarantują, że skok nie zagłodzi app.leadersofteams.com (i odwrotnie: stack app powinien dostać analogiczne limity — rekomendacja poza zakresem tego repo).
- Wymaganie sprzętowe dla komfortu obu stacków: **min. 8 vCPU / 16 GB RAM / NVMe**. Jeśli obecny plan VPS jest mniejszy, upgrade planu (bez migracji) jest pierwszym krokiem przed launchem.

## Decyzja 2: Czy to uniesie 10 000 użytkowników?

Realny profil obciążenia: 10k aktywnych ≈ 500–1500 sesji dziennie ≈ **200–500 równoczesnych** w szczycie; ruch zdominowany przez odczyty (listingi, profile, wątki Q&A) — świetnie cache'owalne (ADR-007). Szacunek pojemności: Fastify na 2 vCPU obsługuje tysiące prostych req/s; wąskim gardłem będzie MySQL przy złych zapytaniach, nie warstwa HTTP. Wnioski projektowe: budżet wydajnościowy (p95 < 300 ms dla stron publicznych z cache, < 800 ms dla zapytań zalogowanych), obowiązkowy test obciążeniowy k6 przed launchem symulujący 500 równoczesnych użytkowników na współdzielonej maszynie **przy działającym stacku app**.

## Decyzja 3: Ścieżka skalowania (bez przepisywania czegokolwiek)

| Etap | Trigger (progi) | Ruch |
|---|---|---|
| 0. Wspólny VPS (start) | — | jak wyżej |
| 1. Portal na własny VPS | stały CPU > 60% lub RAM > 80% na wspólnej maszynie, albo wzajemne zakłócenia w monitoringu | `docker compose down` → przeniesienie wolumenów (mysqldump/rsync) → `up` na nowej maszynie → zmiana DNS. Przestój ≤ 30 min, zero zmian w kodzie |
| 2. Rozdział danych | MySQL/Redis konkurują z aplikacją o CPU/IO | DB + Redis na osobny VPS (zmiana connection stringów) |
| 3. Repliki aplikacji | api p95 przekracza budżet przy zdrowej bazie | 2–3 repliki `portal-api`/`portal-web` za Traefikiem; **bez sticky sessions** — sesje w Redis, Socket.IO z adapterem Redis od dnia 1 |
| 4. Dalej | dopiero przy wielokrotności 10k | read-repliki MySQL, wydzielenie modułów (umożliwione przez ADR-002) |

Architektura aplikacji jest **od dnia 1 bezstanowa** (stan wyłącznie w MySQL/Redis) — dlatego każdy etap to operacja infrastrukturalna, nie programistyczna.

## Decyzja 4: Backup i odtwarzanie

- Nocny `mysqldump` (a po przekroczeniu ~10 GB danych: XtraBackup) + kopie wolumenu Redis (AOF) → szyfrowane wysyłki na zewnętrzny storage (S3-compatible, poza Hostingerem).
- Cel: **RPO ≤ 24 h, RTO ≤ 4 h**; procedura restore opisana w runbooku i testowana raz na kwartał (restore na kontener tymczasowy + smoke test).
- Pojedynczy VPS pozostaje świadomie zaakceptowanym SPOF na etapie startu (RISKS.md, R-07).

## Konsekwencje

- (+) Zero kosztu nowej maszyny na start; wykorzystanie istniejącego Traefika i doświadczenia operacyjnego z app.
- (+) Migracja na własny VPS w etapie 1 jest zaplanowana i tania — decyzja właściciela "nowy VPS przy skalowaniu" ma gotowy, mierzalny trigger.
- (−) Współdzielenie maszyny sprzęga awarie sprzętowe obu systemów i wymaga dyscypliny limitów — mitygacja: limity cgroup + monitoring per kontener (node exporter + cAdvisor lub Netdata) z alertami.
