import React from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { X } from 'lucide-react';
import '../../index.css'; // Make sure the global CSS with animations/variables is imported

const NotificationOverlay: React.FC = () => {
    const { activeFlash, activeToasts, hideFlash, removeToast } = useNotifications();

    const getIconInfo = (type: string) => {
        switch (type) {
            case 'onemli': return { icon: <span style={{ fontSize: '20px' }}>🚨</span>, color: '#ef4444', label: 'ÖNEMLİ' };
            case 'uyari': return { icon: <span style={{ fontSize: '20px' }}>⚠️</span>, color: '#f59e0b', label: 'UYARI' };
            case 'bilgi': return { icon: <span style={{ fontSize: '20px' }}>ℹ️</span>, color: '#3b82f6', label: 'BİLGİ' };
            case 'basari': return { icon: <span style={{ fontSize: '20px' }}>✅</span>, color: '#10b981', label: 'BAŞARI' };
            default: return { icon: <span style={{ fontSize: '20px' }}>📢</span>, color: '#ec4899', label: 'DUYURU' };
        }
    };

    return (
        <>
            {/* Flash Banner Layer */}
            {activeFlash && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 9999,
                    background: getIconInfo(activeFlash.type).color,
                    color: '#fff',
                    padding: '12px 24px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    animation: 'slideDown 0.3s ease-out'
                }}>
                    {getIconInfo(activeFlash.type).icon}
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <strong style={{ display: 'block', fontSize: '14px', marginBottom: '2px' }}>{activeFlash.title}</strong>
                        {activeFlash.message && <span style={{ fontSize: '12px', opacity: 0.9 }}>{activeFlash.message}</span>}
                    </div>
                    <button onClick={hideFlash} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}>
                        <X size={20} />
                    </button>
                    <style>{`
                        @keyframes slideDown {
                            from { transform: translateY(-100%); opacity: 0; }
                            to { transform: translateY(0); opacity: 1; }
                        }
                    `}</style>
                </div>
            )}

            {/* Toast Container Layer */}
            {activeToasts.length > 0 && (
                <div style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    zIndex: 9998,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    width: '320px',
                    maxWidth: '100%'
                }}>
                    {activeToasts.map(toast => {
                        const styleInfo = getIconInfo(toast.type);
                        return (
                            <div key={toast.id} style={{
                                background: '#0B0F19',
                                border: `1px solid ${styleInfo.color}40`,
                                borderRadius: '16px',
                                padding: '16px',
                                display: 'flex',
                                gap: '16px',
                                boxShadow: '0 12px 32px rgba(0,0,0,0.8)',
                                animation: 'slideInRight 0.3s ease-out',
                                position: 'relative',
                                overflow: 'hidden',
                                alignItems: 'center'
                            }}>
                                <div style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '12px',
                                    background: `${styleInfo.color}15`,
                                    border: `1px solid ${styleInfo.color}30`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    {styleInfo.icon}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: styleInfo.color, fontWeight: 600 }}>{toast.title}</h4>
                                    {toast.message && <p style={{ margin: 0, fontSize: '13px', color: '#5A6480', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{toast.message}</p>}
                                </div>
                                <button onClick={() => removeToast(toast.id)} style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--gray)',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    alignSelf: 'flex-start',
                                    transition: 'color 0.2s'
                                }}
                                    onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                                    onMouseLeave={e => e.currentTarget.style.color = 'var(--gray)'}
                                >
                                    <X size={16} />
                                </button>
                                {/* Progress Bar Animation */}
                                <div style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    height: '3px',
                                    background: styleInfo.color,
                                    width: '100%',
                                    animation: 'progress 4.5s linear forwards',
                                    transformOrigin: 'left'
                                }} />
                                <style>{`
                                    @keyframes slideInRight {
                                        from { transform: translateX(100%); opacity: 0; }
                                        to { transform: translateX(0); opacity: 1; }
                                    }
                                    @keyframes progress {
                                        from { transform: scaleX(1); }
                                        to { transform: scaleX(0); }
                                    }
                                `}</style>
                            </div>
                        )
                    })}
                </div>
            )}
        </>
    );
};

export default NotificationOverlay;
