import { config, UPSTREAM_TO_CANONICAL, SYMBOL_MAP } from './config.js';

const toNumber = (v) => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }
    return null;
};

/**
 * Ham altinapi satırını kanonik bir kota çevirir ve sağlamlığını denetler.
 * Kaynak 305 sembolün %35'inde bozuk değer döndürüyor (bid>ask, sıfır,
 * negatif, %79 makas), bu yüzden filtre isteğe bağlı değil.
 *
 * @returns {{ok: true, quote: object} | {ok: false, reason: string, symbol: string}}
 */
export function normalizeRow(raw, sourceName) {
    const upstream = raw?.symbol;
    if (typeof upstream !== 'string') return { ok: false, reason: 'sembol yok', symbol: '?' };

    // DS_ önekli satırlar aynı verinin ikinci kopyası (171 adet)
    if (upstream.startsWith('DS_')) return { ok: false, reason: 'kopya (DS_)', symbol: upstream };

    const canonical = UPSTREAM_TO_CANONICAL[upstream];
    if (!canonical) return { ok: false, reason: 'haritada yok', symbol: upstream };

    const bid = toNumber(raw.bid);
    const ask = toNumber(raw.ask);
    if (bid === null || ask === null) return { ok: false, reason: 'sayısal olmayan bid/ask', symbol: upstream };
    if (bid <= 0 || ask <= 0) return { ok: false, reason: 'sıfır/negatif', symbol: upstream };
    if (bid > ask) return { ok: false, reason: `bid>ask (${bid}>${ask})`, symbol: upstream };

    // Sembol bazlı eşik varsa onu kullan (gümüş gibi doğal geniş makaslar için)
    const spreadLimit = SYMBOL_MAP[canonical].maxSpreadPct ?? config.maxSpreadPct;
    const spreadPct = ((ask - bid) / ask) * 100;
    if (spreadPct > spreadLimit) {
        return { ok: false, reason: `makas %${spreadPct.toFixed(1)} > %${spreadLimit}`, symbol: upstream };
    }

    // timestamp_utc güvenilir değilse timestamp'e düş; yıl 2000 altı satırlar
    // kaynakta "veri yok" anlamına geliyor (örn. USDRUB -> 0001-01-01)
    const rawTs = raw.timestamp_utc || raw.timestamp;
    const fetchedAt = rawTs ? new Date(rawTs) : null;
    if (!fetchedAt || Number.isNaN(fetchedAt.getTime()) || fetchedAt.getUTCFullYear() < 2000) {
        return { ok: false, reason: `geçersiz timestamp (${rawTs})`, symbol: upstream };
    }

    const prevClose = toNumber(raw.close);
    const changePct = prevClose && prevClose > 0 ? ((ask - prevClose) / prevClose) * 100 : null;

    return {
        ok: true,
        quote: {
            symbol: canonical,
            bid,
            ask,
            prev_close: prevClose,
            change_pct: changePct === null ? null : Number(changePct.toFixed(4)),
            category: SYMBOL_MAP[canonical].category,
            source: sourceName,
            upstream_symbol: upstream,
            // snapshot_mode = piyasa kapalı, kaydedilmiş görüntü. Canlı değil,
            // ama gösterilebilir — arayüz "bayat" rozetiyle ayırt etsin.
            is_stale: raw.snapshot_mode === true,
            fetched_at: fetchedAt.toISOString(),
        },
    };
}

/** Bir dizi ham satırı normalize eder; kabul edilenleri ve red sebeplerini döner. */
export function normalizeBatch(rows, sourceName) {
    const accepted = [];
    const rejected = [];
    for (const raw of rows ?? []) {
        const r = normalizeRow(raw, sourceName);
        if (r.ok) accepted.push(r.quote);
        else if (r.reason !== 'kopya (DS_)' && r.reason !== 'haritada yok') rejected.push(r);
    }
    return { accepted, rejected };
}
