/**
 * Ham piyasa kotasına sarrafın kâr payını uygular.
 *
 * Alış  = piyasa alış (bid) − alış marjı
 * Satış = piyasa satış (ask) + satış marjı
 *
 * Pozitif marj makası sarrafın lehine açar. Ters yöne kaydırmak gerekirse
 * negatif değer verilebilir (alış marjı -10 => bid + 10).
 *
 * Birim satır başına tektir ve iki tarafa da aynı uygulanır:
 *   'percent' -> oransal (1.5 => %1.5)
 *   'amount'  -> sabit tutar (10 => 10 TL)
 */

const round = (n, decimals) => {
    const f = 10 ** decimals;
    return Math.round(n * f) / f;
};

/** Fiyat büyüklüğüne göre makul ondalık: 48.76 -> 4 hane, 44624 -> 2 hane */
const decimalsFor = (value) => (Math.abs(value) < 100 ? 4 : 2);

const shift = (base, type, value, direction) => (
    type === 'amount'
        ? base + direction * value
        : base * (1 + direction * value / 100)
);

/**
 * @param {{bid:number, ask:number}} quote
 * @param {{type:'percent'|'amount', buy:number, sell:number}} margin
 * @returns {{buy:number, sell:number} | null} geçersizse null
 */
export function applyMargin(quote, margin) {
    const { bid, ask } = quote;
    const type = margin?.type === 'amount' ? 'amount' : 'percent';
    const buyMargin = Number(margin?.buy) || 0;
    const sellMargin = Number(margin?.sell) || 0;

    const buy = shift(bid, type, buyMargin, -1);
    const sell = shift(ask, type, sellMargin, +1);

    // Marj fiyatı sıfırın altına itmiş olabilir; küçük fiyatlı sembollerde
    // sabit tutar tehlikeli (JPYTRY 0.31 iken 1 TL marj negatif yapar).
    if (!Number.isFinite(buy) || !Number.isFinite(sell) || buy <= 0 || sell <= 0) return null;
    // Alış satışı geçerse fiyat tablosu anlamsız olur
    if (buy > sell) return null;

    const d = decimalsFor(ask);
    return { buy: round(buy, d), sell: round(sell, d) };
}

/** Satırın marjını çözer: satıra özel değer varsa o, yoksa genel varsayılan. */
export function resolveMargin(rateRow, settings) {
    const type = rateRow?.margin_type
        ?? (settings?.margin_type === 'amount' ? 'amount' : 'percent');

    const pick = (rowVal, settingVal) =>
        rowVal !== null && rowVal !== undefined ? Number(rowVal) : Number(settingVal) || 0;

    return {
        type,
        buy: pick(rateRow?.margin_buy, settings?.margin),
        sell: pick(rateRow?.margin_sell, settings?.margin_sell ?? settings?.margin),
    };
}
