import type { Server as HttpServer } from 'node:http';

import { Server as IOServer } from 'socket.io';

import type { AppConfig } from './config';
import { createRedis } from './redis';
import type { SessionStore } from './session';

// Realtime — Socket.IO jako CZYSTY SYGNAŁ (ADR-007 dec. 3): socket niesie tylko
// „coś się zmieniło", dane zawsze dociągane REST-em. Ścieżka:
//   worker zapisuje Notification → publish na kanał Redis `rt` →
//   proces api (ten subscriber) → io.to(`user:{id}`).emit('notification').
//
// Path pod `/api/socket.io/` — jedzie tym samym same-origin rewrite co REST
// (cookies sesyjne działają, zero CORS); przy proxy bez upgrade WS Socket.IO
// spada do long-pollingu (celowo wybrane w ADR-007 dla klientów B2B za proxy).
export const REALTIME_CHANNEL = 'rt';
export const REALTIME_PATH = '/api/socket.io/';

interface RealtimeSignal {
  userId: string;
  kind: string;
}

function readCookie(raw: string | undefined, name: string): string | undefined {
  if (!raw) return undefined;
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

export interface Realtime {
  io: IOServer;
  close(): Promise<void>;
}

export function createRealtime(
  httpServer: HttpServer,
  sessions: SessionStore,
  config: Pick<AppConfig, 'SESSION_COOKIE_NAME' | 'REDIS_URL'>,
): Realtime {
  const io = new IOServer(httpServer, {
    path: REALTIME_PATH,
    serveClient: false,
    // Rozmiar payloadu i tak minimalny (tylko sygnał); domyślne limity OK.
  });

  // Uwierzytelnienie handshake sesyjnym cookie — bez sesji brak pokoju.
  io.use(async (socket, next) => {
    try {
      const sessionId = readCookie(socket.handshake.headers.cookie, config.SESSION_COOKIE_NAME);
      const user = sessionId ? await sessions.get(sessionId) : null;
      if (!user) return next(new Error('unauthorized'));
      socket.data.userId = user.id;
      next();
    } catch (err) {
      next(err as Error);
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    void socket.join(`user:${userId}`);
  });

  // Dedykowane połączenie w trybie subscribe (nie może dzielić klienta komend).
  const subscriber = createRedis(config.REDIS_URL);
  void subscriber.subscribe(REALTIME_CHANNEL);
  subscriber.on('message', (_channel, message) => {
    try {
      const { userId, kind } = JSON.parse(message) as RealtimeSignal;
      io.to(`user:${userId}`).emit(kind || 'notification');
    } catch {
      /* zignoruj nieparsowalny sygnał */
    }
  });

  return {
    io,
    async close() {
      await io.close();
      subscriber.disconnect();
    },
  };
}
