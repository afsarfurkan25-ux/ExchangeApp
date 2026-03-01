import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const Clock: React.FC = () => {
    const [time, setTime] = useState(new Date());
    const [showingClock, setShowingClock] = useState(true);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const viewTimer = setInterval(() => {
            setShowingClock(prev => !prev);
        }, 30000); // Toggle every 30 seconds
        return () => clearInterval(viewTimer);
    }, []);

    const seconds = time.getSeconds();
    const minutes = time.getMinutes();
    const hours = time.getHours();

    const secondDeg = (seconds / 60) * 360;
    const minuteDeg = ((minutes + seconds / 60) / 60) * 360;
    const hourDeg = ((hours % 12 + minutes / 60) / 12) * 360;

    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

    // Create clock markers
    const markers = [];
    for (let i = 0; i < 60; i++) {
        markers.push(
            <div
                key={i}
                style={{
                    position: 'absolute',
                    top: '8px',
                    left: '50%',
                    transformOrigin: '0 67px',
                    width: i % 5 === 0 ? '3px' : '2px',
                    height: i % 5 === 0 ? '14px' : '10px',
                    background: i % 5 === 0 ? 'rgba(212, 167, 49, 0.7)' : 'rgba(212, 167, 49, 0.4)',
                    marginLeft: i % 5 === 0 ? '-1.5px' : '-1px',
                    transform: `rotate(${i * 6}deg)`
                }}
            />
        );
    }

    return (
        <div style={{
            background: 'linear-gradient(145deg, rgba(20, 28, 50, 0.8), rgba(15, 20, 40, 0.9))',
            borderRadius: '12px',
            border: '1px solid rgba(212, 167, 49, 0.12)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            minHeight: '250px'
        }}>
            {/* Clock View */}
            <div style={{
                transition: 'opacity 0.6s ease-in-out, transform 0.6s ease-in-out',
                opacity: showingClock ? 1 : 0,
                transform: showingClock ? 'scale(1)' : 'scale(0.95)',
                position: showingClock ? 'relative' : 'absolute',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                pointerEvents: showingClock ? 'auto' : 'none'
            }}>
                {/* Analog Clock */}
                <div style={{
                    width: '150px',
                    height: '150px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 40% 35%, #1E2645, #0F1428)',
                    border: '3px solid rgba(212, 167, 49, 0.3)',
                    position: 'relative',
                    boxShadow: '0 0 30px rgba(212, 167, 49, 0.08), inset 0 0 20px rgba(0,0,0,0.3)'
                }}>
                    {/* Clock markers */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                        {markers}
                    </div>

                    {/* Hour hand */}
                    <div style={{
                        position: 'absolute',
                        bottom: '50%',
                        left: '50%',
                        transformOrigin: 'bottom center',
                        borderRadius: '4px',
                        width: '4px',
                        height: '36px',
                        background: '#E8D9A8',
                        marginLeft: '-2px',
                        transform: `rotate(${hourDeg}deg)`
                    }} />

                    {/* Minute hand */}
                    <div style={{
                        position: 'absolute',
                        bottom: '50%',
                        left: '50%',
                        transformOrigin: 'bottom center',
                        borderRadius: '4px',
                        width: '3px',
                        height: '50px',
                        background: '#C8D4E8',
                        marginLeft: '-1.5px',
                        transform: `rotate(${minuteDeg}deg)`
                    }} />

                    {/* Second hand */}
                    <div style={{
                        position: 'absolute',
                        bottom: '50%',
                        left: '50%',
                        transformOrigin: 'bottom center',
                        borderRadius: '4px',
                        width: '1.5px',
                        height: '55px',
                        background: '#EF4444',
                        marginLeft: '-0.75px',
                        transform: `rotate(${secondDeg}deg)`
                    }} />

                    {/* Center dot */}
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '10px',
                        height: '10px',
                        background: '#F5D56E',
                        borderRadius: '50%',
                        zIndex: 10
                    }} />
                </div>

                {/* Digital time */}
                <div style={{
                    marginTop: '14px',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '26px',
                    fontWeight: 600,
                    color: '#F5D56E',
                    letterSpacing: '2px'
                }}>
                    {[hours, minutes, seconds].map(v => String(v).padStart(2, '0')).join(':')}
                </div>

                {/* Digital date */}
                <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '12px',
                    color: '#8B97B8',
                    marginTop: '4px'
                }}>
                    {days[time.getDay()]}
                </div>
            </div>

            {/* QR Code View */}
            <div style={{
                transition: 'opacity 0.6s ease-in-out, transform 0.6s ease-in-out',
                opacity: showingClock ? 0 : 1,
                transform: showingClock ? 'scale(0.95)' : 'scale(1)',
                position: showingClock ? 'absolute' : 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: showingClock ? 'none' : 'auto',
                top: 0, left: 0, right: 0, bottom: 0,
            }}>
                <div style={{
                    background: '#fff',
                    padding: '8px',
                    borderRadius: '8px',
                    marginBottom: '15px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                }}>
                    <QRCodeSVG
                        value={window.location.origin}
                        size={130}
                        level="M"
                        includeMargin={false}
                    />
                </div>
                <div style={{
                    fontSize: '15px',
                    color: '#F5D56E',
                    fontWeight: 600,
                    textAlign: 'center',
                    lineHeight: '1.4',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase'
                }}>
                    Bizi Telefondan<br />Takip Edin
                </div>
            </div>
        </div>
    );
};

export default Clock;
