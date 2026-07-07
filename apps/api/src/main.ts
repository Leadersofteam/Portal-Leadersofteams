import { loadConfig } from './shared/config';
import { buildServer } from './server';

const config = loadConfig();
const ctx = await buildServer(config);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    ctx.app.log.info({ signal }, 'Zamykanie serwera');
    await ctx.close();
    process.exit(0);
  });
}

await ctx.app.listen({ port: config.PORT, host: config.HOST });
