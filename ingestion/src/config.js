import 'dotenv/config';

const required = (name) => {
    const v = process.env[name];
    if (!v) throw new Error(`Zorunlu ortam değişkeni eksik: ${name} (ingestion/.env dosyasına ekleyin)`);
    return v;
};

const num = (name, fallback) => {
    const v = process.env[name];
    if (v === undefined || v === '') return fallback;
    const n = Number(v);
    if (Number.isNaN(n)) throw new Error(`${name} sayı olmalı, gelen: ${v}`);
    return n;
};

// Supabase'in iki anahtar kuşağı var. Yeni projeler sb_secret_..., eski
// projeler service_role JWT'si kullanıyor. İkisini de kabul ediyoruz.
const supabaseSecret = () => {
    const v = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!v) {
        throw new Error(
            'Supabase gizli anahtarı eksik. ingestion/.env içine SUPABASE_SECRET_KEY yazın ' +
            '(Dashboard > Project Settings > API Keys > Secret keys). ' +
            'Bu anahtar RLS\'i baypas eder; istemciye veya repoya asla girmemeli.'
        );
    }
    if (v.startsWith('sb_publishable_') || v.startsWith('sb_anon')) {
        throw new Error('Yayınlanabilir (publishable/anon) anahtar verilmiş. Yazma için secret anahtar gerekiyor.');
    }
    return v;
};

export const config = {
    supabaseUrl: required('SUPABASE_URL').replace(/\/+$/, ''),
    supabaseKey: supabaseSecret(),

    altinapi: {
        url: (process.env.ALTINAPI_URL || 'https://altinapi.com').replace(/\/+$/, ''),
        key: required('ALTINAPI_KEY'),
        categories: (process.env.ALTINAPI_CATEGORIES || 'DOVIZ,MADEN,SARRAFIYE,GRAM ALTIN')
            .split(',').map((s) => s.trim()).filter(Boolean),
    },

    staleMs: num('STALE_MS', 60_000),
    maxSpreadPct: num('MAX_SPREAD_PCT', 5),
    maxJumpPct: num('MAX_JUMP_PCT', 15),
    writeIntervalMs: num('WRITE_INTERVAL_MS', 1000),
    restPollMs: num('REST_POLL_MS', 30_000),
    // settings/rates yapılandırmasının (marj, kilit, sembol bağı) tazelenme sıklığı
    configRefreshMs: num('CONFIG_REFRESH_MS', 30_000),
    // periyodik durum özeti logu
    statusLogMs: num('STATUS_LOG_MS', 60_000),
    // rates tablosuna yazma sıklığı. Her yazma tüm panolarda realtime yenileme
    // tetiklediği için live_rates'ten daha seyrek tutuluyor.
    rateSyncMs: num('RATE_SYNC_MS', 5000),
};

// Uygulamanın kullandığı kanonik semboller -> altinapi sembolleri.
// Yalnızca burada listelenenler işlenir; kaynak 305 sembol döndürüyor,
// hepsini taşımanın anlamı yok.
export const SYMBOL_MAP = {
    HAS:    { upstream: 'ALTIN',        category: 'gold' },
    KULCE:  { upstream: 'KULCEALTIN',   category: 'gold' },
    AYAR22: { upstream: 'AYAR22',       category: 'gold', maxSpreadPct: 8 },
    // 14 ayarda hurda alış ile perakende satış arasındaki işçilik farkı
    // makası doğal olarak çok açıyor (~%25). Genel %5 eşiği bunu eliyordu.
    AYAR14: { upstream: 'AYAR14',       category: 'gold', maxSpreadPct: 30 },
    CEYREK: { upstream: 'CEYREK_YENI',  category: 'gold' },
    YARIM:  { upstream: 'YARIM_YENI',   category: 'gold' },
    TAM:    { upstream: 'TEK_YENI',     category: 'gold' },
    ATA:    { upstream: 'ATA_YENI',     category: 'gold' },
    GREMSE: { upstream: 'GREMESE_YENI', category: 'gold' },
    // Gümüşün perakende makası doğal olarak geniş; genel eşik onu eliyor
    GUMUS:  { upstream: 'GUMUSTRY',     category: 'gold', maxSpreadPct: 12 },
    ONS:    { upstream: 'XAUUSD',       category: 'metal' },
    XAG:    { upstream: 'XAGUSD',       category: 'metal' },
    USD:    { upstream: 'USDTRY',       category: 'currency' },
    EUR:    { upstream: 'EURTRY',       category: 'currency' },
    GBP:    { upstream: 'GBPTRY',       category: 'currency' },
};

export const UPSTREAM_TO_CANONICAL = Object.fromEntries(
    Object.entries(SYMBOL_MAP).map(([canonical, { upstream }]) => [upstream, canonical])
);
