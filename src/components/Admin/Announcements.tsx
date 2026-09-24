import React, { useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import type { AnnouncementType } from '../../context/NotificationContext';
import { useExchange } from '../../hooks/useExchange';

const Announcements: React.FC = () => {
    const { announcements, sendAnnouncement, deleteAnnouncement } = useNotifications();
    const { currentUser } = useExchange();

    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState<AnnouncementType>('onemli');
    const [targetGroup, setTargetGroup] = useState('Tüm Üyeler');
    const [opts, setOpts] = useState({ flash: true, toast: false, bell: true });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return alert('Lütfen bir başlık giriniz.');

        setIsSubmitting(true);
        const success = await sendAnnouncement({
            title,
            message: message.trim() || null,
            type,
            target_group: targetGroup,
            options: opts,
            created_by: currentUser?.name || 'Admin'
        });

        if (success) {
            setTitle('');
            setMessage('');
            setType('onemli');
            setTargetGroup('Tüm Üyeler');
            setOpts({ flash: true, toast: false, bell: true });
            // remove alert to act more smooth
        } else {
            alert('Duyuru yayınlanırken bir hata oluştu.');
        }
        setIsSubmitting(false);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Bu duyuruyu silmek istediğinize emin misiniz?')) return;
        await deleteAnnouncement(id);
    };

    const handleClearAll = async () => {
        if (!window.confirm('Tüm duyuruları silmek istediğinize emin misiniz?')) return;
        for (const a of announcements) {
            await deleteAnnouncement(a.id);
        }
    }

    const getTypeInfo = (t: string) => {
        switch (t) {
            case 'onemli': return { emoji: '🚨', color: '#ef4444', label: 'ÖNEMLİ' };
            case 'uyari': return { emoji: '⚠️', color: '#f59e0b', label: 'UYARI' };
            case 'bilgi': return { emoji: 'ℹ️', color: '#3b82f6', label: 'BİLGİ' };
            case 'basari': return { emoji: '✅', color: '#10b981', label: 'BAŞARI' };
            default: return { emoji: '📢', color: '#b19cd9', label: 'DUYURU' };
        }
    };

    const targetGroups = [
        { id: 'Tüm Üyeler', icon: '👑', label: 'Tüm Üyeler' },
        { id: 'Yöneticiler', icon: '🛡️', label: 'Yöneticiler' },
        { id: 'Standart Üye', icon: '👤', label: 'Standart Üye' },
        { id: 'Teknisyen', icon: '🔧', label: 'Teknisyen' }
    ];

    const types: AnnouncementType[] = ['onemli', 'uyari', 'bilgi', 'basari', 'duyuru'];

    const getPreviewStyle = () => {
        const info = getTypeInfo(type);
        return {
            border: `1px solid ${info.color}40`,
            background: `${info.color}10`,
            color: info.color
        };
    };

    return (
        <div style={{
            padding: '24px',
            color: '#c8d4e8',
            fontFamily: "'Inter', sans-serif",
            maxWidth: '1400px',
            margin: '0 auto'
        }}>
            {/* Header Section */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#D4A731',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span style={{ width: '20px', height: '1px', background: '#D4A731' }}></span>
                    KURMATİK.NET ADMİN
                </div>
                <h1 style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: '28px',
                    fontWeight: 700,
                    margin: '0 0 8px 0',
                    color: '#D4A731',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                }}>
                    📢 DUYURU / BİLDİRİM SİSTEMİ
                </h1>
                <p style={{ margin: 0, color: '#8B97B8', fontSize: '13px' }}>
                    Admin ve yöneticiler üyelere anlık duyuru gönderebilir · Zil bildirimi ve flash banner desteği
                </p>
            </div>

            {/* Top Cards Row */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '24px',
                marginBottom: '32px'
            }}>
                <div style={{ background: 'rgba(20, 28, 50, 0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🍱</div>
                    <div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#D4A731', lineHeight: 1 }}>{announcements.length}</div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#8B97B8', marginTop: '4px', letterSpacing: '1px' }}>TOPLAM</div>
                    </div>
                </div>
                <div style={{ background: 'rgba(20, 28, 50, 0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '24px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✅</div>
                    <div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981', lineHeight: 1 }}>{announcements.length}</div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#8B97B8', marginTop: '4px', letterSpacing: '1px' }}>AKTİF</div>
                    </div>
                </div>
                <div style={{ background: 'rgba(20, 28, 50, 0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '24px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🚨</div>
                    <div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444', lineHeight: 1 }}>{announcements.filter(a => a.type === 'onemli').length}</div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#8B97B8', marginTop: '4px', letterSpacing: '1px' }}>ÖNEMLİ</div>
                    </div>
                </div>
                <div style={{ background: 'rgba(20, 28, 50, 0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '24px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔔</div>
                    <div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6', lineHeight: 1 }}>{announcements.filter(a => a.options.bell).length}</div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#8B97B8', marginTop: '4px', letterSpacing: '1px' }}>BİLDİRİM</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(450px, 1fr) 1.2fr', gap: '24px', alignItems: 'start' }}>

                {/* Left Panel: Create Form */}
                <div style={{
                    background: 'rgba(20, 28, 50, 0.4)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '16px',
                    padding: '32px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(212, 167, 49, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                            📣
                        </div>
                        <div>
                            <h2 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600, color: '#D4A731', letterSpacing: '1px', textTransform: 'uppercase' }}>DUYURU OLUŞTUR</h2>
                            <p style={{ margin: 0, fontSize: '13px', color: '#8B97B8' }}>Hedef gruba anlık bildirim & banner gönder</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Title */}
                        <div>
                            <label style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontSize: '12px', fontWeight: 700, color: '#D4A731', letterSpacing: '1px', marginBottom: '8px', textTransform: 'uppercase' }}>
                                BAŞLIK <span style={{ color: '#5A6480', fontWeight: 500, textTransform: 'none' }}>— zorunlu</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Örn: Bugün piyasa saat 14:00'de kapanıyor"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    background: 'rgba(10, 14, 26, 0.6)',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    borderRadius: '8px',
                                    padding: '14px 16px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                            />
                        </div>

                        {/* Message */}
                        <div>
                            <label style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontSize: '12px', fontWeight: 700, color: '#D4A731', letterSpacing: '1px', marginBottom: '8px', textTransform: 'uppercase' }}>
                                AÇIKLAMA <span style={{ color: '#5A6480', fontWeight: 500, textTransform: 'none' }}>— isteğe bağlı</span>
                            </label>
                            <textarea
                                placeholder="Duyuru detaylarını buraya yazın..."
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: 'rgba(10, 14, 26, 0.6)',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    borderRadius: '8px',
                                    padding: '14px 16px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    outline: 'none',
                                    minHeight: '100px',
                                    resize: 'vertical'
                                }}
                            />
                        </div>

                        {/* Type Selection */}
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#D4A731', letterSpacing: '1px', marginBottom: '12px', textTransform: 'uppercase' }}>
                                DUYURU TİPİ
                            </label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {types.map(t => {
                                    const info = getTypeInfo(t);
                                    const isSelected = type === t;
                                    return (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setType(t)}
                                            style={{
                                                flex: 1,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '16px 8px',
                                                background: isSelected ? `${info.color}10` : 'transparent',
                                                border: `1px solid ${isSelected ? info.color + '60' : 'rgba(255,255,255,0.05)'}`,
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                boxShadow: isSelected ? `inset 0 0 20px ${info.color}15` : 'none'
                                            }}
                                        >
                                            <span style={{ fontSize: '26px', filter: isSelected ? `drop-shadow(0 0 4px ${info.color}50)` : 'none', marginBottom: '4px' }}>{info.emoji}</span>
                                            <span style={{ fontSize: '11px', fontWeight: 700, color: isSelected ? info.color : '#8B97B8', letterSpacing: '0.5px' }}>{info.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Target Group */}
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#D4A731', letterSpacing: '1px', marginBottom: '12px', textTransform: 'uppercase' }}>
                                HEDEF GRUP
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                {targetGroups.map(tg => {
                                    const isSelected = targetGroup === tg.id;
                                    return (
                                        <button
                                            key={tg.id}
                                            type="button"
                                            onClick={() => setTargetGroup(tg.id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '8px 16px',
                                                background: isSelected ? 'rgba(212, 167, 49, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                                border: `1px solid ${isSelected ? '#D4A731' : 'rgba(255,255,255,0.05)'}`,
                                                borderRadius: '20px',
                                                color: isSelected ? '#D4A731' : '#8B97B8',
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <span style={{ filter: isSelected ? 'drop-shadow(0 0 2px rgba(212,167,49,0.5))' : 'grayscale(1)' }}>{tg.icon}</span>
                                            {tg.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Options */}
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#D4A731', letterSpacing: '1px', marginBottom: '12px', textTransform: 'uppercase' }}>
                                SEÇENEKLER
                            </label>
                            <div style={{ display: 'flex', gap: '24px' }}>
                                {/* Flash Toggle */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div
                                        onClick={() => setOpts(o => ({ ...o, flash: !o.flash }))}
                                        style={{
                                            width: '44px', height: '24px',
                                            background: opts.flash ? '#D4A731' : 'rgba(255,255,255,0.1)',
                                            borderRadius: '12px',
                                            position: 'relative',
                                            cursor: 'pointer',
                                            transition: 'background 0.3s'
                                        }}
                                    >
                                        <div style={{
                                            width: '18px', height: '18px',
                                            background: '#fff',
                                            borderRadius: '50%',
                                            position: 'absolute',
                                            top: '3px',
                                            left: opts.flash ? '23px' : '3px',
                                            transition: 'left 0.3s',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                        }} />
                                    </div>
                                    <span style={{ fontSize: '13px', color: '#c8d4e8' }}>Flash banner</span>
                                </div>

                                {/* Bell Toggle */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div
                                        onClick={() => setOpts(o => ({ ...o, bell: !o.bell }))}
                                        style={{
                                            width: '44px', height: '24px',
                                            background: opts.bell ? '#D4A731' : 'rgba(255,255,255,0.1)',
                                            borderRadius: '12px',
                                            position: 'relative',
                                            cursor: 'pointer',
                                            transition: 'background 0.3s'
                                        }}
                                    >
                                        <div style={{
                                            width: '18px', height: '18px',
                                            background: '#fff',
                                            borderRadius: '50%',
                                            position: 'absolute',
                                            top: '3px',
                                            left: opts.bell ? '23px' : '3px',
                                            transition: 'left 0.3s',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                        }} />
                                    </div>
                                    <span style={{ fontSize: '13px', color: '#c8d4e8' }}>Zil bildirimi</span>
                                </div>

                                {/* Toast Toggle */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div
                                        onClick={() => setOpts(o => ({ ...o, toast: !o.toast }))}
                                        style={{
                                            width: '44px', height: '24px',
                                            background: opts.toast ? '#D4A731' : 'rgba(255,255,255,0.1)',
                                            borderRadius: '12px',
                                            position: 'relative',
                                            cursor: 'pointer',
                                            transition: 'background 0.3s'
                                        }}
                                    >
                                        <div style={{
                                            width: '18px', height: '18px',
                                            background: '#fff',
                                            borderRadius: '50%',
                                            position: 'absolute',
                                            top: '3px',
                                            left: opts.toast ? '23px' : '3px',
                                            transition: 'left 0.3s',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                        }} />
                                    </div>
                                    <span style={{ fontSize: '13px', color: '#c8d4e8' }}>Popup toast</span>
                                </div>
                            </div>
                        </div>

                        {/* View Preview */}
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#D4A731', letterSpacing: '1px', marginBottom: '12px', textTransform: 'uppercase' }}>
                                CANLI ÖNİZLEME
                            </label>

                            <div style={{
                                ...getPreviewStyle(),
                                borderRadius: '12px',
                                padding: '16px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px'
                            }}>
                                <span style={{ fontSize: '20px' }}>{getTypeInfo(type).emoji}</span>
                                <div>
                                    <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
                                        {title || 'Başlık burada görünecek'}
                                    </div>
                                    <div style={{ fontSize: '11px', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Şimdi · {currentUser?.name || 'Admin'} · <span>{targetGroups.find(t => t.id === targetGroup)?.icon} {targetGroup}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            style={{
                                background: '#8A7222', // Match the darker gold/khaki button color in image
                                color: '#1a1f36',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '16px',
                                fontSize: '14px',
                                fontWeight: 700,
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                opacity: isSubmitting ? 0.8 : 1,
                                marginTop: '8px',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <span style={{ fontSize: '18px' }}>📤</span> DUYURUYU GÖNDER
                        </button>
                    </form>
                </div>

                {/* Right Panel: Active Announcements */}
                <div style={{
                    background: 'rgba(20, 28, 50, 0.4)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '16px',
                    padding: '24px 32px',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></div>
                            <h3 style={{ margin: 0, color: '#D4A731', fontSize: '13px', fontWeight: 700, letterSpacing: '1px' }}>AKTİF DUYURULAR</h3>
                            <span style={{ background: '#D4A731', color: '#0a0e1a', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>
                                {announcements.length}
                            </span>
                        </div>
                        {announcements.length > 0 && (
                            <button
                                onClick={handleClearAll}
                                style={{ background: 'none', border: 'none', color: '#5A6480', fontSize: '12px', cursor: 'pointer', padding: '4px 8px' }}
                            >
                                Tümünü sil
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '700px', paddingRight: '4px' }}>
                        {announcements.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5A6480' }}>
                                <div style={{ fontSize: '40px', opacity: 0.2, marginBottom: '16px' }}>🔕</div>
                                <p style={{ margin: 0, fontSize: '14px' }}>Sistemde yayınlanan herhangi bir duyuru bulunmuyor.</p>
                            </div>
                        ) : (
                            announcements.map(announcement => {
                                const info = getTypeInfo(announcement.type);
                                const tg = targetGroups.find(t => t.id === announcement.target_group);

                                return (
                                    <div key={announcement.id} style={{
                                        background: 'rgba(10, 14, 26, 0.6)',
                                        border: `1px solid ${info.color}30`,
                                        borderRadius: '12px',
                                        padding: '16px',
                                        position: 'relative',
                                        boxShadow: `inset 0 0 40px ${info.color}05`
                                    }}>
                                        <div style={{ display: 'flex', gap: '16px' }}>
                                            <div style={{
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '8px',
                                                background: `${info.color}20`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '16px',
                                                flexShrink: 0
                                            }}>
                                                {info.emoji}
                                            </div>

                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <h4 style={{ margin: '0 0 6px 0', color: info.color, fontSize: '14px', fontWeight: 600 }}>{announcement.title}</h4>
                                                {announcement.message && (
                                                    <p style={{ margin: '0 0 12px 0', color: '#c8d4e8', fontSize: '13px', lineHeight: 1.5 }}>
                                                        {announcement.message}
                                                    </p>
                                                )}

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#5A6480', fontWeight: 600 }}>
                                                    <span>{announcement.created_at.substring(11, 16)}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px' }}>
                                                        <span>{tg?.icon}</span> <span style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>{tg?.label}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDelete(announcement.id)}
                                                style={{
                                                    position: 'absolute',
                                                    top: '16px',
                                                    right: '16px',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: '#5A6480',
                                                    cursor: 'pointer',
                                                    fontSize: '16px',
                                                    opacity: 0.6,
                                                    transition: 'opacity 0.2s'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                                onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
                                                title="Sil"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Announcements;
