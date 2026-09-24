import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { log } from './logger.js';
import { applyMargin, resolveMargin } from './margin.js';

const supabase = createClient(config.supabaseUrl, config.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Canlı kotaları panonun gösterdiği `rates` tablosuna yansıtır.
 *
 * Bir satır ancak şu üç koşul birlikte sağlanırsa güncellenir:
 *   1. settings.is_api_mode açık
 *   2. satırda live_symbol atanmış
 *   3. satır is_manual ile kilitlenmemiş (sarraf elle girdiyse dokunulmaz)
 *
 * Böylece pano, UserPanel ve Dashboard'un tamamı tek yazmadan besleniyor —
 * hepsi zaten `rates` tablosunu realtime ile dinliyor.
 */
export function createRateSync(registry) {
    let settings = null;
    let rows = [];
    let configTimer = null;
    let syncTimer = null;
    let inFlight = false;

    const loadConfig = async () => {
        const [s, r] = await Promise.all([
            supabase.from('settings').select('is_api_mode, margin, margin_sell, margin_type').maybeSingle(),
            supabase.from('rates').select('id, name, buy, sell, live_symbol, is_manual, margin_type, margin_buy, margin_sell'),
        ]);

        if (s.error) { log.error('settings okunamadı:', s.error.message); return; }
        if (r.error) { log.error('rates okunamadı:', r.error.message); return; }

        settings = s.data ?? null;
        rows = r.data ?? [];
    };

    const sync = async () => {
        if (inFlight || !settings) return;

        if (!settings.is_api_mode) {
            return; // otomasyon kapalı; sarraf elle yönetiyor
        }

        const updates = [];
        const skipped = { kilitli: 0, bagsiz: 0, kotaYok: 0, marjGecersiz: 0 };

        for (const row of rows) {
            if (!row.live_symbol) { skipped.bagsiz += 1; continue; }
            if (row.is_manual) { skipped.kilitli += 1; continue; }

            const quote = registry.latest.get(row.live_symbol);
            if (!quote) { skipped.kotaYok += 1; continue; }

            const priced = applyMargin(quote, resolveMargin(row, settings));
            if (!priced) {
                skipped.marjGecersiz += 1;
                log.warn(`${row.name}: marj geçersiz sonuç üretti, satır atlandı`);
                continue;
            }

            const buy = priced.buy.toFixed(2);
            const sell = priced.sell.toFixed(2);
            const changeStr = quote.change_pct === null ? '0.00' : quote.change_pct.toFixed(2);

            // Değer aynıysa yazma — her yazma tüm panolarda realtime yenileme tetikler
            if (row.buy === buy && row.sell === sell) continue;

            updates.push({
                id: row.id,
                buy,
                sell,
                change: changeStr,
                is_stale: quote.is_stale,
                source: quote.source,
                auto_updated_at: new Date().toISOString(),
            });
            row.buy = buy;
            row.sell = sell;
        }

        if (updates.length === 0) return;

        inFlight = true;
        try {
            // Tek tek update: upsert kullanmak name/type gibi zorunlu alanları
            // sıfırlama riski taşır, bu satırların sahibi sarraf.
            const results = await Promise.all(
                updates.map((u) => {
                    const { id, ...fields } = u;
                    return supabase.from('rates').update(fields).eq('id', id);
                })
            );
            const failed = results.filter((r) => r.error);
            if (failed.length > 0) {
                log.error(`rates güncellenemedi (${failed.length}/${updates.length}):`, failed[0].error.message);
            } else {
                log.info(`rates güncellendi: ${updates.length} satır`);
            }
            if (skipped.kilitli > 0) log.info(`  (${skipped.kilitli} satır elle kilitli, atlandı)`);
        } catch (err) {
            log.error('rates yazma hatası:', err.message);
        } finally {
            inFlight = false;
        }
    };

    return {
        start: async () => {
            await loadConfig();
            if (!settings) {
                log.warn('settings okunamadı; otomatik kur beslemesi devre dışı.');
            } else if (!settings.is_api_mode) {
                log.warn('settings.is_api_mode kapalı — kurlar elle yönetiliyor, otomasyon yazmayacak.');
            } else {
                const bagli = rows.filter((r) => r.live_symbol).length;
                log.info(`Otomatik kur beslemesi açık: ${bagli}/${rows.length} satır canlı sembole bağlı.`);
            }
            // Ayarlar ve satır kilitleri panelden değişebilir; periyodik tazele
            configTimer = setInterval(loadConfig, config.configRefreshMs);
            syncTimer = setInterval(sync, config.rateSyncMs);
        },
        stop: () => {
            if (configTimer) clearInterval(configTimer);
            if (syncTimer) clearInterval(syncTimer);
            configTimer = syncTimer = null;
        },
    };
}
