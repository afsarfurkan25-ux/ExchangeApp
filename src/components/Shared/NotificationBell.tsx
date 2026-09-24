import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { Bell } from 'lucide-react';

const NotificationBell: React.FC = () => {
    const { announcements, unreadCount, markAsRead, markAllAsRead, triggerShake } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Shake animation trigger
    useEffect(() => {
        if (triggerShake) {
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500); // Shake duration
        }
    }, [triggerShake]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '14px',
                    background: '#131820',
                    border: '1px solid rgba(212, 167, 49, 0.3)',
                    color: '#D4A731',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.3s ease',
                    animation: isShaking ? 'bellShake 0.5s ease-in-out' : 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.background = '#1A2234';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.background = '#131820';
                    e.currentTarget.style.transform = 'none';
                }}
            >
                <Bell size={22} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        background: '#ef4444',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: 800,
                        minWidth: '20px',
                        height: '20px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 4px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
                        border: '2px solid #131820'
                    }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 12px)',
                    right: 0,
                    width: '360px',
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                    overflow: 'hidden',
                    zIndex: 1000,
                    animation: 'fadeInScale 0.2s ease-out',
                    transformOrigin: 'top right',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '480px'
                }}>
                    <div style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#0F172A'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '16px' }}>🔔</span>
                            <h3 style={{ margin: 0, fontSize: '14px', color: '#D4A731', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                                BİLDİRİMLER
                            </h3>
                            <span style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '10px',
                                fontWeight: 600
                            }}>
                                Okundu
                            </span>
                        </div>
                        <button
                            onClick={() => markAllAsRead()}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#5A6480',
                                fontSize: '12px',
                                cursor: 'pointer',
                                transition: 'color 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                            onMouseLeave={e => e.currentTarget.style.color = '#5A6480'}
                        >
                            Tümünü temizle
                        </button>
                    </div>

                    <div style={{
                        overflowY: 'auto',
                        padding: '8px 0',
                        flex: 1,
                        // Custom scrollbar
                    }}>
                        {announcements.length === 0 ? (
                            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--gray)' }}>
                                <Bell size={32} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
                                <p style={{ margin: 0, fontSize: '14px' }}>Henüz bir bildiriminiz bulunmuyor.</p>
                            </div>
                        ) : (
                            announcements.map(announcement => {
                                const styleInfo = getIconInfo(announcement.type);
                                return (
                                    <div
                                        key={announcement.id}
                                        onClick={() => {
                                            if (!announcement.is_read) markAsRead(announcement.id);
                                        }}
                                        style={{
                                            padding: '16px 20px',
                                            display: 'flex',
                                            gap: '16px',
                                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                            background: announcement.is_read ? '#131820' : `${styleInfo.color}15`,
                                            borderLeft: `3px solid ${styleInfo.color}`,
                                            cursor: 'pointer',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={e => {
                                            if (announcement.is_read) e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                            else e.currentTarget.style.background = `${styleInfo.color}20`;
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.background = announcement.is_read ? '#131820' : `${styleInfo.color}15`;
                                        }}
                                    >
                                        <div style={{
                                            width: '42px',
                                            height: '42px',
                                            borderRadius: '12px',
                                            background: announcement.is_read ? 'rgba(255,255,255,0.02)' : `${styleInfo.color}10`,
                                            border: `1px solid ${styleInfo.color}30`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            {styleInfo.icon}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#fff', fontWeight: 600 }}>
                                                {announcement.title}
                                            </h4>
                                            {announcement.message && (
                                                <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#8B97B8', lineHeight: 1.4 }}>
                                                    {announcement.message}
                                                </p>
                                            )}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '11px', color: '#5A6480', fontWeight: 500 }}>
                                                    {announcement.created_at.substring(11, 16)}
                                                </span>
                                                <span style={{
                                                    background: `${styleInfo.color}20`,
                                                    color: '#fff',
                                                    fontSize: '9px',
                                                    fontWeight: 700,
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    letterSpacing: '0.5px'
                                                }}>
                                                    {styleInfo.label}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
            <style>{`
                @keyframes bellShake {
                    0% { transform: rotate(0); }
                    15% { transform: rotate(15deg); }
                    30% { transform: rotate(-15deg); }
                    45% { transform: rotate(10deg); }
                    60% { transform: rotate(-10deg); }
                    75% { transform: rotate(5deg); }
                    85% { transform: rotate(-5deg); }
                    100% { transform: rotate(0); }
                }
                @keyframes fadeInScale {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default NotificationBell;
