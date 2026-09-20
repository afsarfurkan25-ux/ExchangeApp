import { config } from '../config.js';
import { log } from '../logger.js';
import { normalizeBatch } from '../normalize.js';

export const SOURCE_NAME = 'altinapi-rest';

/**
 * Yedek kaynak: aynı sağlayıcının REST ucu.
 * Socket kopuk veya devresi açıkken devreye girer; socket sağlamken
 * yazdığı değerler Registry tarafından zaten reddedilir (öncelik 2).
 * Header adı deneyerek doğrulandı: X-API-Key (Bearer/apikey 401 veriyor).
 */
export function createRestSource({ onQuotes, onFailure, onSuccess, shouldPoll }) {
    let timer = null;

    const poll = async () => {
        if (!shouldPoll()) return;

        try {
            const controller = new AbortController();
            const t = setTimeout(() => controller.abort(), 15_000);
            const res = await fetch(`${config.altinapi.url}/api/v1/prices`, {
                headers: { 'X-API-Key': config.altinapi.key },
                signal: controller.signal,
            });
            clearTimeout(t);

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const body = await res.json();
            const { accepted, rejected } = normalizeBatch(body?.data, SOURCE_NAME);

            if (accepted.length === 0) throw new Error('kabul edilebilir satır yok');

            onQuotes(accepted);
            onSuccess();
            if (rejected.length > 0) {
                log.warn(`${SOURCE_NAME}: ${rejected.length} satır reddedildi ->`,
                    rejected.map((r) => `${r.symbol}(${r.reason})`).join(', '));
            }
        } catch (err) {
            onFailure(err);
        }
    };

    return {
        name: SOURCE_NAME,
        priority: 2,
        start: () => {
            poll();
            timer = setInterval(poll, config.restPollMs);
        },
        stop: () => {
            if (timer) clearInterval(timer);
            timer = null;
        },
    };
}
