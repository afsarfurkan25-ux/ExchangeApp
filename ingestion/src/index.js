import { config } from './config.js';
import { log } from './logger.js';
import { Registry } from './registry.js';
import { createWriter } from './writer.js';
import { createRateSync } from './rateSync.js';
import { createSocketSource } from './sources/altinapiSocket.js';
import { createRestSource } from './sources/altinapiRest.js';

const registry = new Registry();
const writer = createWriter(registry);   // live_rates: ham piyasa kotaları
const rateSync = createRateSync(registry); // rates: marj uygulanmış, panoda görünen fiyatlar

const ingest = (quotes) => {
    let accepted = 0;
    for (const q of quotes) if (registry.accept(q)) accepted += 1;
    return accepted;
};

// ─── Birincil: Socket.IO ─────────────────────────────────────────────────────
const socketSource = createSocketSource({
    onQuotes: ingest,
    onSuccess: () => registry.reportSuccess('altinapi-socket'),
    onFailure: (err) => registry.reportFailure('altinapi-socket', err),
});

// ─── Yedek: REST ─────────────────────────────────────────────────────────────
// Socket bağlıysa ve devresi kapalıysa yoklama yapma — boşuna istek.
const restSource = createRestSource({
    onQuotes: ingest,
    onSuccess: () => registry.reportSuccess('altinapi-rest'),
    onFailure: (err) => registry.reportFailure('altinapi-rest', err),
    shouldPoll: () => !socketSource.isConnected() || registry.isCircuitOpen('altinapi-socket'),
});

const sources = [socketSource, restSource];
for (const s of sources) registry.register(s.name, s.priority);

log.info('Ingestion servisi başlıyor...');
log.info(`Kaynaklar: ${sources.map((s) => `${s.name}(öncelik ${s.priority})`).join(', ')}`);
log.info(`Eşikler: bayat ${config.staleMs}ms, makas %${config.maxSpreadPct}, sıçrama %${config.maxJumpPct}`);

const sure = (ms) => (ms >= 3600000 ? `${ms / 3600000} sa` : ms >= 60000 ? `${ms / 60000} dk` : `${ms / 1000} sn`);
log.info(
    `Aralıklar: REST yoklama ${sure(config.restPollMs)} | live_rates yazma ${sure(config.writeIntervalMs)} | ` +
    `rates yazma ${sure(config.rateSyncMs)} | ayar tazeleme ${sure(config.configRefreshMs)}`
);

for (const s of sources) s.start();
writer.start();
await rateSync.start();

// Periyodik durum özeti
const statusTimer = setInterval(() => {
    log.info('Durum:', JSON.stringify(registry.summary()));
}, config.statusLogMs);

const shutdown = async (signal) => {
    log.info(`${signal} alındı, kapatılıyor...`);
    clearInterval(statusTimer);
    for (const s of sources) s.stop();
    rateSync.stop();
    await writer.stop();
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => log.error('Yakalanmamış promise hatası:', err));
