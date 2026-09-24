import { config } from './config.js';
import { log, logThrottled } from './logger.js';

/**
 * Kaynak kaydı + son değerler.
 *
 * Kurallar:
 *  - Her kaynağın bir önceliği var (küçük sayı = tercihli).
 *  - Düşük öncelikli bir kaynağın değeri, ancak daha tercihli kaynağın o sembol
 *    için değeri bayatladıysa (veya devresi açıksa) kabul edilir.
 *  - Ardışık hata veren kaynağın devresi artan gecikmeyle açılır; her turda
 *    yeniden denenmez.
 *  - Önceki değere göre aşırı sıçrayan kota reddedilir.
 */
export class Registry {
    constructor() {
        /** @type {Map<string, {name: string, priority: number, failures: number, openUntil: number}>} */
        this.sources = new Map();
        /** @type {Map<string, object>} kanonik sembol -> son kabul edilen kota */
        this.latest = new Map();
        /** @type {Set<string>} son yazmadan beri değişen semboller */
        this.dirty = new Set();
    }

    register(name, priority) {
        this.sources.set(name, { name, priority, failures: 0, openUntil: 0 });
    }

    isCircuitOpen(name) {
        const s = this.sources.get(name);
        return !!s && s.openUntil > Date.now();
    }

    reportSuccess(name) {
        const s = this.sources.get(name);
        if (!s) return;
        if (s.failures > 0) log.info(`Kaynak toparlandı: ${name} (${s.failures} hatadan sonra)`);
        s.failures = 0;
        s.openUntil = 0;
    }

    /** Ardışık hatada 30sn -> 1dk -> 2dk -> 5dk (üst sınır) bekletir. */
    reportFailure(name, err) {
        const s = this.sources.get(name);
        if (!s) return;
        s.failures += 1;
        const backoffs = [30_000, 60_000, 120_000, 300_000];
        const wait = backoffs[Math.min(s.failures - 1, backoffs.length - 1)];
        s.openUntil = Date.now() + wait;
        log.warn(`Kaynak hatası: ${name} (${s.failures}. kez) -> ${wait / 1000}sn bekletiliyor.`, err?.message ?? err);
    }

    /**
     * Bu kaynağın bu sembol için yazma hakkı var mı?
     * Daha tercihli bir kaynak taze veri veriyorsa hayır.
     */
    canWrite(symbol, sourceName) {
        const incoming = this.sources.get(sourceName);
        if (!incoming) return false;

        const current = this.latest.get(symbol);
        if (!current) return true;

        const holder = this.sources.get(current.source);
        if (!holder || holder.priority >= incoming.priority) return true;

        // Tercihli kaynak elinde tutuyor: yalnızca bayatladıysa veya devresi açıksa devral
        const age = Date.now() - new Date(current.received_at).getTime();
        return age > config.staleMs || this.isCircuitOpen(holder.name);
    }

    /** @returns {boolean} kota kabul edildiyse true */
    accept(quote) {
        if (!this.canWrite(quote.symbol, quote.source)) return false;

        const prev = this.latest.get(quote.symbol);
        if (prev) {
            const jumpPct = Math.abs((quote.ask - prev.ask) / prev.ask) * 100;
            if (jumpPct > config.maxJumpPct) {
                logThrottled(`jump:${quote.symbol}`, 30_000, () =>
                    log.warn(`Reddedildi ${quote.symbol}: %${jumpPct.toFixed(1)} sıçrama (${prev.ask} -> ${quote.ask}, kaynak ${quote.source})`)
                );
                return false;
            }
            if (prev.source !== quote.source) {
                log.info(`Kaynak değişti ${quote.symbol}: ${prev.source} -> ${quote.source}`);
            }
            // Değer ve bayatlık aynıysa boşuna yazma
            if (prev.bid === quote.bid && prev.ask === quote.ask && prev.is_stale === quote.is_stale) {
                return false;
            }
        }

        this.latest.set(quote.symbol, { ...quote, received_at: new Date().toISOString() });
        this.dirty.add(quote.symbol);
        return true;
    }

    /** Son yazmadan beri değişenleri verir ve işareti temizler. */
    drainDirty() {
        const out = [];
        for (const symbol of this.dirty) {
            const q = this.latest.get(symbol);
            if (q) {
                const { received_at, ...row } = q;
                out.push({ ...row, updated_at: new Date().toISOString() });
            }
        }
        this.dirty.clear();
        return out;
    }

    /** İzleme için özet. */
    summary() {
        const bySource = {};
        for (const q of this.latest.values()) bySource[q.source] = (bySource[q.source] ?? 0) + 1;
        const stale = [...this.latest.values()].filter((q) => q.is_stale).length;
        return { semboller: this.latest.size, bayat: stale, kaynaklar: bySource };
    }
}
