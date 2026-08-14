// Puls workera (GO-LIVE-CHECKLIST §1). Worker to proces BullMQ BEZ portu HTTP,
// więc sonda `fetch` jak w api/web nie ma tu zastosowania — dowodem życia jest
// świeży klucz w Redisie, który worker odnawia, a healthcheck czyta.
//
// DLACZEGO to jest ważniejsze niż wygląda: śmierć workera nie daje ŻADNEGO
// sygnału. `docker ps` pokazuje „Up", API odpowiada 200, a portal po cichu
// przestaje działać — wpisy nie pojawiają się w feedzie (jest materializowany
// z outboxa), powiadomienia nie przychodzą, punkty nie dojrzewają. Objawem jest
// CISZA, czyli najgorszy możliwy rodzaj awarii do zdiagnozowania po fakcie.
import type { Redis } from './redis';

export const WORKER_HEARTBEAT_KEY = 'portal:worker:heartbeat';
// TTL > 2 × interwał: pojedynczy zgubiony zapis (chwilowy timeout Redisa) nie
// może wywrócić healthchecku, dopiero utrzymujący się brak pulsu.
export const WORKER_HEARTBEAT_TTL_SECONDS = 60;
export const WORKER_HEARTBEAT_INTERVAL_MS = 15_000;
// Powyżej tego czasu bez obrotu pętli uznajemy dispatcher za zakleszczony.
// Musi zostawiać zapas nad POLL_INTERVAL_MS (1 s) i nad ścieżką błędu (5 s).
export const WORKER_LOOP_STALE_MS = 45_000;

export interface WorkerHeartbeat {
  stop(): void;
}

/**
 * Uruchamia bicie pulsu. `isLoopAlive` MUSI raportować stan PĘTLI DISPATCHERA,
 * a nie samego procesu.
 *
 * PUŁAPKA, którą ten warunek obchodzi: zwykły `setInterval` piszący klucz
 * dowodzi wyłącznie, że proces Node żyje. Dispatcher zakleszczony na wiszącym
 * zapytaniu do MySQL nadal by „bił", więc healthcheck świeciłby na zielono
 * dokładnie przy tej awarii, którą ma łapać. Puls ma dowodzić PRACY, nie
 * obecności — dlatego przy zastoju pętli świadomie NIE odnawiamy klucza
 * i pozwalamy mu wygasnąć.
 */
export function createWorkerHeartbeat(
  redis: Redis,
  isLoopAlive: () => boolean,
  log?: (event: string, data: Record<string, unknown>) => void,
): WorkerHeartbeat {
  let stale = false;

  async function beat() {
    if (!isLoopAlive()) {
      // Logujemy tylko zbocze, żeby zakleszczenie nie zalało logów co 15 s.
      if (!stale) {
        stale = true;
        log?.('worker.heartbeat_stale', { key: WORKER_HEARTBEAT_KEY });
      }
      return;
    }
    if (stale) {
      stale = false;
      log?.('worker.heartbeat_recovered', { key: WORKER_HEARTBEAT_KEY });
    }
    try {
      await redis.set(
        WORKER_HEARTBEAT_KEY,
        new Date().toISOString(),
        'EX',
        WORKER_HEARTBEAT_TTL_SECONDS,
      );
    } catch (err) {
      // Nie wywracamy workera z powodu pulsu — brak zapisu sam się objawi
      // wygaśnięciem klucza, co jest prawdziwą informacją („Redis nieosiągalny”).
      log?.('worker.heartbeat_error', {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  void beat();
  const timer = setInterval(() => void beat(), WORKER_HEARTBEAT_INTERVAL_MS);
  return {
    stop() {
      clearInterval(timer);
    },
  };
}

export interface WorkerHeartbeatStatus {
  alive: boolean;
  lastBeatAt: string | null;
}

/** Odczyt pulsu — używany przez /healthz (informacyjnie) i przez diagnostykę. */
export async function readWorkerHeartbeat(redis: Redis): Promise<WorkerHeartbeatStatus> {
  try {
    const value = await redis.get(WORKER_HEARTBEAT_KEY);
    return { alive: value !== null, lastBeatAt: value };
  } catch {
    return { alive: false, lastBeatAt: null };
  }
}
