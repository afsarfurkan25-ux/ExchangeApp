import React, { useRef } from 'react';
import type { Rate, TickerItem } from '../../context/ExchangeContext';

// ─── Shared styles ─────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#fff',
    outline: 'none',
    fontSize: '14px',
    transition: 'all 0.3s',
};

const sectionStyle: React.CSSProperties = {
    background: 'rgba(20, 28, 50, 0.8)',
    borderRadius: '16px',
    border: '1px solid rgba(212, 167, 49, 0.15)',
    padding: '28px',
    backdropFilter: 'blur(10px)',
};

const sectionTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 700,
    color: '#F5D56E',
    marginBottom: '20px',
    letterSpacing: '0.05em',
};

const sectionHeaderStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
};

const addButtonStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #D4A731, #8B6914)',
    color: '#0a0e1a',
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 700,
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
};

const thStyle: React.CSSProperties = {
    padding: '12px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: '#5A6480',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    whiteSpace: 'nowrap',
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#5A6480',
    marginBottom: '8px',
    letterSpacing: '0.08em',
};

const saveButtonStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #D4A731, #8B6914)',
    color: '#0a0e1a',
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    alignSelf: 'flex-start',
    marginTop: '10px',
};

// ─── Props ──────────────────────────────────────────────────────────────────
interface RateManagementProps {
    // Settings
    localShopName: string;
    setLocalShopName: (v: string) => void;
    localTicker: string;
    setLocalTicker: (v: string) => void;
    handleSaveSettings: () => void;

    // Font size
    localFontSize: number;
    setLocalFontSize: (v: number) => void;
    settings: { displayFontSize?: number; shopName: string; scrollingText: string;[key: string]: any };
    updateSettings: (s: any) => void;

    // Rates
    localRates: Rate[];
    setLocalRates: React.Dispatch<React.SetStateAction<Rate[]>>;
    handleRateChange: (index: number, field: 'buy' | 'sell' | 'name', value: string) => void;
    handleAddRate: () => void;
    handleDeleteRate: (index: number) => void;
    handleToggleRateVisibility: (index: number) => void;
    moveRate: (index: number, direction: 'up' | 'down') => void;

    // Bulk adjustments
    bulkBuyAmount: number;
    setBulkBuyAmount: React.Dispatch<React.SetStateAction<number>>;
    bulkSellAmount: number;
    setBulkSellAmount: React.Dispatch<React.SetStateAction<number>>;
    buyAnim: boolean;
    sellAnim: boolean;
    buyOverlayAnim: boolean;
    sellOverlayAnim: boolean;
    animateBuy: () => void;
    animateSell: () => void;
    handleBuySave: () => void;
    handleSellSave: () => void;

    // Percent bulk
    bulkPercentage: string;
    setBulkPercentage: React.Dispatch<React.SetStateAction<string>>;
    percentAnim: boolean;
    updateOverlayAnim: boolean;
    handlePercentIncrease: () => void;
    handlePercentDecrease: () => void;
    handlePercentReset: () => void;
    handleBulkUpdate: () => void;

    // Ticker items
    localTickerItems: TickerItem[];
    handleTickerChange: (index: number, field: string, value: string | boolean) => void;
    handleAddTickerItem: () => void;
    handleDeleteTickerItem: (index: number) => void;
    handleToggleTickerItemVisibility: (index: number) => void;
    moveTicker: (index: number, direction: 'left' | 'right') => void;
}

