import React, { useState, useEffect, useRef } from 'react';
import { type Rate } from '../../context/ExchangeContext';
import { useExchange } from '../../hooks/useExchange';

interface RateTableProps {
    rates: Rate[];
}

// Currency icon mapping
const getCurrencyIcon = (name: string): { icon: string; iconClass: string } => {
    const iconMap: { [key: string]: { icon: string; iconClass: string } } = {
        '24 Ayar (Has) Gram': { icon: '24', iconClass: 'gold' },
        '22 Ayar Bilezik': { icon: '22', iconClass: 'gold' },
        '18 Ayar': { icon: '18', iconClass: 'gold' },
        '14 Ayar': { icon: '14', iconClass: 'gold' },
        'Gram Altın': { icon: 'gr', iconClass: 'gold' },
        'Çeyrek Altın': { icon: '¼', iconClass: 'gold' },
        'Yarım Altın': { icon: '½', iconClass: 'gold' },
        'Tam Altın': { icon: 'T', iconClass: 'gold' },
        'Cumhuriyet Altını': { icon: 'C', iconClass: 'gold' },
        'Ata Altın': { icon: 'A', iconClass: 'gold' },
        'Gremse (2.5)': { icon: '2½', iconClass: 'gold' },
        'Gümüş (Gram)': { icon: 'Ag', iconClass: 'silver' },
        'Amerikan Doları': { icon: '$', iconClass: 'currency' },
        'Euro': { icon: '€', iconClass: 'green' },
        'İngiliz Sterlini': { icon: '£', iconClass: 'currency' },
    };
    return iconMap[name] || { icon: name.substring(0, 2).toUpperCase(), iconClass: 'gold' };
};

