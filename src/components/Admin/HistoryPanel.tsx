import React from 'react';
import type { HistoryLog } from '../../context/ExchangeContext';
import './History.css';

interface HistoryPanelProps {
    historyLogs: HistoryLog[];
    filteredAndGroupedHistory: HistoryLog[][];
    historySearch: string;
    setHistorySearch: (v: string) => void;
    historyTypeFilter: string;
    setHistoryTypeFilter: (v: string) => void;
    historySourceFilter: string;
    setHistorySourceFilter: (v: string) => void;
    historyDateFilter: string;
    setHistoryDateFilter: (v: string) => void;
    historyPage: number;
    setHistoryPage: (v: number | ((prev: number) => number)) => void;
    openHistoryGroups: string[];
    setOpenHistoryGroups: (v: string[] | ((prev: string[]) => string[])) => void;
    clearHistory: () => Promise<void>;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({
    historyLogs,
    filteredAndGroupedHistory,
    historySearch, setHistorySearch,
    historyTypeFilter, setHistoryTypeFilter,
    historySourceFilter, setHistorySourceFilter,
    historyDateFilter, setHistoryDateFilter,
    historyPage, setHistoryPage,
    openHistoryGroups, setOpenHistoryGroups,
    clearHistory,
}) => {
    const formatDiff = (d: number) => {
        if (Math.abs(d) < 0.001) return '—';
        return (d > 0 ? '+' : '') + d.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
    };

    return (
        <div className="history-page">
            {/* İSTATİSTİKLER */}
            <div className="history-stats-row">
                <div className="history-stat-chip" style={{ borderColor: 'rgba(212,175,55,0.2)' }}>
                    <div className="h-sc-icon">📋</div>
                    <div>
                        <div className="h-sc-val" style={{ color: '#D4AF37' }}>{filteredAndGroupedHistory.length}</div>
                        <div className="h-sc-label">Toplam Güncelleme</div>
                    </div>
                </div>
                <div className="history-stat-chip" style={{ borderColor: 'rgba(16,185,129,0.2)' }}>
                    <div className="h-sc-icon">📝</div>
                    <div>
                        <div className="h-sc-val" style={{ color: '#10b981' }}>{historyLogs.length}</div>
                        <div className="h-sc-label">Toplam Kayıt</div>
                    </div>
                </div>
                <div className="history-stat-chip" style={{ borderColor: 'rgba(59,130,246,0.2)' }}>
                    <div className="h-sc-icon">📅</div>
                    <div>
                        <div className="h-sc-val" style={{ color: '#60a5fa' }}>{filteredAndGroupedHistory.filter(g => new Date(g[0].created_at).toLocaleDateString() === new Date().toLocaleDateString()).length}</div>
                        <div className="h-sc-label">Bugün</div>
                    </div>
                </div>
                <div className="history-stat-chip" style={{ borderColor: 'rgba(139,92,246,0.2)' }}>
                    <div className="h-sc-icon">⏱</div>
                    <div>
                        <div className="h-sc-val" style={{ color: '#8b5cf6' }}>{historyLogs.length > 0 ? new Date(historyLogs[0].created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                        <div className="h-sc-label">Son Güncelleme</div>
                    </div>
                </div>
            </div>

            {/* FİLTRE BAR */}
            <div className="history-filter-bar">
                <div className="h-search-wrap">
                    <span className="h-search-ic">🔍</span>
                    <input
                        className="h-search-input"
                        type="text"
                        placeholder="Ürün veya kullanıcı ara..."
                        value={historySearch}
                        onChange={e => { setHistorySearch(e.target.value); setHistoryPage(0); }}
                    />
                </div>
                <select className="h-filter-sel" value={historyTypeFilter} onChange={e => { setHistoryTypeFilter(e.target.value); setHistoryPage(0); }}>
                    <option value="">Tüm Türler</option>
                    <option value="altin">🥇 Altın</option>
                    <option value="doviz">💱 Döviz</option>
                    <option value="gumus">🥈 Gümüş</option>
                </select>
                <select className="h-filter-sel" value={historySourceFilter} onChange={e => { setHistorySourceFilter(e.target.value); setHistoryPage(0); }}>
                    <option value="">Tüm Kaynaklar</option>
                    <option value="manuel">✏️ Manuel</option>
                    <option value="api_otomatik">🤖 API Otomatik</option>
                    <option value="toplu">📦 Toplu</option>
                </select>
                <input
                    className="h-filter-date"
                    type="date"
                    value={historyDateFilter}
                    onChange={e => { setHistoryDateFilter(e.target.value); setHistoryPage(0); }}
                />
                {historyLogs.length > 0 && (
                    <button
                        onClick={async () => {
                            if (window.confirm('Tüm geçmiş kayıtları silmek istediğinize emin misiniz?')) {
                                await clearHistory();
                            }
                        }}
                        style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: '#f87171',
                            padding: '8px 16px',
                            borderRadius: '9px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 600,
                            marginLeft: '10px'
                        }}
                    >
                        🗑 Temizle
                    </button>
                )}
            </div>

            {/* AKORDİYON LİSTESİ */}
            <div className="accordion-list">
                {filteredAndGroupedHistory.length === 0 ? (
                    <div className="placeholder" style={{ textAlign: 'center', padding: '80px 20px', background: '#0c1019', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.4 }}>📭</div>
                        <div style={{ fontSize: '15px', fontWeight: 500, color: '#94a3b8' }}>Kayıt bulunamadı</div>
                    </div>
                ) : (
                    filteredAndGroupedHistory.slice(historyPage * 10, (historyPage + 1) * 10).map((group, gIdx) => {
                        const first = group[0];
                        const batchId = first.batch_id || first.created_at.substring(0, 19);
                        const isOpen = openHistoryGroups.includes(batchId);
                        const date = new Date(first.created_at);

                        const altinS = group.filter(r => r.item_group === 'altin').length;
                        const dovizS = group.filter(r => r.item_group === 'doviz').length;
                        const gumusS = group.filter(r => r.item_group === 'gumus').length;

                        return (
                            <div key={batchId} className={`acc-card ${isOpen ? 'open' : ''}`}>
                                <div className="acc-header" onClick={() => {
                                    setOpenHistoryGroups(prev =>
                                        prev.includes(batchId) ? prev.filter(id => id !== batchId) : [...prev, batchId]
                                    );
                                }}>
                                    <div className="acc-left">
                                        <div className="acc-num">#{String(filteredAndGroupedHistory.length - (historyPage * 10 + gIdx)).padStart(2, '0')}</div>
                                        <div className="acc-meta">
                                            <div className="acc-date">📅 {date.toLocaleDateString('tr-TR')} — {date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                                            <div className="acc-source">
                                                <span style={{ color: first.source === 'manuel' ? '#10b981' : '#60a5fa' }}>
                                                    {first.source === 'manuel' ? '✏️ Manuel' : '🤖 API Otomatik'}
                                                </span>
                                                <span>·</span>
                                                <span>{first.user_name || 'Sistem'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="acc-right">
                                        <div className="acc-pills">
                                            {altinS > 0 && <span className="pill pill-altin">{altinS} Altın</span>}
                                            {dovizS > 0 && <span className="pill pill-doviz">{dovizS} Döviz</span>}
                                            {gumusS > 0 && <span className="pill pill-gumus">{gumusS} Gümüş</span>}
                                        </div>
                                        <div style={{ textAlign: 'center', minWidth: '52px' }}>
                                            <div className="acc-count">{group.length}</div>
                                            <div className="acc-count-label">Kayıt</div>
                                        </div>
                                    </div>
                                    <div className="acc-chevron">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="6 9 12 15 18 9"></polyline>
                                        </svg>
                                    </div>
                                </div>
                                <div className="acc-body">
                                    <div className="acc-body-inner">
                                        <div className="inner-head">
                                            <div className="ith">Ürün Adı</div>
                                            <div className="ith">Tür</div>
                                            <div className="ith tr">Eski Fiyat (A/S)</div>
                                            <div className="ith tr">Yeni Fiyat (A/S)</div>
                                            <div className="ith tc">Değişim</div>
                                        </div>
                                        {group.map((item) => {
                                            const diffBuy = parseFloat(item.new_buy || '0') - parseFloat(item.old_buy || '0');
                                            const diffSell = parseFloat(item.new_sell || '0') - parseFloat(item.old_sell || '0');
                                            return (
                                                <div key={item.id} className="inner-row">
                                                    <div className="itd">
                                                        <div className="product-name">{item.item_name}</div>
                                                    </div>
                                                    <div className="itd">
                                                        <span className={`pill ${item.item_group === 'altin' ? 'pill-altin' : item.item_group === 'doviz' ? 'pill-doviz' : 'pill-gumus'}`}>
                                                            {item.item_group === 'altin' ? '🥇 Altın' : item.item_group === 'doviz' ? '💱 Döviz' : '🥈 Gümüş'}
                                                        </span>
                                                    </div>
                                                    <div className="itd tr">
                                                        <div className="fiyat-cell">
                                                            <div className="fiyat-row"><span className="fiyat-lbl">A</span><span className="fiyat-val fiyat-eski">{item.old_buy || '—'}</span></div>
                                                            <div className="fiyat-row"><span className="fiyat-lbl">S</span><span className="fiyat-val fiyat-eski">{item.old_sell || '—'}</span></div>
                                                        </div>
                                                    </div>
                                                    <div className="itd tr">
                                                        <div className="fiyat-cell">
                                                            <div className="fiyat-row"><span className="fiyat-lbl">A</span><span className="fiyat-val fiyat-yeni" style={{ color: diffBuy > 0 ? '#10b981' : diffBuy < 0 ? '#ef4444' : '#94a3b8' }}>{item.new_buy || '—'}</span></div>
                                                            <div className="fiyat-row"><span className="fiyat-lbl">S</span><span className="fiyat-val fiyat-yeni" style={{ color: diffSell > 0 ? '#10b981' : diffSell < 0 ? '#ef4444' : '#94a3b8' }}>{item.new_sell || '—'}</span></div>
                                                        </div>
                                                    </div>
                                                    <div className="itd tc">
                                                        <div className="degisim-cell">
                                                            <span style={{ color: diffBuy > 0 ? '#10b981' : diffBuy < 0 ? '#ef4444' : '#475569' }}>{formatDiff(diffBuy)}</span>
                                                            <span style={{ color: diffSell > 0 ? '#10b981' : diffSell < 0 ? '#ef4444' : '#475569' }}>{formatDiff(diffSell)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div className="acc-footer">
                                            <span>{group.length} ürün güncellendi</span>
                                            <span>{new Date(first.created_at).toLocaleString('tr-TR')} · {first.source === 'manuel' ? '✏️ Manuel' : '🤖 API'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* SAYFALAMA */}
            {filteredAndGroupedHistory.length > 10 && (
                <div className="history-pagination" style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
                    <button
                        disabled={historyPage === 0}
                        onClick={() => setHistoryPage(prev => prev - 1)}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', color: '#94a3b8', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
                    >← Önceki</button>
                    {[...Array(Math.ceil(filteredAndGroupedHistory.length / 10))].map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setHistoryPage(i)}
                            style={{
                                background: historyPage === i ? '#D4AF37' : 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                color: historyPage === i ? '#000' : '#94a3b8',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: historyPage === i ? 'bold' : 'normal'
                            }}
                        >{i + 1}</button>
                    ))}
                    <button
                        disabled={historyPage >= Math.ceil(filteredAndGroupedHistory.length / 10) - 1}
                        onClick={() => setHistoryPage(prev => prev + 1)}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', color: '#94a3b8', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
                    >Sonraki →</button>
                </div>
            )}
        </div>
    );
};

export default HistoryPanel;
