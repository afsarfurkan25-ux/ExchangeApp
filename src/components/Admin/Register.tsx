import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

const Register: React.FC = () => {
    const navigate = useNavigate();

    // Form States
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [username, setUsername] = useState('');
    const [shopName, setShopName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    // UI States
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const inputFocusStyle = (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.style.borderColor = '#D4A731';
        e.target.style.boxShadow = '0 0 0 3px rgba(212, 167, 49, 0.1)';
    };

    const inputBlurStyle = (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.style.borderColor = 'rgba(212, 167, 49, 0.2)';
        e.target.style.boxShadow = 'none';
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        if (!firstName || !lastName || !username || !shopName || !email || !password || !passwordConfirm) {
            setError('Lütfen tüm alanları doldurun.');
            return;
        }

        if (password !== passwordConfirm) {
            setError('Şifreler eşleşmiyor!');
            return;
        }

        if (!acceptedTerms) {
            setError('Kayıt olmak için kullanım şartlarını kabul etmelisiniz.');
            return;
        }

        setIsLoading(true);

        try {
            // 1. Create user in Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) {
                console.error("Auth Error:", authError);
                setError('Kayıt işlemi başarısız: ' + authError.message);
                setIsLoading(false);
                return;
            }

            // 2. Insert into 'members' table
            const fullName = `${firstName.trim()} ${lastName.trim()}`;

            // Generate a secure but random password hash since Supabase handles actual auth,
            // we will just store a dummy hash or generic string for the legacy 'members' table if it requires one.
            // But we can just pass the plain password if the system uses it for local check, or handle it via trigger.
            // Since the user is using an existing system that previously checked `members.password`, 
            // we should ideally insert the entered password or rely on the backend. For now we insert it directly as requested originally.

            const insertData = {
                id: authData.user?.id, // Link to Auth ID
                name: fullName,
                username: username.trim(),
                password: password, // As per previous legacy requirement before auth
                role: 'Üye',
                shop_name: shopName.trim(),
                email: email.trim()
            };

            const { error: dbError } = await supabase
                .from('members')
                .insert([insertData]);

            if (dbError) {
                console.error("DB Error:", dbError);
                // Even if DB insert fails, Auth user was created. This is an edge case, but we log it.
                setError('Kullanıcı oluşturuldu ancak profil bilgileri kaydedilemedi: ' + dbError.message);
                setIsLoading(false);
                return;
            }

            // Success
            setSuccessMsg('Kayıt başarılı! Lütfen e-posta adresinize gönderilen doğrulama bağlantısına tıklayın.');

            // Clear form
            setFirstName(''); setLastName(''); setUsername(''); setShopName('');
            setEmail(''); setPassword(''); setPasswordConfirm(''); setAcceptedTerms(false);

            // Optional: Redirect after a few seconds
            setTimeout(() => navigate('/login'), 3000);

        } catch (err: any) {
            console.error("Unexpected error:", err);
            setError('Beklenmeyen bir hata oluştu.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0d1225 0%, #0a0e1a 100%)',
            fontFamily: "'DM Sans', sans-serif",
            position: 'relative',
            overflowX: 'hidden',
            padding: '40px 20px'
        }}>
            {/* Background pattern */}
            <div style={{
                position: 'fixed',
                top: 0, left: 0, width: '100%', height: '100%',
                opacity: 0.05,
                background: '[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:20px_20px]',
                zIndex: 0
            }}></div>

            <div style={{
                background: 'rgba(20, 28, 50, 0.8)',
                backdropFilter: 'blur(10px)',
                padding: '40px 48px',
                borderRadius: '24px',
                border: '1px solid rgba(212, 167, 49, 0.15)',
                boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 80px rgba(212, 167, 49, 0.03)',
                width: '100%',
                maxWidth: '460px',
                zIndex: 10,
                textAlign: 'center'
            }}>
                {/* Logo */}
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #DFB13E, #8B6914)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 900,
                    fontSize: '32px',
                    color: '#0a0e1a',
                    boxShadow: '0 8px 25px rgba(212, 167, 49, 0.3)'
                }}>K</div>

                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: 700, color: '#F5D56E', marginBottom: '6px' }}>
                    Kayıt Ol
                </h2>
                <p style={{ color: '#8B97B8', fontSize: '14px', marginBottom: '32px' }}>Kurmatik.net Yönetim Sistemi</p>

                {/* Tabs */}
                <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '14px', marginBottom: '32px', padding: '6px' }}>
                    <Link to="/login" style={{
                        flex: 1,
                        color: '#8B97B8',
                        padding: '14px 0',
                        borderRadius: '10px',
                        fontWeight: 600,
                        fontSize: '15px',
                        cursor: 'pointer',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.3s'
                    }}
                        onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                        onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                        Giriş Yap
                    </Link>
                    <div style={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #DFB13E, #B8860B)',
                        color: '#0a0e1a',
                        padding: '14px 0',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '15px',
                        cursor: 'default',
                        boxShadow: '0 4px 15px rgba(212, 167, 49, 0.2)'
                    }}>
                        Kayıt Ol
                    </div>
                </div>

                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* First Last Name Row */}
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1, textAlign: 'left' }}>
                            <label style={{ display: 'block', color: '#8B97B8', fontSize: '12px', marginBottom: '8px', fontWeight: 700, letterSpacing: '0.5px' }}>AD</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4A731" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                </span>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    placeholder="Adınız"
                                    style={{
                                        width: '100%', padding: '15px 16px 15px 46px', background: '#f8fafc',
                                        border: '1px solid rgba(212, 167, 49, 0.2)', borderRadius: '12px',
                                        color: '#0f172a', outline: 'none', fontSize: '15px', fontWeight: 500,
                                        boxSizing: 'border-box', transition: 'all 0.3s'
                                    }}
                                    onFocus={inputFocusStyle} onBlur={inputBlurStyle}
                                />
                            </div>
                        </div>
                        <div style={{ flex: 1, textAlign: 'left' }}>
                            <label style={{ display: 'block', color: '#8B97B8', fontSize: '12px', marginBottom: '8px', fontWeight: 700, letterSpacing: '0.5px' }}>SOYAD</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4A731" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                </span>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    placeholder="Soyadınız"
                                    style={{
                                        width: '100%', padding: '15px 16px 15px 46px', background: '#f8fafc',
                                        border: '1px solid rgba(212, 167, 49, 0.2)', borderRadius: '12px',
                                        color: '#0f172a', outline: 'none', fontSize: '15px', fontWeight: 500,
                                        boxSizing: 'border-box', transition: 'all 0.3s'
                                    }}
                                    onFocus={inputFocusStyle} onBlur={inputBlurStyle}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Username */}
                    <div style={{ textAlign: 'left' }}>
                        <label style={{ display: 'block', color: '#8B97B8', fontSize: '12px', marginBottom: '8px', fontWeight: 700, letterSpacing: '0.5px' }}>KULLANICI ADI</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4A731" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            </span>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Kullanıcı adınız"
                                style={{
                                    width: '100%', padding: '15px 16px 15px 46px', background: '#f8fafc',
                                    border: '1px solid rgba(212, 167, 49, 0.2)', borderRadius: '12px',
                                    color: '#0f172a', outline: 'none', fontSize: '15px', fontWeight: 500,
                                    boxSizing: 'border-box', transition: 'all 0.3s'
                                }}
                                onFocus={inputFocusStyle} onBlur={inputBlurStyle}
                            />
                        </div>
                    </div>

                    {/* Mağaza Adı */}
                    <div style={{ textAlign: 'left' }}>
                        <label style={{ display: 'block', color: '#8B97B8', fontSize: '12px', marginBottom: '8px', fontWeight: 700, letterSpacing: '0.5px' }}>MAĞAZA ADI</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4A731" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                            </span>
                            <input
                                type="text"
                                value={shopName}
                                onChange={(e) => setShopName(e.target.value)}
                                placeholder="Mağazanızın adı"
                                style={{
                                    width: '100%', padding: '15px 16px 15px 46px', background: '#f8fafc',
                                    border: '1px solid rgba(212, 167, 49, 0.2)', borderRadius: '12px',
                                    color: '#0f172a', outline: 'none', fontSize: '15px', fontWeight: 500,
                                    boxSizing: 'border-box', transition: 'all 0.3s'
                                }}
                                onFocus={inputFocusStyle} onBlur={inputBlurStyle}
                            />
                        </div>
                    </div>

                    {/* E-Posta */}
                    <div style={{ textAlign: 'left' }}>
                        <label style={{ display: 'block', color: '#8B97B8', fontSize: '12px', marginBottom: '8px', fontWeight: 700, letterSpacing: '0.5px' }}>E-POSTA</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4A731" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                            </span>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="ornek@email.com"
                                style={{
                                    width: '100%', padding: '15px 16px 15px 46px', background: '#f8fafc',
                                    border: '1px solid rgba(212, 167, 49, 0.2)', borderRadius: '12px',
                                    color: '#0f172a', outline: 'none', fontSize: '15px', fontWeight: 500,
                                    boxSizing: 'border-box', transition: 'all 0.3s'
                                }}
                                onFocus={inputFocusStyle} onBlur={inputBlurStyle}
                            />
                        </div>
                    </div>

                    {/* Şifre */}
                    <div style={{ textAlign: 'left' }}>
                        <label style={{ display: 'block', color: '#8B97B8', fontSize: '12px', marginBottom: '8px', fontWeight: 700, letterSpacing: '0.5px' }}>ŞİFRE</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4A731" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            </span>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                style={{
                                    width: '100%', padding: '15px 16px 15px 46px', background: '#f8fafc',
                                    border: '1px solid rgba(212, 167, 49, 0.2)', borderRadius: '12px',
                                    color: '#0f172a', outline: 'none', fontSize: '15px', fontWeight: 500,
                                    boxSizing: 'border-box', transition: 'all 0.3s'
                                }}
                                onFocus={inputFocusStyle} onBlur={inputBlurStyle}
                            />
                        </div>
                    </div>

                    {/* Şifre Tekrar */}
                    <div style={{ textAlign: 'left' }}>
                        <label style={{ display: 'block', color: '#8B97B8', fontSize: '12px', marginBottom: '8px', fontWeight: 700, letterSpacing: '0.5px' }}>ŞİFRE TEKRAR</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4A731" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            </span>
                            <input
                                type="password"
                                value={passwordConfirm}
                                onChange={(e) => setPasswordConfirm(e.target.value)}
                                placeholder="••••••••"
                                style={{
                                    width: '100%', padding: '15px 16px 15px 46px', background: '#f8fafc',
                                    border: '1px solid rgba(212, 167, 49, 0.2)', borderRadius: '12px',
                                    color: '#0f172a', outline: 'none', fontSize: '15px', fontWeight: 500,
                                    boxSizing: 'border-box', transition: 'all 0.3s'
                                }}
                                onFocus={inputFocusStyle} onBlur={inputBlurStyle}
                            />
                        </div>
                    </div>

                    {/* Terms */}
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', textAlign: 'left', marginTop: '4px' }}>
                        <input
                            type="checkbox"
                            checked={acceptedTerms}
                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                            style={{
                                accentColor: '#D4A731',
                                width: '20px',
                                height: '20px',
                                cursor: 'pointer',
                                flexShrink: 0,
                                marginTop: '2px'
                            }}
                        />
                        <span style={{ color: '#8B97B8', fontSize: '13px', lineHeight: 1.5 }}>
                            <span style={{ color: '#D4A731' }}>Kullanım Şartları</span> ve <span style={{ color: '#D4A731' }}>Gizlilik Politikası</span>'nı okudum ve kabul ediyorum.
                        </span>
                    </label>

                    {/* Alerts */}
                    {error && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '12px 16px', color: '#F87171', fontSize: '13px', fontWeight: 600, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>⚠️</span> {error}
                        </div>
                    )}
                    {successMsg && (
                        <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '10px', padding: '12px 16px', color: '#4ADE80', fontSize: '13px', fontWeight: 600, textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: 1.4 }}>
                            <span>✅</span> {successMsg}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'linear-gradient(135deg, #DFB13E, #B8860B)',
                            color: '#0a0e1a',
                            borderRadius: '12px',
                            border: 'none',
                            fontWeight: 800,
                            fontSize: '16px',
                            letterSpacing: '0.5px',
                            cursor: 'pointer',
                            marginTop: '8px',
                            boxShadow: '0 8px 20px rgba(212, 167, 49, 0.25)',
                            transition: 'all 0.3s',
                            opacity: isLoading ? 0.7 : 1
                        }}
                        onMouseOver={(e) => (e.target as any).style.filter = 'brightness(1.15)'}
                        onMouseOut={(e) => (e.target as any).style.filter = 'none'}
                    >
                        {isLoading ? 'KAYDEDİLİYOR...' : 'KAYIT OL'}
                    </button>

                    <div style={{ marginTop: '16px', color: '#8B97B8', fontSize: '14px' }}>
                        Zaten hesabım var,{' '}
                        <Link to="/login" style={{ color: '#D4A731', fontWeight: 700, textDecoration: 'none' }}>
                            Giriş Yap
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Register;
