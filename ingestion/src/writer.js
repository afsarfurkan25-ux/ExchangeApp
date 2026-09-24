import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { log } from './logger.js';

// service_role anahtarı RLS'i baypas eder; bu istemci yalnızca sunucuda yaşar.
// Realtime'a abone olmamıza gerek yok, yalnızca yazıyoruz.
const supabase = createClient(config.supabaseUrl, config.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 1 } },
});

/**
 * Değişen kotaları toplu halde Supabase'e yazar.
 * Socket saniyede birçok güncelleme gönderebildiği için yazmalar
 * WRITE_INTERVAL_MS aralığında topaklanır — her tik için ayrı UPDATE atmak
 * hem Supabase'i hem realtime dinleyen panoları gereksiz yorar.
 */
export function createWriter(registry) {
    let timer = null;
    let inFlight = false;

    const flush = async () => {
        if (inFlight) return;
        const rows = registry.drainDirty();
        if (rows.length === 0) return;

        inFlight = true;
        try {
            const { error } = await supabase
                .from('live_rates')
                .upsert(rows, { onConflict: 'symbol' });

            if (error) {
                log.error('live_rates yazılamadı:', error.message);
                // Yazılamayanları tekrar denemek üzere işaretle
                for (const r of rows) registry.dirty.add(r.symbol);
            } else {
                log.info(`live_rates güncellendi: ${rows.map((r) => r.symbol).join(', ')}`);
            }
        } catch (err) {
            log.error('live_rates yazma hatası:', err.message);
            for (const r of rows) registry.dirty.add(r.symbol);
        } finally {
            inFlight = false;
        }
    };

    return {
        start: () => { timer = setInterval(flush, config.writeIntervalMs); },
        stop: async () => {
            if (timer) clearInterval(timer);
            timer = null;
            await flush(); // kapanmadan önce bekleyenleri yaz
        },
    };
}