// ─── Component ──────────────────────────────────────────────────────────────
const RateManagement: React.FC<RateManagementProps> = ({
    localShopName, setLocalShopName,
    localTicker, setLocalTicker,
    handleSaveSettings,
    localFontSize, setLocalFontSize, settings, updateSettings,
    localRates, setLocalRates,
    handleRateChange, handleAddRate, handleDeleteRate, handleToggleRateVisibility, moveRate,
    bulkBuyAmount, setBulkBuyAmount,
    bulkSellAmount, setBulkSellAmount,
    buyAnim, sellAnim, buyOverlayAnim, sellOverlayAnim,
    animateBuy, animateSell, handleBuySave, handleSellSave,
    bulkPercentage, percentAnim, updateOverlayAnim,
    handlePercentIncrease, handlePercentDecrease, handlePercentReset, handleBulkUpdate,
    localTickerItems,
    handleTickerChange, handleAddTickerItem, handleDeleteTickerItem,
    handleToggleTickerItemVisibility, moveTicker,
}) => {
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [tableWidth, setTableWidth] = React.useState<number | null>(null);

    const startResize = React.useCallback((e: React.MouseEvent, side: 'left' | 'right') => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = tableContainerRef.current?.offsetWidth ?? 800;
        const onMouseMove = (mv: MouseEvent) => {
            if (side === 'right') {
                setTableWidth(Math.max(400, startWidth + (mv.clientX - startX)));
            } else {
                setTableWidth(Math.max(400, startWidth + (startX - mv.clientX)));
            }
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, []);

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
            {/* Genel Ayarlar */}
            <section style={sectionStyle}>
                <h2 style={sectionTitleStyle}>Genel Ayarlar</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={labelStyle}>DÜKKAN İSMİ</label>
                        <input
                            type="text"
                            style={inputStyle}
                            value={localShopName}
                            onChange={(e) => setLocalShopName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>BİLGİLENDİRME</label>
                        <textarea
                            style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                            value={localTicker}
                            onChange={(e) => setLocalTicker(e.target.value)}
                        />
                    </div>
                    <button onClick={handleSaveSettings} style={saveButtonStyle}>
                        AYARLARI KAYDET
                    </button>
                </div>
            </section>

            {/* Fiyat Yönetimi */}
            <section style={sectionStyle}>
                <div style={sectionHeaderStyle}>
                    <h2 style={{ ...sectionTitleStyle, marginBottom: 0 }}>Fiyat Yönetimi</h2>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {/* Font Size Control */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ color: '#5A6480', fontSize: '13px', fontWeight: 600 }}>Yazı Boyutu:</span>
                            <div style={{ color: '#F5D56E', fontWeight: 700, fontSize: '13px', minWidth: '40px', textAlign: 'center' }}>
                                %{localFontSize}
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                    onClick={() => {
                                        const newVal = Math.max(50, localFontSize - 5);
                                        setLocalFontSize(newVal);
                                        updateSettings({ ...settings, displayFontSize: newVal });
                                    }}
                                    style={{ background: 'rgba(255,255,255,0.05)', color: '#C8D4E8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >-</button>
                                <button
                                    onClick={() => {
                                        const newVal = Math.min(200, localFontSize + 5);
                                        setLocalFontSize(newVal);
                                        updateSettings({ ...settings, displayFontSize: newVal });
                                    }}
                                    style={{ background: 'rgba(255,255,255,0.05)', color: '#C8D4E8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >+</button>
                            </div>
                        </div>
                        <button onClick={handleAddRate} style={addButtonStyle}>
                            <span>+</span> Yeni Ekle
                        </button>
                    </div>
                </div>
                <div
                    ref={tableContainerRef}
                    style={{
                        position: 'relative',
                        width: tableWidth ? `${tableWidth}px` : '100%',
                        minWidth: '400px',
                        maxWidth: '100%',
                        margin: '0 auto',
                        boxSizing: 'border-box',
                    }}
                >
                    {/* Sol resize tutacağı */}
                    <div
                        onMouseDown={(e) => startResize(e, 'left')}
                        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', cursor: 'ew-resize', zIndex: 10, background: 'linear-gradient(to right, rgba(96,165,250,0.4), transparent)', borderRadius: '4px 0 0 4px' }}
                        title="Sola sürükleyerek genişlet"
                    />
                    {/* Sağ resize tutacağı */}
                    <div
                        onMouseDown={(e) => startResize(e, 'right')}
                        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '6px', cursor: 'ew-resize', zIndex: 10, background: 'linear-gradient(to left, rgba(96,165,250,0.4), transparent)', borderRadius: '0 4px 4px 0' }}
                        title="Sağa sürükleyerek genişlet"
                    />
                    <div style={{ overflowX: 'auto' }}>
                        <style dangerouslySetInnerHTML={{
                            __html: `
                    .pc-counter-box{position:relative;display:flex;align-items:center;gap:8px;background:#1e293b;padding:8px 14px;border-radius:14px;box-shadow:0 6px 15px rgba(0,0,0,0.4);margin: 0 auto;}
                    .pc-btn{height:30px;border:none;border-radius:8px;font-size:15px;font-weight:bold;cursor:pointer;transition:all 0.2s ease;color:white;padding:0 10px;display:flex;align-items:center;justify-content:center;}
                    .pc-btn-minus{background:#ef4444;width:30px;}
                    .pc-btn-plus{background:#22c55e;width:30px;}
                    .pc-btn-reset{background:#3b82f6;font-size:12px;}
                    .pc-btn-save{width:30px;background:#f97316;color:white;border:none;}
                    .pc-btn-save:hover{background:#ea6c0a;color:white;}
                    .pc-btn:hover{transform:scale(1.1);box-shadow:0 5px 15px rgba(0,0,0,0.4);}
                    .pc-count{font-size:16px;font-weight:bold;color:white;min-width:50px;text-align:center;background:transparent;border:none;outline:none;transition:0.2s;-moz-appearance: textfield;}
                    .pc-count::-webkit-outer-spin-button,.pc-count::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}
                    .pc-count:focus{color:#facc15;}
                    .pc-percent{font-size:16px;font-weight:bold;min-width:50px;text-align:center;transition:0.2s;}
                    .pc-percent.positive{color:#22c55e;}
                    .pc-percent.negative{color:#ef4444;}
                    .pc-percent.zero{color:white;}
                    .pc-percent.animate{transform:scale(1.3);color:#facc15 !important;}
                    .pc-update-overlay{position:absolute;inset:0;background:#16a34a;border-radius:20px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:bold;color:white;opacity:0;pointer-events:none;transition:opacity 0.3s ease;z-index:10;}
                    .pc-update-overlay.active{opacity:1;pointer-events:auto;}
                    `}} />
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={{ ...thStyle, width: '40px' }}></th>
                                    <th style={{ ...thStyle, color: '#F5D56E' }}>ÜRÜN / DÖVİZ</th>
                                    <th style={{ ...thStyle, color: '#F5D56E', width: '100px' }}>TÜR</th>
                                    <th style={{ ...thStyle, verticalAlign: 'middle', paddingTop: '6px', paddingBottom: '6px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', flexWrap: 'nowrap' }}>
                                            <span style={{ whiteSpace: 'nowrap', fontSize: '13px', fontWeight: 700, letterSpacing: '0.05em', color: '#F5D56E', textTransform: 'uppercase', lineHeight: 1 }}>ALIŞ FİYATI</span>
                                            <div className="pc-counter-box">
                                                <button className="pc-btn pc-btn-minus" onClick={() => { setBulkBuyAmount(prev => prev - 1); animateBuy(); }}>−</button>
                                                <div className={`pc-count${buyAnim ? ' animate' : ''}`}>{bulkBuyAmount}</div>
                                                <button className="pc-btn pc-btn-plus" onClick={() => { setBulkBuyAmount(prev => prev + 1); animateBuy(); }}>+</button>
                                                <button className="pc-btn pc-btn-save" onClick={handleBuySave}>✓</button>
                                                <button className="pc-btn pc-btn-reset" onClick={() => { setBulkBuyAmount(0); animateBuy(); }}>Sıfırla</button>
                                                <div className={`pc-update-overlay${buyOverlayAnim ? ' active' : ''}`}>Güncellendi</div>
                                            </div>
                                        </div>
                                    </th>
                                    <th style={{ ...thStyle, verticalAlign: 'middle', paddingTop: '6px', paddingBottom: '6px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', flexWrap: 'nowrap' }}>
                                            <span style={{ whiteSpace: 'nowrap', fontSize: '13px', fontWeight: 700, letterSpacing: '0.05em', color: '#F5D56E', textTransform: 'uppercase', lineHeight: 1 }}>SATIŞ FİYATI</span>
                                            <div className="pc-counter-box">
                                                <button className="pc-btn pc-btn-minus" onClick={() => { setBulkSellAmount(prev => prev - 1); animateSell(); }}>−</button>
                                                <div className={`pc-count${sellAnim ? ' animate' : ''}`}>{bulkSellAmount}</div>
                                                <button className="pc-btn pc-btn-plus" onClick={() => { setBulkSellAmount(prev => prev + 1); animateSell(); }}>+</button>
                                                <button className="pc-btn pc-btn-save" onClick={handleSellSave}>✓</button>
                                                <button className="pc-btn pc-btn-reset" onClick={() => { setBulkSellAmount(0); animateSell(); }}>Sıfırla</button>
                                                <div className={`pc-update-overlay${sellOverlayAnim ? ' active' : ''}`}>Güncellendi</div>
                                            </div>
                                            <div className="pc-counter-box">
                                                <button className="pc-btn pc-btn-minus" onClick={handlePercentDecrease}>−</button>
                                                <div className={`pc-percent ${parseInt(bulkPercentage || '0') > 0 ? 'positive' : parseInt(bulkPercentage || '0') < 0 ? 'negative' : 'zero'}${percentAnim ? ' animate' : ''}`}>
                                                    {bulkPercentage || '0'}%
                                                </div>
                                                <button className="pc-btn pc-btn-plus" onClick={handlePercentIncrease}>+</button>
                                                <button className="pc-btn pc-btn-save" onClick={handleBulkUpdate}>✓</button>
                                                <button className="pc-btn pc-btn-reset" onClick={handlePercentReset}>Sıfırla</button>
                                                <div className={`pc-update-overlay${updateOverlayAnim ? ' active' : ''}`}>Güncellendi</div>
                                            </div>
                                        </div>
                                    </th>
                                    <th style={{ ...thStyle, color: '#F5D56E', width: '80px' }}>DEĞİŞİM</th>
                                    <th style={{ ...thStyle, textAlign: 'center', color: '#F5D56E', width: '60px' }}>GÖRÜNÜR</th>
                                    <th style={{ ...thStyle, width: '40px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {localRates.map((rate, index) => (
                                    <tr key={index}>
                                        <td style={{ padding: '8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                                                <button
                                                    onClick={() => moveRate(index, 'up')}
                                                    disabled={index === 0}
                                                    style={{ background: 'transparent', border: 'none', color: index === 0 ? '#333' : '#60A5FA', cursor: index === 0 ? 'default' : 'pointer', fontSize: '12px', padding: '2px', lineHeight: 1 }}
                                                >▲</button>
                                                <button
                                                    onClick={() => moveRate(index, 'down')}
                                                    disabled={index === localRates.length - 1}
                                                    style={{ background: 'transparent', border: 'none', color: index === localRates.length - 1 ? '#333' : '#60A5FA', cursor: index === localRates.length - 1 ? 'default' : 'pointer', fontSize: '12px', padding: '2px', lineHeight: 1 }}
                                                >▼</button>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px', color: '#C8D4E8', fontWeight: 500 }}>
                                            <input
                                                type="text"
                                                style={{ ...inputStyle, padding: '8px 12px', width: '100%' }}
                                                value={rate.name}
                                                onChange={(e) => handleRateChange(index, 'name', e.target.value)}
                                            />
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <select
                                                style={{ ...inputStyle, padding: '8px 12px' }}
                                                value={rate.type}
                                                onChange={(e) => {
                                                    const newRates = [...localRates];
                                                    newRates[index] = { ...newRates[index], type: e.target.value as 'gold' | 'currency' };
                                                    setLocalRates(newRates);
                                                }}
                                            >
                                                <option value="gold" style={{ background: '#0a0e1a' }}>🥇 Altın</option>
                                                <option value="currency" style={{ background: '#0a0e1a' }}>💱 Döviz</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <input
                                                type="text"
                                                style={{ ...inputStyle, padding: '8px 12px' }}
                                                value={rate.buy}
                                                onChange={(e) => handleRateChange(index, 'buy', e.target.value)}
                                            />
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <input
                                                type="text"
                                                style={{ ...inputStyle, padding: '8px 12px' }}
                                                value={rate.sell}
                                                onChange={(e) => handleRateChange(index, 'sell', e.target.value)}
                                            />
                                        </td>
                                        <td style={{ padding: '12px', fontSize: '13px', fontWeight: 600 }}>
                                            <span style={{ color: (parseFloat(rate.change || '0') > 0) ? '#4ADE80' : (parseFloat(rate.change || '0') < 0) ? '#F87171' : '#8B97B8' }}>
                                                %{rate.change || '0.00'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <input
                                                type="checkbox"
                                                checked={rate.isVisible !== false}
                                                onChange={() => handleToggleRateVisibility(index)}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#D4A731' }}
                                            />
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <button
                                                onClick={() => handleDeleteRate(index)}
                                                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#F87171', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                title="Sil"
                                            >🗑</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>{/* /resizable wrapper */}
            </section>

            {/* Alt Bant Veri Yönetimi */}
            <section style={{ ...sectionStyle, marginTop: '20px' }}>
                <div style={sectionHeaderStyle}>
                    <h2 style={{ ...sectionTitleStyle, marginBottom: 0 }}>Alt Bant Veri Yönetimi</h2>
                    <button onClick={handleAddTickerItem} style={addButtonStyle}>
                        <span>+</span> Yeni Ekle
                    </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ ...thStyle, width: '40px' }}></th>
                                <th style={thStyle}>Ürün Adı</th>
                                <th style={thStyle}>Değer</th>
                                <th style={thStyle}>Değişim (%)</th>
                                <th style={thStyle}>Yön</th>
                                <th style={{ ...thStyle, textAlign: 'center', width: '60px' }}>Görünür</th>
                                <th style={{ ...thStyle, width: '40px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {localTickerItems.map((item, index) => (
                                <tr key={index}>
                                    <td style={{ padding: '8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <button
                                                onClick={() => moveTicker(index, 'left')}
                                                disabled={index === 0}
                                                style={{ background: 'transparent', border: 'none', color: index === 0 ? '#333' : '#60A5FA', cursor: index === 0 ? 'default' : 'pointer', fontSize: '16px', padding: '4px', lineHeight: 1 }}
                                                title="Sola (Öne) Taşı"
                                            >◄</button>
                                            <button
                                                onClick={() => moveTicker(index, 'right')}
                                                disabled={index === localTickerItems.length - 1}
                                                style={{ background: 'transparent', border: 'none', color: index === localTickerItems.length - 1 ? '#333' : '#60A5FA', cursor: index === localTickerItems.length - 1 ? 'default' : 'pointer', fontSize: '16px', padding: '4px', lineHeight: 1 }}
                                                title="Sağa (Arkaya) Taşı"
                                            >►</button>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <input type="text" style={{ ...inputStyle, padding: '8px 12px' }} value={item.name} onChange={(e) => handleTickerChange(index, 'name', e.target.value)} />
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <input type="text" style={{ ...inputStyle, padding: '8px 12px' }} value={item.value} onChange={(e) => handleTickerChange(index, 'value', e.target.value)} />
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <input type="text" style={{ ...inputStyle, padding: '8px 12px', background: 'rgba(255,255,255,0.05)', cursor: 'default', color: '#9CA3AF' }} value={item.change} readOnly title="Otomatik hesaplanır" />
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <select style={{ ...inputStyle, padding: '8px 12px', background: 'rgba(255,255,255,0.05)', cursor: 'default', color: '#9CA3AF' }} value={item.isUp ? 'true' : 'false'} disabled title="Otomatik hesaplanır">
                                            <option value="true" style={{ background: '#0a0e1a' }}>Yukarı (▲)</option>
                                            <option value="false" style={{ background: '#0a0e1a' }}>Aşağı (▼)</option>
                                        </select>
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        <input type="checkbox" checked={item.isVisible !== false} onChange={() => handleToggleTickerItemVisibility(index)} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#D4A731' }} />
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => handleDeleteTickerItem(index)}
                                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#F87171', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            title="Sil"
                                        >🗑</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default RateManagement;
