import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useExchange } from '../../hooks/useExchange';

interface ChartSlide {
    title: string;
    icon: string;
    currentPrice: string;
    change: string;
    isUp: boolean;
    data: number[];
}

// Generate realistic-looking mock weekly data (7 days, multiple points per day)
const generateMockData = (basePrice: number, volatility: number): number[] => {
    const points: number[] = [];
    let price = basePrice * (1 - volatility * 2);
    for (let i = 0; i < 28; i++) {
        const trend = (i / 28) * volatility * basePrice * 2;
        const noise = (Math.random() - 0.45) * volatility * basePrice * 0.8;
        price = basePrice * (1 - volatility * 2) + trend + noise;
        points.push(price);
    }
    return points;
};

const InfoCarousel: React.FC = () => {
    const { rates } = useExchange();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');

    const slides: ChartSlide[] = useMemo(() => {
        const targetRates = [
            { name: 'Gram Altın', icon: '🥇' },
            { name: '22 Ayar Bilezik', icon: '💍' },
            { name: 'Çeyrek Altın', icon: '🪙' },
            { name: 'Amerikan Doları', icon: '💵' },
            { name: 'Euro', icon: '💶' },
            { name: 'Gümüş (Gram)', icon: '🥈' },
        ];

        return targetRates.map(target => {
            const rate = rates.find(r => r.name === target.name);
            if (!rate || rate.isVisible === false) return null;

            const price = parseFloat(rate.sell.replace('.', '').replace(',', '.'));
            const randomChange = (Math.random() * 2 - 1);
            const isUp = randomChange >= 0;

            return {
                title: target.name,
                icon: target.icon,
                currentPrice: rate.sell,
                change: `${isUp ? '+' : ''}${randomChange.toFixed(2)}%`,
                isUp: isUp,
                data: generateMockData(price, 0.02), // Generate chart ending at current price
            };
        }).filter((s): s is ChartSlide => s !== null);
    }, [rates]);

    const nextSlide = useCallback(() => {
        setSlideDirection('left');
        setIsAnimating(true);
        setTimeout(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
            setIsAnimating(false);
        }, 500);
    }, [slides.length]);

    useEffect(() => {
        // Only run interval if we have more than 1 slide
        if (slides.length <= 1) return;

        const interval = setInterval(nextSlide, 10000);
        return () => clearInterval(interval);
    }, [nextSlide, slides.length]);

    if (slides.length === 0) return null;

    const renderChart = (data: number[], isUp: boolean) => {
        const width = 270;
        const height = 130;
        const padding = { top: 10, right: 10, bottom: 20, left: 40 };
        const chartW = width - padding.left - padding.right;
        const chartH = height - padding.top - padding.bottom;

        const minVal = Math.min(...data);
        const maxVal = Math.max(...data);
        const range = maxVal - minVal || 1;

        const points = data.map((val, i) => {
            const x = padding.left + (i / (data.length - 1)) * chartW;
            const y = padding.top + chartH - ((val - minVal) / range) * chartH;
            return { x, y };
        });

        const pathD = points.map((p, i) => {
            if (i === 0) return `M ${p.x} ${p.y}`;
            const prev = points[i - 1];
            const cpx1 = prev.x + (p.x - prev.x) * 0.4;
            const cpx2 = prev.x + (p.x - prev.x) * 0.6;
            return `C ${cpx1} ${prev.y} ${cpx2} ${p.y} ${p.x} ${p.y}`;
        }).join(' ');

        // Gradient fill path
        const lastPoint = points[points.length - 1];
        const firstPoint = points[0];
        const fillD = `${pathD} L ${lastPoint.x} ${padding.top + chartH} L ${firstPoint.x} ${padding.top + chartH} Z`;

        // Y-axis labels (4 ticks)
        const yLabels = [];
        for (let i = 0; i <= 3; i++) {
            const val = minVal + (range * i) / 3;
            const y = padding.top + chartH - (i / 3) * chartH;
            yLabels.push({ val, y });
        }

        // X-axis labels (days)
        const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
        const today = new Date().getDay();
        const orderedDays = [];
        for (let i = 6; i >= 0; i--) {
            orderedDays.push(days[(today - i + 7) % 7]);
        }

        const lineColor = '#D4A731';

        return (
            <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
                <defs>
                    <linearGradient id={`chartGrad-${isUp}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
                        <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Grid lines */}
                {yLabels.map((label, i) => (
                    <g key={i}>
                        <line
                            x1={padding.left} y1={label.y}
                            x2={padding.left + chartW} y2={label.y}
                            stroke="rgba(255,255,255,0.06)" strokeWidth="1"
                        />
                        <text
                            x={padding.left - 4} y={label.y + 3}
                            fill="#5A6480" fontSize="8" textAnchor="end"
                            fontFamily="'JetBrains Mono', monospace"
                        >
                            {label.val >= 100 ? Math.round(label.val).toLocaleString('tr-TR') : label.val.toFixed(2)}
                        </text>
                    </g>
                ))}

                {/* X-axis day labels */}
                {orderedDays.map((day, i) => (
                    <text
                        key={i}
                        x={padding.left + (i / 6) * chartW}
                        y={height - 4}
                        fill="#5A6480" fontSize="8" textAnchor="middle"
                        fontFamily="'JetBrains Mono', monospace"
                    >
                        {day}
                    </text>
                ))}

                {/* Area fill */}
                <path d={fillD} fill={`url(#chartGrad-${isUp})`} />

                {/* Main line */}
                <path
                    d={pathD}
                    fill="none"
                    stroke={lineColor}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glow)"
                />

                {/* End dot */}
                <circle
                    cx={lastPoint.x} cy={lastPoint.y}
                    r="3" fill={lineColor}
                    filter="url(#glow)"
                />
                <circle
                    cx={lastPoint.x} cy={lastPoint.y}
                    r="6" fill="none" stroke={lineColor}
                    strokeWidth="1" opacity="0.4"
                />
            </svg>
        );
    };

    const slide = slides[currentSlide];

    return (
        <div style={{
            background: 'linear-gradient(145deg, rgba(20, 28, 50, 0.8), rgba(15, 20, 40, 0.9))',
            borderRadius: '12px',
            border: '1px solid rgba(212, 167, 49, 0.12)',
            overflow: 'hidden',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
        }}>
            {/* Slide content */}
            <div
                style={{
                    padding: '16px',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxSizing: 'border-box',
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    opacity: isAnimating ? 0 : 1,
                    transform: isAnimating
                        ? `translateX(${slideDirection === 'left' ? '-30px' : '30px'})`
                        : 'translateX(0)',
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>{slide.icon}</span>
                        <div>
                            <div style={{
                                fontFamily: "'Playfair Display', serif",
                                fontSize: '14px',
                                fontWeight: 700,
                                color: '#F5D56E',
                            }}>{slide.title}</div>
                            <div style={{
                                fontSize: '10px',
                                color: '#5A6480',
                                fontFamily: "'JetBrains Mono', monospace",
                            }}>Son 1 Hafta</div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: '16px',
                            fontWeight: 700,
                            color: '#C8D4E8',
                        }}>₺{slide.currentPrice}</div>
                        <div style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: '12px',
                            fontWeight: 700,
                            color: slide.isUp ? '#22C55E' : '#EF4444',
                        }}>
                            {slide.isUp ? '▲' : '▼'} {slide.change}
                        </div>
                    </div>
                </div>

                {/* Chart */}
                <div style={{
                    flex: 1,
                    background: 'rgba(10, 14, 26, 0.6)',
                    borderRadius: '10px',
                    border: '1px solid rgba(212, 167, 49, 0.08)',
                    padding: '8px 4px 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '140px'
                }}>
                    {renderChart(slide.data, slide.isUp)}
                </div>
            </div>

            {/* Slide indicators */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '5px',
                paddingBottom: '10px',
            }}>
                {slides.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => {
                            if (i === currentSlide) return;
                            setSlideDirection(i > currentSlide ? 'left' : 'right');
                            setIsAnimating(true);
                            setTimeout(() => {
                                setCurrentSlide(i);
                                setIsAnimating(false);
                            }, 500);
                        }}
                        style={{
                            width: i === currentSlide ? '20px' : '6px',
                            height: '6px',
                            borderRadius: '3px',
                            border: 'none',
                            background: i === currentSlide
                                ? 'linear-gradient(90deg, #D4A731, #F5D56E)'
                                : 'rgba(139, 151, 184, 0.3)',
                            cursor: 'pointer',
                            padding: 0,
                            transition: 'all 0.3s ease',
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default InfoCarousel;
