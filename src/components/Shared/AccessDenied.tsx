import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { UserRole } from '../../context/ExchangeContext';

interface AccessDeniedProps {
    /** Kullanıcının mevcut rolü (bilgi amaçlı gösterilir) */
    role?: UserRole;
}

/**
 * 403 sayfası. Yetkisiz kullanıcıya korunan sayfanın içeriği hiç render
 * edilmez — bileşen ağacına dahi girmez, veri çağrısı yapılmaz.
 */
const AccessDenied: React.FC<AccessDeniedProps> = ({ role }) => {
    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            background: 'linear-gradient(180deg, #0d1225 0%, #0a0e1a 50%, #0d1225 100%)',
            color: '#C8D4E8',
            padding: 24,
            textAlign: 'center',
        }}>
            <div style={{
                fontSize: 72,
                fontWeight: 800,
                color: '#EF4444',
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: 4,
            }}>
                403
            </div>

            <div style={{ fontSize: 22, fontWeight: 700, color: '#F5D56E' }}>
                Bu sayfaya erişim yetkiniz yok
            </div>

            <div style={{ fontSize: 14, maxWidth: 420, lineHeight: 1.6, color: '#8B97B8' }}>
                Yönetim paneli yalnızca <strong style={{ color: '#C8D4E8' }}>Admin</strong> ve{' '}
                <strong style={{ color: '#C8D4E8' }}>Yönetici</strong> rollerine açıktır.
                {role && <><br />Mevcut rolünüz: <strong style={{ color: '#C8D4E8' }}>{role}</strong></>}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                    onClick={() => navigate('/panel', { replace: true })}
                    style={{
                        padding: '10px 22px',
                        background: 'linear-gradient(135deg, #D4A731, #8B6914)',
                        border: 'none', borderRadius: 8, color: '#0a0e1a',
                        fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    }}
                >
                    Kendi Panelime Git
                </button>
                <button
                    onClick={() => navigate('/', { replace: true })}
                    style={{
                        padding: '10px 22px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
                        color: '#C8D4E8', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    }}
                >
                    Pano Ekranı
                </button>
            </div>
        </div>
    );
};

export default AccessDenied;
