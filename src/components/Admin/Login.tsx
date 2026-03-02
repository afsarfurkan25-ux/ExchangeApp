import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useExchange } from '../../hooks/useExchange';
import { supabase } from '../../supabaseClient';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [rememberMe, setRememberMe] = useState(false);

    // Forgot Password State
    const [showForgotPw, setShowForgotPw] = useState(false);
    const [forgotPwEmail, setForgotPwEmail] = useState('');
    const [forgotPwStatus, setForgotPwStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
    const [forgotPwLoading, setForgotPwLoading] = useState(false);

    const navigate = useNavigate();
    const { authenticateUser } = useExchange();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password.trim()) {
            setError('Kullanıcı adı ve şifre gereklidir!');
            return;
        }

        // First, check with Supabase Auth if this user exists and has a verified email
        // We assume username = email for auth purposes based on standard supabase auth, or we expect them to login with email
        try {
            // Attempt Supabase Auth login to check email verification status
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: username.trim(),
                password: password,
            });

            if (authError && authError.message.includes('Email not confirmed')) {
                setError('Lütfen mailinizi doğrulayın.');
                return;
            }
        } catch (err) {
            console.error('Auth verification error:', err);
            // Ignore generic errors here and fallback to local authenticateUser to check if it's a legacy user or different mapping
        }

        // Proceed to custom authentication logic (checks 'members' table)
        const result = await authenticateUser(username.trim(), password);

        if (result.success && result.user) {
            if (result.user.role === 'Admin') {
                navigate('/admin');
            } else {
                navigate('/panel');
            }
        } else {
            // Provide a more generic error if not the specific unverified email error
            if (error !== 'Lütfen mailinizi doğrulayın.') {
                setError(result.error || 'Giriş başarısız!');
            }
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotPwStatus({ type: null, message: '' });

        if (!forgotPwEmail.trim()) {
            setForgotPwStatus({ type: 'error', message: 'Lütfen e-posta adresinizi girin.' });
            return;
        }

        setForgotPwLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(forgotPwEmail.trim(), {
            redirectTo: window.location.origin + '/login', // Optional redirect
        });
        setForgotPwLoading(false);

        if (error) {
            setForgotPwStatus({ type: 'error', message: 'Şifre sıfırlama bağlantısı gönderilemedi: ' + error.message });
        } else {
            setForgotPwStatus({ type: 'success', message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.' });
            setForgotPwEmail('');
        }
    };

    const inputFocusStyle = (e: React.FocusEvent<HTMLInputElement>) => e.target.style.borderColor = '#D4A731';
    const inputBlurStyle = (e: React.FocusEvent<HTMLInputElement>) => e.target.style.borderColor = 'rgba(212, 167, 49, 0.1)';

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0d1225 0%, #0a0e1a 100%)',
            fontFamily: "'DM Sans', sans-serif",
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background pattern */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0.05,
                background: '[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:20px_20px]'
            }}></div>

            <div style={{
                background: 'rgba(20, 28, 50, 0.8)',
                backdropFilter: 'blur(10px)',
                padding: '48px 40px',
                borderRadius: '20px',
                border: '1px solid rgba(212, 167, 49, 0.2)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 80px rgba(212, 167, 49, 0.05)',
                width: '100%',
                maxWidth: '420px',
                zIndex: 10,
                textAlign: 'center'
            }}>
                {/* Logo */}
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #D4A731, #8B6914)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 900,
                    fontSize: '32px',
                    color: '#0a0e1a',
                    boxShadow: '0 8px 25px rgba(212, 167, 49, 0.3)'
                }}>K</div>

                <h2 style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: '28px',
                    fontWeight: 700,
                    color: '#F5D56E',
                    marginBottom: '6px'
                }}>Sistem Girişi</h2>
                <p style={{ color: '#5A6480', fontSize: '14px', marginBottom: '36px' }}>Kurmatik.net Yönetim Sistemi</p>

                {/* Tabs */}
                <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', marginBottom: '32px', padding: '4px' }}>
                    <div style={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #D4A731, #8B6914)',
                        color: '#0a0e1a',
                        padding: '12px 0',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '15px',
                        cursor: 'default',
                        boxShadow: '0 4px 12px rgba(212, 167, 49, 0.2)'
                    }}>
                        Giriş Yap
                    </div>
                    <Link to="/register" style={{
                        flex: 1,
                        color: '#8B97B8',
                        padding: '12px 0',
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
                        Kayıt Ol
                    </Link>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Username/Email */}
                    <div style={{ textAlign: 'left' }}>
                        <label style={{ display: 'block', color: '#8B97B8', fontSize: '12px', marginBottom: '8px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>E-POSTA VEYA KULLANICI ADI</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#5A6480', fontSize: '15px' }}>👤</span>
                            <input
                                type="text"
                                style={{
                                    width: '100%',
                                    padding: '14px 16px 14px 42px',
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    border: '1px solid rgba(212, 167, 49, 0.1)',
                                    borderRadius: '12px',
                                    color: '#fff',
                                    outline: 'none',
                                    fontSize: '15px',
                                    transition: 'all 0.3s',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={inputFocusStyle}
                                onBlur={inputBlurStyle}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="ornek@email.com"
                                autoComplete="username"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div style={{ textAlign: 'left' }}>
                        <label style={{ display: 'block', color: '#8B97B8', fontSize: '12px', marginBottom: '8px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>ŞİFRE</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#5A6480', fontSize: '15px' }}>🔒</span>
                            <input
                                type="password"
                                style={{
                                    width: '100%',
                                    padding: '14px 16px 14px 42px',
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    border: '1px solid rgba(212, 167, 49, 0.1)',
                                    borderRadius: '12px',
                                    color: '#fff',
                                    outline: 'none',
                                    fontSize: '15px',
                                    transition: 'all 0.3s',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={inputFocusStyle}
                                onBlur={inputBlurStyle}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="current-password"
                            />
                        </div>
                    </div>

                    {/* Remember me & Forgot Password */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-4px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#C8D4E8', fontSize: '13px' }}>
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                style={{
                                    accentColor: '#D4A731',
                                    width: '16px',
                                    height: '16px',
                                    cursor: 'pointer'
                                }}
                            />
                            Beni hatırla
                        </label>
                        <button
                            type="button"
                            onClick={() => setShowForgotPw(true)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#D4A731',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                padding: 0
                            }}
                        >
                            Şifremi unuttum
                        </button>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '10px',
                            padding: '12px 16px',
                            color: '#F87171',
                            fontSize: '13px',
                            fontWeight: 600,
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        style={{
                            background: 'linear-gradient(135deg, #D4A731, #8B6914)',
                            color: '#0a0e1a',
                            padding: '15px',
                            borderRadius: '12px',
                            border: 'none',
                            fontWeight: 700,
                            fontSize: '15px',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                            marginTop: '8px',
                            boxShadow: '0 4px 20px rgba(212, 167, 49, 0.3)',
                            letterSpacing: '0.5px'
                        }}
                        onMouseOver={(e) => (e.target as any).style.filter = 'brightness(1.1)'}
                        onMouseOut={(e) => (e.target as any).style.filter = 'none'}
                    >
                        GİRİŞ YAP
                    </button>

                    <div style={{ marginTop: '16px', color: '#8B97B8', fontSize: '14px' }}>
                        Hesabınız yok mu?{' '}
                        <Link to="/register" style={{ color: '#D4A731', fontWeight: 700, textDecoration: 'none' }}>Kayıt Ol</Link>
                    </div>
                </form>
            </div>

            {/* Forgot Password Modal */}
            {showForgotPw && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100
                }}>
                    <div style={{
                        background: '#141C32',
                        padding: '40px',
                        borderRadius: '24px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        width: '100%',
                        maxWidth: '440px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                        position: 'relative',
                        textAlign: 'left'
                    }}>
                        {/* Close Button */}
                        <button
                            type="button"
                            onClick={() => { setShowForgotPw(false); setForgotPwStatus({ type: null, message: '' }); }}
                            style={{
                                position: 'absolute',
                                top: '24px',
                                right: '24px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '36px',
                                height: '36px',
                                color: '#8B97B8',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'background 0.3s'
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')}
                            onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
                        >
                            ✕
                        </button>

                        <h3 style={{ color: '#F5D56E', margin: '0 0 32px 0', fontSize: '22px', fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>
                            Şifremi Unuttum
                        </h3>

                        {/* Lock Icon */}
                        <div style={{ margin: '0 auto 24px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(212, 167, 49, 0.08)', border: '1px solid rgba(212, 167, 49, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4A731" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                        </div>

                        <p style={{ color: '#C8D4E8', fontSize: '15px', marginBottom: '32px', lineHeight: 1.6 }}>
                            Şifrenizi sıfırlamak için kayıtlı e-posta adresinizi girin. Size şifre sıfırlama bağlantısı göndereceğiz.
                        </p>

                        <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div>
                                <label style={{ display: 'block', color: '#C8D4E8', fontSize: '12px', marginBottom: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    E-POSTA ADRESİ
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4A731" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                            <polyline points="22,6 12,13 2,6"></polyline>
                                        </svg>
                                    </span>
                                    <input
                                        type="email"
                                        required
                                        value={forgotPwEmail}
                                        onChange={e => setForgotPwEmail(e.target.value)}
                                        placeholder="ornek@email.com"
                                        style={{
                                            width: '100%',
                                            padding: '16px 16px 16px 48px',
                                            background: '#f8fafc',
                                            border: '2px solid rgba(212, 167, 49, 0.6)',
                                            borderRadius: '12px',
                                            color: '#0f172a',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            fontSize: '15px',
                                            fontWeight: 500,
                                            transition: 'all 0.3s'
                                        }}
                                        onFocus={(e) => { e.target.style.borderColor = '#D4A731'; e.target.style.boxShadow = '0 0 0 3px rgba(212, 167, 49, 0.2)'; }}
                                        onBlur={(e) => { e.target.style.borderColor = 'rgba(212, 167, 49, 0.6)'; e.target.style.boxShadow = 'none'; }}
                                    />
                                </div>
                            </div>

                            {forgotPwStatus.message && (
                                <div style={{
                                    padding: '12px',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    background: forgotPwStatus.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    color: forgotPwStatus.type === 'success' ? '#4ADE80' : '#F87171',
                                    border: `1px solid ${forgotPwStatus.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                                }}>
                                    {forgotPwStatus.message}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={forgotPwLoading}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    background: 'linear-gradient(135deg, #DFB13E, #B8860B)',
                                    border: 'none',
                                    borderRadius: '12px',
                                    color: '#0a0e1a',
                                    fontWeight: 700,
                                    fontSize: '16px',
                                    cursor: 'pointer',
                                    opacity: forgotPwLoading ? 0.7 : 1,
                                    boxShadow: '0 4px 15px rgba(212, 167, 49, 0.2)',
                                    transition: 'filter 0.3s'
                                }}
                                onMouseOver={(e) => (e.target as any).style.filter = 'brightness(1.1)'}
                                onMouseOut={(e) => (e.target as any).style.filter = 'none'}
                            >
                                {forgotPwLoading ? 'Gönderiliyor...' : 'Sıfırlama Linki Gönder'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;