const iconClassStyles: { [key: string]: React.CSSProperties } = {
    gold: { background: 'rgba(245, 213, 110, 0.15)', color: '#F5D56E' },
    silver: { background: 'rgba(168, 178, 209, 0.15)', color: '#A8B2D1' },
    currency: { background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' },
    green: { background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E' },
};

const RateTable: React.FC<RateTableProps> = ({ rates }) => {
    const { settings } = useExchange();
    const fontScale = (settings.displayFontSize || 100) / 100;
    const [previousRates, setPreviousRates] = useState<{ [key: string]: { buy: string; sell: string } }>({});
    const [flashStates, setFlashStates] = useState<{ [key: string]: { buy?: 'up' | 'down'; sell?: 'up' | 'down' } }>({});
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            const initial: { [key: string]: { buy: string; sell: string } } = {};
            rates.forEach(rate => {
                initial[rate.name] = { buy: rate.buy, sell: rate.sell };
            });
            setPreviousRates(initial);
            return;
        }

        const newFlashStates: { [key: string]: { buy?: 'up' | 'down'; sell?: 'up' | 'down' } } = {};

        rates.forEach(rate => {
            const prev = previousRates[rate.name];
            if (prev) {
                if (rate.buy !== prev.buy) {
                    newFlashStates[rate.name] = { ...newFlashStates[rate.name], buy: parseFloat(rate.buy) > parseFloat(prev.buy) ? 'up' : 'down' };
                }
                if (rate.sell !== prev.sell) {
                    newFlashStates[rate.name] = { ...newFlashStates[rate.name], sell: parseFloat(rate.sell) > parseFloat(prev.sell) ? 'up' : 'down' };
                }
            }
        });

        setFlashStates(newFlashStates);

        const newPrevious: { [key: string]: { buy: string; sell: string } } = {};
        rates.forEach(rate => {
            newPrevious[rate.name] = { buy: rate.buy, sell: rate.sell };
        });
        setPreviousRates(newPrevious);

        const timer = setTimeout(() => setFlashStates({}), 1500);
        return () => clearTimeout(timer);
    }, [rates]);

    // Split rates into gold and currency based on type and visibility
    const goldRates = rates.filter(r => r.type === 'gold' && r.isVisible !== false);
    const currencyRates = rates.filter(r => r.type === 'currency' && r.isVisible !== false);

    return (
        <div className="rate-table-wrapper" style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(145deg, rgba(20, 28, 50, 0.8), rgba(15, 20, 40, 0.9))',
            borderRadius: '12px',
            border: '1px solid rgba(212, 167, 49, 0.12)',
            overflow: 'hidden',
            marginRight: '8px'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 16px',
                background: 'linear-gradient(135deg, rgba(212, 167, 49, 0.12), rgba(212, 167, 49, 0.04))',
                borderBottom: '1px solid rgba(212, 167, 49, 0.15)'
            }}>
                <div style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#F5D56E',
                    letterSpacing: '2px',
                    textTransform: 'uppercase'
                }}>
                    ÜRÜN LİSTESİ
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#22C55E'
                }}>
                    <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#22C55E',
                        animation: 'blink 1.5s ease infinite'
                    }}></span>
                    <span>CANLI</span>
                </div>
            </div>

            {/* Table */}
            <div style={{
                flex: 1,
                overflow: 'auto',
                padding: '0 4px',
                display: 'flex',
                flexDirection: 'column',
            }}>
                <table style={{
                    width: '100%',
                    height: '100%',
                    borderCollapse: 'separate',
                    borderSpacing: '0 2px'
                }}>
                    <thead>
                        <tr>
                            <th style={thStyle} className="rt-th">Ürün</th>
                            <th style={{ ...thStyle, ...thCenterStyle, color: '#3B82F6' }} className="rt-th">Alış</th>
                            <th style={{ ...thStyle, ...thCenterStyle, color: '#F5D56E' }} className="rt-th">Satış</th>
                            <th style={{ ...thStyle, ...thCenterStyle, color: '#8B97B8' }} className="rt-th">Değişim</th>
                        </tr>
                    </thead>
                    <tbody>
                        {goldRates.map((rate, index) => (
                            <RateRow key={index} rate={rate} flashStates={flashStates} fontScale={fontScale} />
                        ))}
                        {currencyRates.length > 0 && (
                            <tr>
                                <td colSpan={4} style={{ padding: '2px 0', border: 'none', background: 'none' }}>
                                    <hr style={{
                                        border: 'none',
                                        height: '1px',
                                        background: 'linear-gradient(90deg, transparent, rgba(212, 167, 49, 0.2), transparent)'
                                    }} />
                                </td>
                            </tr>
                        )}
                        {currencyRates.map((rate, index) => (
                            <RateRow key={`curr-${index}`} rate={rate} flashStates={flashStates} fontScale={fontScale} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const RateRow: React.FC<{ rate: Rate; flashStates: any; fontScale: number }> = ({ rate, flashStates, fontScale }) => {
    const { icon, iconClass } = getCurrencyIcon(rate.name);
    const flash = flashStates[rate.name] || {};
    const changeVal = parseFloat(rate.change || '0');
    // Use real change value
    const changeClass = changeVal > 0 ? '#22C55E' : changeVal < 0 ? '#EF4444' : '#8B97B8';
    const changeIcon = changeVal > 0 ? '▲' : changeVal < 0 ? '▼' : '—';

    return (
        <tr style={{
            background: 'rgba(255,255,255,0.02)',
            transition: 'all 0.3s'
        }}>
            <td style={tdStyle} className="rt-td">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="rt-name-cell">
                    <span className="rt-icon" style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: `${14 * fontScale}px`,
                        fontWeight: 800,
                        flexShrink: 0,
                        ...iconClassStyles[iconClass]
                    }}>
                        {icon}
                    </span>
                    <span className="rt-name" style={{ color: '#C8D4E8', fontWeight: 600, fontSize: `${22 * fontScale}px`, fontFamily: "'Times New Roman', Times, serif" }}>{rate.name}</span>
                </div>
            </td>
            <td style={{
                ...tdStyle,
                ...tdCenterStyle,
                fontFamily: "'Times New Roman', Times, serif",
                fontSize: `${29 * fontScale}px`,
                fontWeight: 900,
                letterSpacing: '0.5px',
                color: '#7EB8FF'
            }} className={`rt-td rt-val ${flash.buy ? `flash-${flash.buy}` : ''}`}>
                {rate.buy}
            </td>
            <td style={{
                ...tdStyle,
                ...tdCenterStyle,
                fontFamily: "'Times New Roman', Times, serif",
                fontSize: `${29 * fontScale}px`,
                fontWeight: 900,
                letterSpacing: '0.5px',
                color: '#F5D56E'
            }} className={`rt-td rt-val ${flash.sell ? `flash-${flash.sell}` : ''}`}>
                {rate.sell}
            </td>
            <td style={{
                ...tdStyle,
                ...tdCenterStyle,
                fontFamily: "'Times New Roman', Times, serif",
                fontSize: `${16 * fontScale}px`,
                fontWeight: 600,
                color: changeClass
            }} className="rt-td rt-change">
                {changeIcon} %{Math.abs(changeVal).toFixed(2)}
            </td>
        </tr>
    );
};

const thStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: '16px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    color: '#8B97B8',
    textAlign: 'left',
    position: 'sticky',
    top: 0,
    zIndex: 2
};

const thCenterStyle: React.CSSProperties = {
    textAlign: 'center'
};

const tdStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: '22px',
    borderTop: '1px solid rgba(255,255,255,0.03)',
    borderBottom: '1px solid rgba(255,255,255,0.03)'
};

const tdCenterStyle: React.CSSProperties = {
    textAlign: 'center'
};

export default RateTable;
