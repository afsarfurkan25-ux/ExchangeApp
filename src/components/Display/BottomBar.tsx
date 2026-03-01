import React from 'react';
import Ticker from './Ticker';

interface BottomBarProps {
    hasValue?: string;
    hasChange?: string;
    onsValue?: string;
    onsChange?: string;
}

const BottomBar: React.FC<BottomBarProps> = ({
    hasValue = '—',
    hasChange = '0.00',
    onsValue = '—',
    onsChange = '0.00'
}) => {
    const getChangeColor = (changeStr: string) => {
        const val = parseFloat(changeStr);
        if (isNaN(val) || val === 0) return '#C8D4E8'; // Neutral
        return val > 0 ? '#22C55E' : '#EF4444'; // Green / Red
    };

    const getChangeBg = (changeStr: string) => {
        const val = parseFloat(changeStr);
        if (isNaN(val) || val === 0) return 'rgba(139, 151, 184, 0.1)';
        return val > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';
    };

    return (
        <div className="bottom-bar-wrapper" style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            padding: '8px 24px',
            background: 'linear-gradient(135deg, rgba(20, 28, 50, 0.95), rgba(10, 14, 26, 0.95))',
            borderTop: '1px solid rgba(212, 167, 49, 0.15)',
            gap: '30px'
        }}>
            {/* Live Data Block (Has & ONS) */}
            <div className="bottom-bar-live-data" style={{ display: 'flex', alignItems: 'center', gap: '30px', flexShrink: 0 }}>
                {/* Has value */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="bottom-bar-label" style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'rgba(212, 167, 49, 0.6)',
                        textTransform: 'uppercase',
                        letterSpacing: '1.5px'
                    }}>
                        Has
                    </span>
                    <span className="bottom-bar-val" style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '16px',
                        fontWeight: 700,
                        color: '#F5D56E'
                    }}>
                        {hasValue}
                    </span>
                    <span className="bottom-bar-change" style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '11px',
                        fontWeight: 600,
                        color: getChangeColor(hasChange),
                        background: getChangeBg(hasChange),
                        padding: '2px 4px',
                        borderRadius: '4px'
                    }}>
                        %{hasChange}
                    </span>
                </div>

                {/* Vertical Divider */}
                <div style={{ width: '1px', height: '16px', background: 'rgba(212, 167, 49, 0.2)' }}></div>

                {/* ONS value */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="bottom-bar-label" style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'rgba(212, 167, 49, 0.6)',
                        textTransform: 'uppercase',
                        letterSpacing: '1.5px'
                    }}>
                        ONS
                    </span>
                    <span className="bottom-bar-val" style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '16px',
                        fontWeight: 700,
                        color: '#F5D56E'
                    }}>
                        {onsValue}
                    </span>
                    <span className="bottom-bar-change" style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '11px',
                        fontWeight: 600,
                        color: getChangeColor(onsChange),
                        background: getChangeBg(onsChange),
                        padding: '2px 4px',
                        borderRadius: '4px'
                    }}>
                        %{onsChange}
                    </span>
                </div>
            </div>

            {/* Ticker - Takes remaining space */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                <Ticker />
            </div>

            {/* Brand */}
            <div className="bottom-bar-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <img src="/Kurmatiklogo.png" alt="kurmatik.net" style={{
                    height: '28px',
                    width: 'auto',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
                }} />
                <span style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'rgba(212, 167, 49, 0.4)',
                    letterSpacing: '1px'
                }}>
                    kurmatik.net
                </span>
            </div>
        </div>
    );
};

export default BottomBar;
