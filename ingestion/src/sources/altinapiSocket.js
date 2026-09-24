import { io } from 'socket.io-client';
import { config } from '../config.js';
import { log } from '../logger.js';
import { normalizeBatch } from '../normalize.js';

export const SOURCE_NAME = 'altinapi-socket';

/**
 * Birincil kaynak: altinapi.com Socket.IO akışı.
 * Push olduğu için gecikme düşük ve bağlantı koptuğunda bunu anında biliriz —
 * yoklamada "veri mi değişmedi, kaynak mı öldü" ayrımı yapılamaz.
 */
export function createSocketSource({ onQuotes, onFailure, onSuccess }) {
    let socket = null;
    let liveState = 'unknown'; // 'live' | 'stale' | 'unknown'

    const handlePayload = (payload, label) => {
        // Sağlayıcı bazen dizi, bazen {data: [...]}, bazen tek nesne gönderiyor
        const rows = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
                ? payload.data
                : payload && typeof payload === 'object'
                    ? [payload]
                    : [];

        if (rows.length === 0) return;

        const { accepted, rejected } = normalizeBatch(rows, SOURCE_NAME);
        if (accepted.length > 0) {
            // Sağlayıcı "veri güncellenmemiş" dediyse hepsini bayat işaretle
            const quotes = liveState === 'stale'
                ? accepted.map((q) => ({ ...q, is_stale: true }))
                : accepted;
            onQuotes(quotes);
            onSuccess();
        }
        if (rejected.length > 0) {
            log.warn(`${label}: ${rejected.length} satır reddedildi ->`,
                rejected.map((r) => `${r.symbol}(${r.reason})`).join(', '));
        }
    };

    const start = () => {
        socket = io(config.altinapi.url, {
            auth: { api_key: config.altinapi.key },
            reconnection: true,
            reconnectionDelay: 2000,
            reconnectionDelayMax: 30_000,
        });

        socket.on('connect', () => {
            log.info(`${SOURCE_NAME}: bağlandı (${socket.id})`);
            socket.emit('subscribe', config.altinapi.categories);
            onSuccess();
        });

        socket.on('prices:snapshot', (d) => handlePayload(d, 'snapshot'));
        socket.on('prices:update', (d) => handlePayload(d, 'update'));

        socket.on('data:live', () => {
            liveState = 'live';
            log.info(`${SOURCE_NAME}: veri canlı`);
        });
        socket.on('data:stale', () => {
            liveState = 'stale';
            log.warn(`${SOURCE_NAME}: sağlayıcı veriyi bayat bildirdi`);
        });

        socket.on('connect_error', (err) => onFailure(err));
        socket.on('disconnect', (reason) => {
            log.warn(`${SOURCE_NAME}: bağlantı koptu (${reason})`);
            onFailure(new Error(`disconnect: ${reason}`));
        });
    };

    const stop = () => {
        socket?.removeAllListeners();
        socket?.disconnect();
        socket = null;
    };

    return { name: SOURCE_NAME, priority: 1, start, stop, isConnected: () => !!socket?.connected };
}
