import React, { useMemo, useState } from 'react';
import { useExchange } from '../../hooks/useExchange';
import type { Rate } from '../../context/ExchangeContext';

/**
 * "Piyasa Canlı" ekranının marj yönetimi bölümü.
 *
 * Admin/Yönetici burada her kur satırı için ham piyasa değerini, uyguladığı
 * marjı ve üyelerin gördüğü sonucu yan yana görür.
 *
 * Marjlı değer bilerek yeniden hesaplanmıyor: ingestion servisi hesaplayıp
 * rates tablosuna yazıyor, biz onu gösteriyoruz. Böylece ekranda görünen
 * rakam, üyelerin gerçekten gördüğü rakamla birebir aynı oluyor.
 */

const fmt = (n: number | null | undefined, decimals = 2) =>
    n === null || n === undefined || Number.isNaN(n) ? '—' : n.toFixed(decimals);

const cellStyle: React.CSSProperties = {
    padding: '12px 14px',
    fontSize: '13px',
    color: '#C8D4E8',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
};

const thStyle: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    textAlign: 'left',
    color: '#8B97B8',
    borderBottom: '1px solid rgba(212,167,49,0.2)',
};

const MarginRow: React.FC<{ rate: Rate; canEdit: boolean }> = ({ rate, canEdit }) => {
    const { liveMarketRates, updateRateMargin } = useExchange();
    const live = liveMarketRates.find(l => l.symbol === rate.liveSymbol);

    const [type, setType] = useState<'percent' | 'amount'>(rate.marginType ?? 'percent');
    const [buyMargin, setBuyMargin] = useState<string>(String(rate.marginBuy ?? 0));
    const [sellMargin, setSellMargin] = useState<string>(String(rate.marginSell ?? 0));
    const [saving, setSaving] = useState(false);
    const [justSaved, setJustSaved] = useState(false);

    const dirty =
        type !== (rate.marginType ?? 'percent') ||
        Number(buyMargin) !== (rate.marginBuy ?? 0) ||
        Number(sellMargin) !== (rate.marginSell ?? 0);

    const save = async () => {
        const b = Number(buyMargin);
        const sv = Number(sellMargin);
        if (!Number.isFinite(b) || !Number.isFinite(sv)) {
            alert('Marj sayısal olmalı.');
            return;
        }
        setSaving(true);
        const ok = await updateRateMargin(rate.id!, type, b, sv);
        setSaving(false);
        if (ok) {
            setJustSaved(true);
            setTimeout(() => setJustSaved(false), 6000);
        } else {
            alert('Marj kaydedilemedi.');
        }
    };

    return (
        <tr>
            <td style={{ ...cellStyle, fontWeight: 600, color: '#F5D56E' }}>
                {rate.name}
                {rate.isManual && (
                    <span style={{ marginLeft: 8, fontSize: 10, color: '#F59E0B' }}>🔒 KİLİTLİ</span>
                )}
                {!rate.liveSymbol && (
                    <span style={{ marginLeft: 8, fontSize: 10, color: '#8B97B8' }}>MANUEL</span>
                )}
            </td>

            {/* Ham piyasa değeri */}
            <td style={{ ...cellStyle, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>
                {live ? `${fmt(live.bid)} / ${fmt(live.ask)}` : '—'}
                {live?.is_stale && (
                    <div style={{ fontSize: 10, color: '#F59E0B' }}>piyasa kapalı</div>
                )}
            </td>

            {/* Marj düzenleme */}
            <td style={cellStyle}>
                {rate.liveSymbol ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <label style={{ fontSize: 10, color: '#3B82F6', fontWeight: 700 }}>AL</label>
                        <input
                            type="number"
                            step={type === 'percent' ? '0.1' : '1'}
                            value={buyMargin}
                            disabled={!canEdit || saving}
                            onChange={(e) => setBuyMargin(e.target.value)}
                            title="Alış marjı — Alış = piyasa alış − bu değer"
                            style={{
                                width: 72, padding: '6px 8px', background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6,
                                color: '#fff', fontSize: 13, textAlign: 'right',
                            }}
                        />
                        <label style={{ fontSize: 10, color: '#F5D56E', fontWeight: 700 }}>SAT</label>
                        <input
                            type="number"
                            step={type === 'percent' ? '0.1' : '1'}
                            value={sellMargin}
                            disabled={!canEdit || saving}
                            onChange={(e) => setSellMargin(e.target.value)}
                            title="Satış marjı — Satış = piyasa satış + bu değer"
                            style={{
                                width: 72, padding: '6px 8px', background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(212,167,49,0.3)', borderRadius: 6,
                                color: '#fff', fontSize: 13, textAlign: 'right',
                            }}
                        />
                        <select
                            value={type}
                            disabled={!canEdit || saving}
                            onChange={(e) => setType(e.target.value as 'percent' | 'amount')}
                            style={{
                                padding: '6px 8px', background: '#0a0e1a',
                                border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6,
                                color: '#fff', fontSize: 13,
                            }}
                        >
                            <option value="percent">%</option>
                            <option value="amount">TL</option>
                        </select>
                        {canEdit && dirty && (
                            <button
                                onClick={save}
                                disabled={saving}
                                style={{
                                    padding: '6px 12px', background: 'linear-gradient(135deg,#D4A731,#8B6914)',
                                    border: 'none', borderRadius: 6, color: '#0a0e1a',
                                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                }}
                            >
                                {saving ? '...' : 'Kaydet'}
                            </button>
                        )}
                    </div>
                ) : (
                    <span style={{ color: '#5A6784', fontSize: 12 }}>canlı sembole bağlı değil</span>
                )}
            </td>

            {/* Üyelerin gördüğü değer */}
            <td style={{ ...cellStyle, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: '#fff', fontWeight: 600 }}>
                {rate.buy} / {rate.sell}
                {justSaved && (
                    <div style={{ fontSize: 10, color: '#22C55E' }}>uygulanıyor…</div>
                )}
            </td>
        </tr>
    );
};

const LiveMarketMargins: React.FC = () => {
    const { rates, currentUser, liveMarketRates, settings } = useExchange();
    const canEdit = currentUser?.role === 'Admin' || currentUser?.role === 'Yönetici';

    const sorted = useMemo(
        () => [...rates].sort((a, b) => Number(!!b.liveSymbol) - Number(!!a.liveSymbol)),
        [rates]
    );

    return (
        <div style={{
            background: 'rgba(20, 28, 50, 0.8)',
            borderRadius: 16,
            border: '1px solid rgba(212, 167, 49, 0.15)',
            padding: 24,
            marginBottom: 24,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#F5D56E', letterSpacing: '0.05em' }}>
                        Canlı Piyasa ve Marj Yönetimi
                    </div>
                    <div style={{ fontSize: 12, color: '#8B97B8', marginTop: 4 }}>
                        <strong style={{ color: '#3B82F6' }}>Alış</strong> = piyasa alış − AL marjı &nbsp;·&nbsp; <strong style={{ color: '#F5D56E' }}>Satış</strong> = piyasa satış + SAT marjı. Marj 0 ise üyeler ham piyasa değerini görür. Ters yöne kaydırmak için negatif değer girebilirsiniz.
                    </div>
                </div>
                {!settings.isApiMode && (
                    <div style={{
                        padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B',
                    }}>
                        ⚠ Otomatik besleme kapalı (is_api_mode) — marjlar uygulanmaz
                    </div>
                )}
            </div>

            {liveMarketRates.length === 0 && (
                <div style={{
                    padding: 16, borderRadius: 8, fontSize: 13,
                    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#F59E0B',
                }}>
                    Canlı piyasa verisi yok. <code>ingestion</code> servisi çalışıyor mu?
                </div>
            )}

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                    <thead>
                        <tr>
                            <th style={thStyle}>Ürün</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Ham Piyasa (alış/satış)</th>
                            <th style={thStyle}>Marj (Alış / Satış)</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Üyelerin Gördüğü</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map(r => <MarginRow key={r.id ?? r.name} rate={r} canEdit={canEdit} />)}
                    </tbody>
                </table>
            </div>

            {!canEdit && (
                <div style={{ marginTop: 12, fontSize: 12, color: '#8B97B8' }}>
                    Marj düzenleme yetkisi yalnızca Admin ve Yönetici rollerindedir.
                </div>
            )}
        </div>
    );
};

export default LiveMarketMargins;
