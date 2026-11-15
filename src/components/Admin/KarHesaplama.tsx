import React, { useState, useMemo, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface KalemItem {
    id: number;
    ad: string;
    tutar: number;
    kategori: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function paraTR(n: number, decimals = 3) {
    return '₺' + n.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function paraShort(n: number) {
    if (n >= 1000000) return '₺' + (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return '₺' + (n / 1000).toFixed(1).replace('.', ',') + '';
    return '₺' + n.toLocaleString('tr-TR');
}

let _id = 200;
function uid() { return ++_id; }

const GELIR_KAT = ['Altın Satış', 'Döviz Bozdurma', 'Gümüş Satış', 'Komisyon', 'Diğer Gelir'];
const GIDER_KAT = ['Kira', 'Personel', 'Elektrik / Su', 'Muhasebe', 'İnternet', 'Diğer Gider'];

// ── Donut Chart ───────────────────────────────────────────────────────────────
function DonutChart({ pct }: { pct: number }) {
    const r = 52, cx = 68, cy = 68, sw = 11;
    const circ = 2 * Math.PI * r;
    const clamped = Math.max(0, Math.min(100, pct));
    const dash = (clamped / 100) * circ;
    const color = clamped >= 50 ? '#D4AF37' : clamped >= 20 ? '#f59e0b' : '#ef4444';
    return (
        <svg width="136" height="136" viewBox="0 0 136 136">
            {/* Track */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
            {/* Progress */}
            <circle cx={cx} cy={cy} r={r} fill="none"
                stroke={color} strokeWidth={sw}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeLinecap="round"
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{ transition: 'stroke-dasharray 0.7s cubic-bezier(0.4,0,0.2,1)' }}
            />
            {/* Center text */}
            <text x={cx} y={cy - 8} textAnchor="middle" fill={color}
                fontSize="22" fontWeight="700" fontFamily="'DM Sans',sans-serif">
                %{Math.round(clamped)}
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" fill="#475569"
                fontSize="11" fontFamily="'DM Sans',sans-serif">
                Kar Marjı
            </text>
        </svg>
    );
}

// ── Bar Chart ─────────────────────────────────────────────────────────────────
function BarChart({ gelir, gider, kar }: { gelir: number; gider: number; kar: number }) {
    const W = 340, H = 110, padB = 28;
    const bars = [
        { label: 'Gelir', val: gelir, color: '#10b981' },
        { label: 'Gider', val: gider, color: '#ef4444' },
        { label: 'Kar', val: kar > 0 ? kar : 0, color: '#D4AF37' },
    ];
    const maxVal = Math.max(...bars.map(b => b.val), 1);
    const barW = 56, gap = (W - bars.length * barW) / (bars.length + 1);

    return (
        <svg width="100%" viewBox={`0 0 ${W} ${H + padB}`} style={{ overflow: 'visible' }}>
            {/* Grid lines */}
            {[0.25, 0.5, 0.75, 1].map(f => (
                <line key={f} x1={0} y1={H * (1 - f)} x2={W} y2={H * (1 - f)}
                    stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            ))}
            {bars.map((b, i) => {
                const barH = Math.max(4, (b.val / maxVal) * H);
                const x = gap + i * (barW + gap);
                const y = H - barH;
                return (
                    <g key={b.label}>
                        {/* Bar shadow */}
                        <rect x={x + 2} y={y + 2} width={barW} height={barH} rx={6}
                            fill="rgba(0,0,0,0.3)" />
                        {/* Bar */}
                        <rect x={x} y={y} width={barW} height={barH} rx={6}
                            fill={b.color} opacity={0.85}
                            style={{ transition: 'height 0.6s cubic-bezier(0.4,0,0.2,1), y 0.6s' }} />
                        {/* Value label */}
                        <text x={x + barW / 2} y={y - 8} textAnchor="middle"
                            fill={b.color} fontSize="10" fontWeight="600"
                            fontFamily="'DM Sans',sans-serif">
                            {paraShort(b.val)}
                        </text>
                        {/* Category label */}
                        <text x={x + barW / 2} y={H + 18} textAnchor="middle"
                            fill="#64748b" fontSize="11"
                            fontFamily="'DM Sans',sans-serif">
                            {b.label}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
const KarHesaplama: React.FC = () => {
    const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
    const [dateTo, setDateTo] = useState(() => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
    const [periyor, setPeriyor] = useState('Günlük');

    const [gelirler, setGelirler] = useState<KalemItem[]>([
        { id: 1, ad: 'Altın Satış', tutar: 40000, kategori: 'Altın Satış' },
        { id: 2, ad: 'Döviz Bozdurma', tutar: 12300, kategori: 'Döviz Bozdurma' },
        { id: 3, ad: 'Gümüş Satış', tutar: 5000, kategori: 'Gümüş Satış' },
    ]);
    const [giderler, setGiderler] = useState<KalemItem[]>([
        { id: 10, ad: 'Kira', tutar: 8500, kategori: 'Kira' },
        { id: 11, ad: 'Personel', tutar: 13600, kategori: 'Personel' },
        { id: 12, ad: 'Elektrik / Su', tutar: 1200, kategori: 'Elektrik / Su' },
    ]);

    // ── Hesaplamalar ─────────────────────────────────────────────────────────
    const toplamGelir = useMemo(() => gelirler.reduce((s, g) => s + (g.tutar || 0), 0), [gelirler]);
    const toplamGider = useMemo(() => giderler.reduce((s, g) => s + (g.tutar || 0), 0), [giderler]);
    const netKar = toplamGelir - toplamGider;
    const karMarji = toplamGelir > 0 ? (netKar / toplamGelir) * 100 : 0;

    // ── CRUD helpers ──────────────────────────────────────────────────────────
    const addGelir = useCallback(() => setGelirler(p => [...p, { id: uid(), ad: '', tutar: 0, kategori: 'Altın Satış' }]), []);
    const removeGelir = useCallback((id: number) => setGelirler(p => p.filter(g => g.id !== id)), []);
    const updGelir = useCallback((id: number, f: keyof KalemItem, v: string | number) =>
        setGelirler(p => p.map(g => g.id === id ? { ...g, [f]: v } : g)), []);

    const addGider = useCallback(() => setGiderler(p => [...p, { id: uid(), ad: '', tutar: 0, kategori: 'Kira' }]), []);
    const removeGider = useCallback((id: number) => setGiderler(p => p.filter(g => g.id !== id)), []);
    const updGider = useCallback((id: number, f: keyof KalemItem, v: string | number) =>
        setGiderler(p => p.map(g => g.id === id ? { ...g, [f]: v } : g)), []);

    // ── CSV Export ────────────────────────────────────────────────────────────
    function exportCSV(only?: 'gelir' | 'gider') {
        const rows = ['Tür,Kalem Adı,Kategori,Tutar'];
        if (only !== 'gider') gelirler.forEach(g => rows.push(`Gelir,"${g.ad}","${g.kategori}",${g.tutar}`));
        if (only !== 'gelir') giderler.forEach(g => rows.push(`Gider,"${g.ad}","${g.kategori}",${g.tutar}`));
        if (!only) {
            rows.push('', `,,Toplam Gelir,${toplamGelir}`, `,,Toplam Gider,${toplamGider}`,
                `,,Net Kar,${netKar}`, `,,Kar Marjı,%${karMarji.toFixed(2)}`);
        }
        const todayStr = new Date().toISOString().slice(0, 10);
        const a = Object.assign(document.createElement('a'), {
            href: URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })),
            download: `kurmatik-kar-${todayStr}.csv`,
        });
        a.click();
    }

    // ── Shared styles ─────────────────────────────────────────────────────────
    // (Removed unused 'inp' style to fix TS err)

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div id="kh-root" style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", color: '#e2e8f0' }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap');
                #kh-root * { box-sizing: border-box; }

                /* eyebrow */
                .kh-eyebrow { font-size: 11px; color: #8a7020; letter-spacing: 3px; text-transform: uppercase;
                    margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
                .kh-eyebrow::before { content: ''; width: 18px; height: 1px; background: #8a7020; }
                .kh-title { font-family: 'Cinzel', serif; font-size: 24px; color: #D4AF37; margin: 0; letter-spacing: 0.5px; }
                .kh-sub   { font-size: 13px; color: #475569; margin-top: 4px; }

                /* period tabs */
                .kh-ptabs { display: flex; gap: 0; border-radius: 8px; overflow: hidden;
                    border: 1px solid rgba(255,255,255,0.08); width: fit-content; }
                .kh-ptab { padding: 7px 14px; font-size: 12px; font-weight: 500; background: rgba(255,255,255,0.03);
                    color: #475569; border: none; cursor: pointer; font-family: inherit; transition: all 0.2s;
                    border-right: 1px solid rgba(255,255,255,0.08); }
                .kh-ptab:last-child { border-right: none; }
                .kh-ptab.kh-active { background: rgba(212,175,55,0.15); color: #D4AF37; font-weight: 600; }
                .kh-ptab:hover:not(.kh-active) { color: #e2e8f0; background: rgba(255,255,255,0.06); }

                /* stat cards */
                .kh-stat-badge { position: absolute; top: 12px; right: 12px; font-size: 9px; font-weight: 700;
                    padding: 2px 7px; border-radius: 100px; text-transform: uppercase; letter-spacing: 0.5px; }

                /* section header */
                .kh-sh { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
                .kh-sh-title { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #8a7020; }
                .kh-add-btn  { font-size: 12px; font-weight: 600; padding: 5px 14px; border-radius: 6px;
                    border: 1px solid rgba(16,185,129,0.35); background: rgba(16,185,129,0.1); color: #10b981;
                    cursor: pointer; font-family: inherit; transition: background 0.2s; }
                .kh-add-btn:hover { background: rgba(16,185,129,0.2); }
                .kh-save-btn { font-size: 12px; font-weight: 700; padding: 5px 14px; border-radius: 6px; border: none;
                    background: rgba(239,68,68,0.15); color: #ef4444; cursor: pointer; font-family: inherit;
                    border: 1px solid rgba(239,68,68,0.25); }

                /* table */
                .kh-t { width: 100%; border-collapse: collapse; }
                .kh-th { font-size: 10px; font-weight: 600; color: #475569; text-transform: uppercase;
                    letter-spacing: 0.8px; padding: 0 8px 10px; text-align: left;
                    border-bottom: 1px solid rgba(255,255,255,0.06); }
                .kh-td { padding: 7px 8px; vertical-align: middle; border-bottom: 1px solid rgba(255,255,255,0.04); }
                .kh-tr:last-child .kh-td { border-bottom: none; }
                .kh-del { width: 28px; height: 28px; border-radius: 6px; border: 1px solid rgba(239,68,68,0.2);
                    background: rgba(239,68,68,0.08); color: #ef4444; cursor: pointer; font-size: 12px;
                    display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
                .kh-del:hover { background: rgba(239,68,68,0.2); }
                .kh-add-row { padding: 8px 0 0; font-size: 12px; color: #475569; cursor: pointer;
                    background: none; border: none; font-family: inherit; transition: color 0.2s; display: block; }
                .kh-add-row:hover { color: #D4AF37; }

                /* özet rows */
                .kh-oz-row { display: flex; justify-content: space-between; align-items: center;
                    padding: 9px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 13px; }
                .kh-oz-row:last-child { border-bottom: none; }

                /* download bar */
                .kh-dl-bar { display: flex; align-items: center; gap: 12px;
                    background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 12px; padding: 14px 20px; margin-top: 20px; flex-wrap: wrap; }
                .kh-dl-sec { padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 600;
                    cursor: pointer; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04);
                    color: #94a3b8; font-family: inherit; transition: all 0.2s; }
                .kh-dl-sec:hover { background: rgba(255,255,255,0.08); color: #e2e8f0; }
                .kh-dl-main { padding: 9px 20px; border-radius: 8px; font-size: 13px; font-weight: 700;
                    cursor: pointer; border: none; background: linear-gradient(135deg,#c9a227,#e8c547);
                    color: #000; font-family: inherit; transition: all 0.2s; }
                .kh-dl-main:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(212,175,55,0.4); }

                /* inputs */
                #kh-root input[type=text], #kh-root input[type=number],
                #kh-root select, #kh-root input[type=date] {
                    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
                    border-radius: 7px; padding: 7px 10px; color: #e2e8f0; font-size: 13px;
                    outline: none; width: 100%; font-family: inherit; transition: border-color 0.2s;
                }
                #kh-root input:focus, #kh-root select:focus { border-color: rgba(212,175,55,0.4); }
                #kh-root select option { background: #1a2035; }

                /* card section */
                .kh-card { background: #0c1019; border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 14px; padding: 20px; margin-bottom: 20px; }
                .kh-card:last-child { margin-bottom: 0; }
            `}</style>

            {/* ════════════════ HEADER ════════════════ */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '24px' }}>
                <div>
                    <div className="kh-eyebrow">Kurmatik.net Admin</div>
                    <h1 className="kh-title">🍀 Kar Hesaplama</h1>
                    <p className="kh-sub">Gelir ve gider kalemlerinizi girerek kar marjınızı hesaplayın. PDF raporu alın.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
                    {/* date + hesapla */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                            style={{ width: 'auto', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '7px 10px', color: '#e2e8f0', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
                        <span style={{ color: '#475569', fontSize: '12px' }}>—</span>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                            style={{ width: 'auto', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '7px 10px', color: '#e2e8f0', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
                        <button style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#c9a227,#e8c547)', color: '#000', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                            Hesapla
                        </button>
                    </div>
                    {/* period tabs */}
                    <div className="kh-ptabs">
                        {['PERİYOT', 'Günlük', 'Haftalık', 'Aylık', 'Özel'].map(t => (
                            <button key={t} className={`kh-ptab${periyor === t ? ' kh-active' : ''}`}
                                onClick={() => setPeriyor(t)}>{t}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ════════════════ STAT CARDS ════════════════ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '24px' }}>
                {/* Toplam Gelir */}
                <div style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.25) 0%,rgba(16,185,129,0.08) 100%)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '14px', padding: '20px 20px 16px', position: 'relative', overflow: 'hidden' }}>
                    <span className="kh-stat-badge" style={{ background: 'rgba(16,185,129,0.25)', color: '#10b981' }}>GELİR</span>
                    <div style={{ fontSize: '20px', marginBottom: '10px' }}>📈</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#10b981', lineHeight: 1.1 }}>{paraShort(toplamGelir)}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(16,185,129,0.6)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Toplam Gelir</div>
                    <div style={{ height: '3px', background: 'rgba(16,185,129,0.35)', borderRadius: '2px', marginTop: '14px' }}></div>
                </div>
                {/* Toplam Gider */}
                <div style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.25) 0%,rgba(239,68,68,0.08) 100%)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '14px', padding: '20px 20px 16px', position: 'relative', overflow: 'hidden' }}>
                    <span className="kh-stat-badge" style={{ background: 'rgba(239,68,68,0.25)', color: '#ef4444' }}>GİDER</span>
                    <div style={{ fontSize: '20px', marginBottom: '10px' }}>📉</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#ef4444', lineHeight: 1.1 }}>{paraShort(toplamGider)}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(239,68,68,0.6)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Toplam Gider</div>
                    <div style={{ height: '3px', background: 'rgba(239,68,68,0.35)', borderRadius: '2px', marginTop: '14px' }}></div>
                </div>
                {/* Net Kar */}
                <div style={{ background: 'linear-gradient(135deg,rgba(212,175,55,0.25) 0%,rgba(212,175,55,0.08) 100%)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '14px', padding: '20px 20px 16px', position: 'relative', overflow: 'hidden' }}>
                    <span className="kh-stat-badge" style={{ background: 'rgba(212,175,55,0.25)', color: '#D4AF37' }}>NET KAR</span>
                    <div style={{ fontSize: '20px', marginBottom: '10px' }}>✨</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#D4AF37', lineHeight: 1.1 }}>{paraShort(netKar)}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(212,175,55,0.6)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Net Kar</div>
                    <div style={{ height: '3px', width: `${Math.max(0, Math.min(100, karMarji))}%`, background: 'rgba(212,175,55,0.45)', borderRadius: '2px', marginTop: '14px', transition: 'width 0.5s' }}></div>
                </div>
                {/* Kar Marjı */}
                <div style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.25) 0%,rgba(139,92,246,0.08) 100%)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '14px', padding: '20px 20px 16px', position: 'relative', overflow: 'hidden' }}>
                    <span className="kh-stat-badge" style={{ background: 'rgba(139,92,246,0.25)', color: '#8b5cf6' }}>KAR MARJI</span>
                    <div style={{ fontSize: '20px', marginBottom: '10px' }}>💜</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#8b5cf6', lineHeight: 1.1 }}>%{karMarji.toFixed(1)}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(139,92,246,0.6)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Kar Marjı</div>
                    <div style={{ height: '3px', width: `${Math.max(0, Math.min(100, karMarji))}%`, background: 'rgba(139,92,246,0.45)', borderRadius: '2px', marginTop: '14px', transition: 'width 0.5s' }}></div>
                </div>
            </div>

            {/* ════════════════ TWO-COLUMN LAYOUT ════════════════ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' }}>

                {/* ── LEFT: Gelir + Gider tables ── */}
                <div>
                    {/* GELİR KALEMLERİ */}
                    <div className="kh-card">
                        <div className="kh-sh">
                            <div>
                                <div className="kh-sh-title">Gelir Kalemleri</div>
                                <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>Tüm gelir kaynaklarınızı girin</div>
                            </div>
                            <button className="kh-add-btn" onClick={addGelir}>+ EKLE</button>
                        </div>
                        <table className="kh-t">
                            <thead>
                                <tr>
                                    <th className="kh-th">Kalem Adı</th>
                                    <th className="kh-th" style={{ width: '120px' }}>Tutarı (₺)</th>
                                    <th className="kh-th" style={{ width: '155px' }}>Kategori</th>
                                    <th className="kh-th" style={{ width: '36px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {gelirler.map(g => (
                                    <tr key={g.id} className="kh-tr">
                                        <td className="kh-td">
                                            <input type="text" value={g.ad}
                                                onChange={e => updGelir(g.id, 'ad', e.target.value)}
                                                placeholder="Kalem adı..." />
                                        </td>
                                        <td className="kh-td">
                                            <input type="number" value={g.tutar || ''}
                                                onChange={e => updGelir(g.id, 'tutar', parseFloat(e.target.value) || 0)}
                                                placeholder="0" min="0" />
                                        </td>
                                        <td className="kh-td">
                                            <select value={g.kategori}
                                                onChange={e => updGelir(g.id, 'kategori', e.target.value)}>
                                                {GELIR_KAT.map(k => <option key={k}>{k}</option>)}
                                            </select>
                                        </td>
                                        <td className="kh-td">
                                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                <button className="kh-del" onClick={() => removeGelir(g.id)}>✕</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button className="kh-add-row" onClick={addGelir}>+ Gelir Kalemi Ekle</button>
                    </div>

                    {/* GİDER KALEMLERİ */}
                    <div className="kh-card">
                        <div className="kh-sh">
                            <div>
                                <div className="kh-sh-title">Gider Kalemleri</div>
                                <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>Sabit ve değişken giderlerinizi girin</div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="kh-save-btn">KAYDET</button>
                                <button className="kh-add-btn" onClick={addGider}>+ EKLE</button>
                            </div>
                        </div>
                        <table className="kh-t">
                            <thead>
                                <tr>
                                    <th className="kh-th">Kalem Adı</th>
                                    <th className="kh-th" style={{ width: '120px' }}>Tutarı (₺)</th>
                                    <th className="kh-th" style={{ width: '155px' }}>Kategori</th>
                                    <th className="kh-th" style={{ width: '36px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {giderler.map(g => (
                                    <tr key={g.id} className="kh-tr">
                                        <td className="kh-td">
                                            <input type="text" value={g.ad}
                                                onChange={e => updGider(g.id, 'ad', e.target.value)}
                                                placeholder="Kalem adı..." />
                                        </td>
                                        <td className="kh-td">
                                            <input type="number" value={g.tutar || ''}
                                                onChange={e => updGider(g.id, 'tutar', parseFloat(e.target.value) || 0)}
                                                placeholder="0" min="0" />
                                        </td>
                                        <td className="kh-td">
                                            <select value={g.kategori}
                                                onChange={e => updGider(g.id, 'kategori', e.target.value)}>
                                                {GIDER_KAT.map(k => <option key={k}>{k}</option>)}
                                            </select>
                                        </td>
                                        <td className="kh-td">
                                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                <button className="kh-del" onClick={() => removeGider(g.id)}>✕</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button className="kh-add-row" onClick={addGider}>+ Gider Kalemi Ekle</button>
                    </div>
                </div>

                {/* ── RIGHT: Özet + Görsel Karşılaştırma ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '20px' }}>

                    {/* ÖZET */}
                    <div className="kh-card" style={{ marginBottom: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <div className="kh-sh-title">Özet</div>
                            <span style={{ fontSize: '10px', background: 'rgba(212,175,55,0.12)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.25)', padding: '2px 8px', borderRadius: '100px', fontWeight: 600 }}>Bugün</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#475569', marginBottom: '18px' }}>Anlık hesaplama</div>

                        {/* Donut */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
                            <DonutChart pct={Math.max(0, Math.min(100, karMarji))} />
                        </div>

                        {/* Summary rows */}
                        <div>
                            <div className="kh-oz-row">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#10b981', flexShrink: 0 }}></div>
                                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>Toplam Gelir</span>
                                </div>
                                <span style={{ color: '#10b981', fontWeight: 600, fontSize: '13px' }}>{paraTR(toplamGelir, 2)}</span>
                            </div>
                            <div className="kh-oz-row">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ef4444', flexShrink: 0 }}></div>
                                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>Toplam Gider</span>
                                </div>
                                <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '13px' }}>{paraTR(toplamGider, 2)}</span>
                            </div>
                            <div className="kh-oz-row">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#D4AF37', flexShrink: 0 }}></div>
                                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>Brüt Kar</span>
                                </div>
                                <span style={{ color: '#D4AF37', fontWeight: 600, fontSize: '13px' }}>{paraTR(netKar, 2)}</span>
                            </div>
                            <div className="kh-oz-row">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#8b5cf6', flexShrink: 0 }}></div>
                                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>Kar Marjı</span>
                                </div>
                                <span style={{ color: '#8b5cf6', fontWeight: 600, fontSize: '13px' }}>%{karMarji.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Net Kar highlighted box */}
                        <div style={{ background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '10px', padding: '12px 16px', marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '12px', color: '#8a7020', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>→ Net Kar</div>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: '#D4AF37' }}>{paraTR(netKar, 2)}</div>
                        </div>
                    </div>

                    {/* GÖRSEL KARŞILAŞTIRMA */}
                    <div className="kh-card" style={{ marginBottom: 0 }}>
                        <div className="kh-sh-title" style={{ marginBottom: '16px' }}>Görsel Karşılaştırma</div>
                        <BarChart gelir={toplamGelir} gider={toplamGider} kar={netKar > 0 ? netKar : 0} />
                        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '4px' }}>
                            {[{ c: '#10b981', l: 'Gelir' }, { c: '#ef4444', l: 'Gider' }, { c: '#D4AF37', l: 'Kar' }].map(i => (
                                <div key={i.l} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#475569' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: i.c }}></div>
                                    {i.l}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ════════════════ DOWNLOAD BAR ════════════════ */}
            <div className="kh-dl-bar">
                <div style={{ fontSize: '28px' }}>📄</div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>Gelir/Gider Raporu İndir</div>
                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>CSV formatında · Anlık veriler</div>
                </div>
                <button className="kh-dl-sec" onClick={() => exportCSV('gelir')}>Sadece Gelir</button>
                <button className="kh-dl-sec" onClick={() => exportCSV('gider')}>Sadece Gider</button>
                <button className="kh-dl-main" onClick={() => exportCSV()}>📥 Tam Raporu İndir</button>
            </div>
        </div>
    );
};

export default KarHesaplama;
