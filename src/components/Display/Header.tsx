import React from 'react';

interface HeaderProps {
    shopName: string;
}

const Header: React.FC<HeaderProps> = ({ shopName }) => {
    return (
        <div style={{
            flexShrink: 0,
            padding: '12px 24px',
            textAlign: 'center',
            position: 'relative',
            background: 'linear-gradient(180deg, rgba(30, 35, 55, 0.9), rgba(13, 18, 37, 0.95))',
            borderBottom: '2px solid rgba(212, 167, 49, 0.3)'
        }}>
            {/* Decorative elements */}
            <img src="/Kurmatiklogo.png" alt="Kurmatik Logo" className="header-logo" style={{
                position: 'absolute',
                left: '24px',
                top: '50%',
                transform: 'translateY(-50%)',
                height: '75px',
                width: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
            }} />

            <h1 className="header-title" style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '42px',
                fontWeight: 900,
                background: 'linear-gradient(135deg, #C49A1A, #F5D56E, #D4A731, #F5D56E, #C49A1A)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 2px 8px rgba(212, 167, 49, 0.3))',
                lineHeight: 1.2,
                margin: 0
            }}>
                {shopName}
            </h1>

            <div className="header-subtitle" style={{
                fontSize: '12px',
                color: 'rgba(212, 167, 49, 0.5)',
                letterSpacing: '6px',
                textTransform: 'uppercase',
                marginTop: '2px'
            }}>
                — Kuyumculuk —
            </div>

            <span style={{
                position: 'absolute',
                right: '24px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '20px',
                color: '#D4A731',
                opacity: 0.6
            }}>✦</span>
        </div>
    );
};

export default Header;
