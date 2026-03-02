import React, { useState } from 'react';
import { useExchange } from '../../hooks/useExchange';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
    const { currentUser, updateMemberPassword, updateCurrentMemberProfile, logoutUser } = useExchange();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');

    // Info Edit State
    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [editName, setEditName] = useState(currentUser?.name || '');
    const [editEmail, setEditEmail] = useState(currentUser?.email || '');
    const [editShopName, setEditShopName] = useState(currentUser?.shopName || '');
    const [infoSaving, setInfoSaving] = useState(false);
    const [infoError, setInfoError] = useState<string | null>(null);

    // Password state
    const [pwOld, setPwOld] = useState('');
    const [pwNew, setPwNew] = useState('');
    const [pwConfirm, setPwConfirm] = useState('');
    const [pwError, setPwError] = useState<string | null>(null);
    const [pwSuccess, setPwSuccess] = useState<string | null>(null);
    const [pwSaving, setPwSaving] = useState(false);

    // Password visibility
    const [showPwOld, setShowPwOld] = useState(false);
    const [showPwNew, setShowPwNew] = useState(false);
    const [showPwConfirm, setShowPwConfirm] = useState(false);

    if (!isOpen || !currentUser) return null;

    // Helper functions
    const getInitials = (name: string) => {
        const parts = name.split(' ');
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const getUsernameDisplay = (username: string) => {
        return username.startsWith('@') ? username : `@${username}`;
    };

    const handleLogoutClick = () => {
        logoutUser();
        onClose();
        navigate('/login');
    };

    const handleInfoSave = async () => {
        setInfoError(null);
        if (!editName) {
            setInfoError('Ad Soyad boş bırakılamaz.');
            return;
        }

        setInfoSaving(true);
        const success = await updateCurrentMemberProfile({
            name: editName,
            email: editEmail,
            shopName: editShopName
        });
        setInfoSaving(false);

        if (success) {
            setIsEditingInfo(false);
        } else {
            setInfoError('Bilgiler güncellenirken bir hata oluştu.');
        }
    };

    // Password Validation Logic
    const hasLength = pwNew.length >= 8;
    const hasUpper = /[A-Z]/.test(pwNew);
    const hasLower = /[a-z]/.test(pwNew);
    const hasNumber = /[0-9]/.test(pwNew);

    const handlePasswordChange = async () => {
        setPwError(null);
        setPwSuccess(null);

        if (!pwOld || !pwNew || !pwConfirm) {
            setPwError('Tüm alanları doldurmalısınız.');
            return;
        }

        if (pwOld !== currentUser.password) {
            setPwError('Eski şifre yanlış.');
            return;
        }

        if (pwNew !== pwConfirm) {
            setPwError('Yeni şifreler eşleşmiyor.');
            return;
        }

        if (!hasLength || !hasUpper || !hasLower || !hasNumber) {
            setPwError('Lütfen tüm şifre gereksinimlerini karşılayın.');
            return;
        }

        if (pwNew === pwOld) {
            setPwError('Yeni şifre eski şifreyle aynı olamaz.');
            return;
        }

        setPwSaving(true);
        // Supabase update if they have auth
        try {
            // First update locally so UI responds seamlessly and old login continues to work
            const ok = await updateMemberPassword(currentUser.id, pwNew);

            if (ok) {
                // Also update in Supabase Auth if logged in there
                await supabase.auth.updateUser({ password: pwNew });
                setPwSuccess('Şifreniz başarıyla değiştirildi.');
                setTimeout(() => {
                    handleLogoutClick(); // Usually we ask them to login again, or just close
                    // onClose(); 
                }, 2000);
            } else {
                setPwError('Veritabanında şifre güncellenemedi.');
            }
        } catch (error: any) {
            setPwError(error.message || 'Bir hata oluştu.');
        } finally {
            setPwSaving(false);
        }
    };

    // Shared Styles
    const tabButtonStyle = (isActive: boolean) => ({
        flex: 1,
        padding: '12px',
        background: isActive ? 'rgba(212, 167, 49, 0.15)' : 'rgba(255, 255, 255, 0.05)',
        color: isActive ? '#D4A731' : '#8B97B8',
        border: 'none',
        borderRadius: '10px',
        fontWeight: 700,
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.3s'
    });

    const sectionTitleStyle = {
        color: '#8B97B8',
        fontSize: '12px',
        fontWeight: 700,
        letterSpacing: '0.5px',
        marginTop: '24px',
        marginBottom: '12px',
        textTransform: 'uppercase' as const
    };

    const infoRowStyle = {
        display: 'flex',
        alignItems: 'center',
        padding: '14px 16px',
        background: 'rgba(20, 28, 50, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.03)',
        borderRadius: '12px',
        marginBottom: '8px'
    };

    const infoLabelStyle = {
        color: '#C8D4E8',
        fontSize: '14px',
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontWeight: 500
    };

    const infoValueStyle = {
        color: '#fff',
        fontSize: '14px',
        fontWeight: 600,
        textAlign: 'right' as const
    };

    const editInputStyle = {
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        color: '#fff',
        padding: '6px 12px',
        fontSize: '14px',
        fontWeight: 600,
        outline: 'none',
        textAlign: 'right' as const,
        width: '180px'
    };

    const inputWrapperStyle = {
        position: 'relative' as const,
        marginBottom: '16px'
    };

    const inputStyle = {
        width: '100%',
        padding: '14px 44px 14px 40px',
        background: '#f8fafc',
        border: '1px solid transparent',
        borderRadius: '12px',
        color: '#0f172a',
        fontSize: '15px',
        fontWeight: 600,
        outline: 'none',
        boxSizing: 'border-box' as const,
    };

    const inputIconLeftStyle = {
        position: 'absolute' as const,
        left: '14px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#D4A731'
    };

    const inputIconRightStyle = {
        position: 'absolute' as const,
        right: '14px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#8B97B8',
        cursor: 'pointer'
    };

    const reqItemStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        marginBottom: '8px',
        color: '#8B97B8'
    };

    const getReqIcon = (met: boolean) => {
        return met ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>
        );
    };

    return (
        <div style={{
            position: 'fixed' as const,
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
        }} onClick={onClose}>
            <div style={{
                background: '#0d1222',
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                width: '100%',
                maxWidth: '420px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
                overflow: 'hidden',
                maxHeight: '90vh' // allow scroll if needed
            }} onClick={e => e.stopPropagation()}>

                {/* Header Section */}
                <div style={{ padding: '24px 32px 20px', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                        <h2 style={{ color: '#D4A731', margin: 0, fontSize: '20px', fontWeight: 700 }}>Üye Bilgileri</h2>
                        <button onClick={onClose} style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: 'none',
                            color: '#8B97B8',
                            width: '32px', height: '32px',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '16px'
                        }}>✕</button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{
                            width: '72px', height: '72px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #ECC853, #BA8D22)',
                            color: '#0a0e1a',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '28px',
                            fontWeight: 800,
                            letterSpacing: '1px',
                            boxShadow: '0 8px 20px rgba(212, 167, 49, 0.2)'
                        }}>
                            {getInitials(currentUser.name)}
                        </div>
                        <div>
                            <h3 style={{ color: '#fff', margin: '0 0 6px 0', fontSize: '20px', fontWeight: 700 }}>{currentUser.name}</h3>
                            <div style={{ color: '#8B97B8', fontSize: '14px', marginBottom: '8px' }}>{getUsernameDisplay(currentUser.username)}</div>
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                background: 'rgba(212, 167, 49, 0.1)',
                                color: '#D4A731',
                                padding: '4px 12px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 700
                            }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                                {currentUser.shopName || `${currentUser.name.toUpperCase()} SARRAFİYE`}
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.05)' }} />

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '12px', padding: '24px 32px 0' }}>
                    <button style={tabButtonStyle(activeTab === 'info')} onClick={() => setActiveTab('info')}>Bilgilerim</button>
                    <button style={tabButtonStyle(activeTab === 'password')} onClick={() => setActiveTab('password')}>Şifre Değiştir</button>
                </div>

                {/* Content Container */}
                <div style={{ padding: '0 32px 32px', flex: 1, overflowY: 'auto' }}>

                    {/* TAB: BİLGİLERİM */}
                    {activeTab === 'info' && (
                        <div style={{ animation: 'fadeIn 0.3s ease' }}>
                            <div style={sectionTitleStyle}>KİŞİSEL BİLGİLER</div>
                            <div style={infoRowStyle}>
                                <div style={infoLabelStyle}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                    Ad Soyad
                                </div>
                                {isEditingInfo ? (
                                    <input value={editName} onChange={e => setEditName(e.target.value)} style={editInputStyle} />
                                ) : (
                                    <div style={infoValueStyle}>{currentUser.name}</div>
                                )}
                            </div>
                            <div style={infoRowStyle}>
                                <div style={infoLabelStyle}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                    E-Posta
                                </div>
                                {isEditingInfo ? (
                                    <input value={editEmail} onChange={e => setEditEmail(e.target.value)} style={editInputStyle} />
                                ) : (
                                    <div style={infoValueStyle}>{currentUser.email || 'Belirtilmedi'}</div>
                                )}
                            </div>

                            <div style={sectionTitleStyle}>MAĞAZA BİLGİLERİ</div>
                            <div style={infoRowStyle}>
                                <div style={infoLabelStyle}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                                    Mağaza Adı
                                </div>
                                {isEditingInfo ? (
                                    <input value={editShopName} onChange={e => setEditShopName(e.target.value)} style={editInputStyle} />
                                ) : (
                                    <div style={infoValueStyle}>{currentUser.shopName || '-'}</div>
                                )}
                            </div>
                            <div style={infoRowStyle}>
                                <div style={infoLabelStyle}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                    Üyelik Rolü
                                </div>
                                <div style={infoValueStyle}>{currentUser.role}</div>
                            </div>
                            <div style={infoRowStyle}>
                                <div style={infoLabelStyle}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                    Hesap Durumu
                                </div>
                                <div style={{ ...infoValueStyle, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: currentUser.status === 'Aktif' ? '#4ADE80' : '#F87171' }}></div>
                                    {currentUser.status}
                                </div>
                            </div>

                            {infoError && (
                                <div style={{ color: '#F87171', fontSize: '13px', marginTop: '12px', textAlign: 'center' }}>
                                    {infoError}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
                                {isEditingInfo ? (
                                    <>
                                        <button disabled={infoSaving} onClick={handleInfoSave} style={{
                                            flex: 1, padding: '14px', background: 'linear-gradient(135deg, #ECC853, #BA8D22)', border: 'none',
                                            color: '#000', borderRadius: '12px', fontWeight: 800, cursor: infoSaving ? 'wait' : 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            opacity: infoSaving ? 0.7 : 1
                                        }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                                            {infoSaving ? 'Kaydediliyor...' : 'Kaydet'}
                                        </button>
                                        <button disabled={infoSaving} onClick={() => {
                                            setIsEditingInfo(false);
                                            setEditName(currentUser.name);
                                            setEditEmail(currentUser.email || '');
                                            setEditShopName(currentUser.shopName || '');
                                            setInfoError(null);
                                        }} style={{
                                            flex: 1, padding: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#8B97B8', borderRadius: '12px', fontWeight: 700, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                        }}>
                                            İptal
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => setIsEditingInfo(true)} style={{
                                            flex: 1, padding: '14px', background: 'transparent', border: '1px solid #D4A731',
                                            color: '#D4A731', borderRadius: '12px', fontWeight: 700, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                        }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                            Düzenle
                                        </button>
                                        <button onClick={handleLogoutClick} style={{
                                            flex: 1, padding: '14px', background: 'transparent', border: '1px solid #EF4444',
                                            color: '#EF4444', borderRadius: '12px', fontWeight: 700, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                        }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                            Çıkış Yap
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB: ŞİFRE DEĞİŞTİR */}
                    {activeTab === 'password' && (
                        <div style={{ animation: 'fadeIn 0.3s ease' }}>
                            <div style={sectionTitleStyle}>MEVCUT ŞİFRE</div>
                            <div style={inputWrapperStyle}>
                                <div style={inputIconLeftStyle}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                </div>
                                <input
                                    type={showPwOld ? 'text' : 'password'}
                                    value={pwOld} onChange={e => setPwOld(e.target.value)}
                                    placeholder="••••••••" style={inputStyle}
                                />
                                <div style={inputIconRightStyle} onClick={() => setShowPwOld(!showPwOld)}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        {showPwOld ? <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path> : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></>}
                                        {showPwOld && <circle cx="12" cy="12" r="3"></circle>}
                                    </svg>
                                </div>
                            </div>

                            <div style={sectionTitleStyle}>YENİ ŞİFRE</div>
                            <div style={inputWrapperStyle}>
                                <div style={inputIconLeftStyle}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                </div>
                                <input
                                    type={showPwNew ? 'text' : 'password'}
                                    value={pwNew} onChange={e => setPwNew(e.target.value)}
                                    placeholder="••••••••" style={inputStyle}
                                />
                                <div style={inputIconRightStyle} onClick={() => setShowPwNew(!showPwNew)}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        {showPwNew ? <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path> : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></>}
                                        {showPwNew && <circle cx="12" cy="12" r="3"></circle>}
                                    </svg>
                                </div>
                            </div>

                            <div style={sectionTitleStyle}>YENİ ŞİFRE TEKRAR</div>
                            <div style={inputWrapperStyle}>
                                <div style={inputIconLeftStyle}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                </div>
                                <input
                                    type={showPwConfirm ? 'text' : 'password'}
                                    value={pwConfirm} onChange={e => setPwConfirm(e.target.value)}
                                    placeholder="••••••••" style={inputStyle}
                                />
                                <div style={inputIconRightStyle} onClick={() => setShowPwConfirm(!showPwConfirm)}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        {showPwConfirm ? <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path> : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></>}
                                        {showPwConfirm && <circle cx="12" cy="12" r="3"></circle>}
                                    </svg>
                                </div>
                            </div>

                            {/* Requirements box */}
                            <div style={{
                                background: 'rgba(20, 28, 50, 0.4)',
                                border: '1px solid rgba(255, 255, 255, 0.03)',
                                borderRadius: '12px',
                                padding: '16px',
                                marginBottom: '20px'
                            }}>
                                <div style={{ color: '#D4A731', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '12px' }}>ŞİFRE GEREKSİNİMLERİ</div>
                                <div style={reqItemStyle}>{getReqIcon(hasLength)} <span style={{ color: hasLength ? '#4ADE80' : undefined }}>En az 8 karakter</span></div>
                                <div style={reqItemStyle}>{getReqIcon(hasUpper)} <span style={{ color: hasUpper ? '#4ADE80' : undefined }}>En az 1 büyük harf</span></div>
                                <div style={reqItemStyle}>{getReqIcon(hasLower)} <span style={{ color: hasLower ? '#4ADE80' : undefined }}>En az 1 küçük harf</span></div>
                                <div style={reqItemStyle}>{getReqIcon(hasNumber)} <span style={{ color: hasNumber ? '#4ADE80' : undefined }}>En az 1 rakam</span></div>
                            </div>

                            {pwError && (
                                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#F87171', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    {pwError}
                                </div>
                            )}

                            {pwSuccess && (
                                <div style={{ background: 'rgba(74, 222, 128, 0.1)', color: '#4ADE80', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', border: '1px solid rgba(74, 222, 128, 0.2)' }}>
                                    {pwSuccess}
                                </div>
                            )}

                            <button onClick={handlePasswordChange} disabled={pwSaving} style={{
                                width: '100%',
                                padding: '16px',
                                background: 'linear-gradient(135deg, #ECC853, #BA8D22)',
                                color: '#0a0e1a',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: 800,
                                fontSize: '15px',
                                cursor: 'pointer',
                                opacity: pwSaving ? 0.7 : 1,
                                boxShadow: '0 8px 20px rgba(212, 167, 49, 0.25)',
                                transition: 'all 0.3s'
                            }}>
                                {pwSaving ? 'Güncelleniyor...' : 'Şifreyi Değiştir'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default ProfileModal;
