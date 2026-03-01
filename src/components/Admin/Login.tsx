import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExchange } from '../../hooks/useExchange';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { authenticateUser } = useExchange();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password.trim()) {
            setError('Kullanıcı adı ve şifre gereklidir!');
            return;
        }

        const result = await authenticateUser(username.trim(), password);

        if (result.success && result.user) {
            if (result.user.role === 'Admin') {
                navigate('/admin');
            } else {
                navigate('/panel');
            }
        } else {
            setError(result.error || 'Giriş başarısız!');
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

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Username */}
                    <div style={{ textAlign: 'left' }}>
                        <label style={{ display: 'block', color: '#8B97B8', fontSize: '12px', marginBottom: '8px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>KULLANICI ADI</label>
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
                                placeholder="kullanici_adi"
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

                    <a href="/" style={{
                        color: '#5A6480',
                        textDecoration: 'none',
                        fontSize: '13px',
                        marginTop: '8px',
                        fontWeight: 500,
                        transition: 'color 0.3s'
                    }}
                        onMouseOver={(e) => (e.target as any).style.color = '#F5D56E'}
                        onMouseOut={(e) => (e.target as any).style.color = '#5A6480'}
                    >
                        &larr; Canlı Ekrana Dön
                    </a>
                </form>
            </div>
        </div>
    );
};

export default Login;
