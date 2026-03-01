import React, { useState, useEffect, useCallback } from 'react';
import { useExchange } from '../../hooks/useExchange';
import type { Rate } from '../../context/ExchangeContext';
import KarHesaplama from '../Admin/KarHesaplama';
import NotificationBell from '../Shared/NotificationBell';
import Announcements from '../Admin/Announcements';
import PriceAlerts from '../Admin/PriceAlerts';

interface UserPanelSettings {
    shopName: string;
    scrollingText: string;
}

const getUserSettingsKey = (username: string) => `userPanelSettings_${username}`;

const UserPanel: React.FC = () => {
    const { rates, settings, currentUser, liveRates, logoutUser, lastUpdated, updateRates, updateTickerItems, tickerItems, historyLogs, updateMemberPassword } = useExchange();

    // Per-user settings from localStorage
    const loadUserSettings = (): UserPanelSettings => {
        if (!currentUser?.name) return {
            shopName: settings.shopName,
            scrollingText: settings.scrollingText,
        };
        const key = getUserSettingsKey(currentUser.name);
        const saved = localStorage.getItem(key);
        if (saved) {
            try { return JSON.parse(saved); } catch { /* fall through */ }
        }
        // Default dynamic shop name for logged-in user if no specific settings saved
        return {
            shopName: `${currentUser.name.toUpperCase()} SARRAFİYE`,
            scrollingText: settings.scrollingText,
        };
    };

    const [localRates, setLocalRates] = useState<Rate[]>(rates);
    const [hasChanges, setHasChanges] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [activeView, setActiveView] = useState<'dashboard' | 'settings' | 'history' | 'kar_hesaplama' | 'price_alerts'>('dashboard');
    const [userSettings, setUserSettings] = useState<UserPanelSettings>(loadUserSettings);
    const [localShopName, setLocalShopName] = useState(userSettings.shopName);
    const [localScrollingText, setLocalScrollingText] = useState(userSettings.scrollingText);
    const [localTickerItems, setLocalTickerItems] = useState(tickerItems);
    const [showAnnouncementsPopup, setShowAnnouncementsPopup] = useState(false);

    const [marketData, setMarketData] = useState<any>({});
    const [marketError, setMarketError] = useState<string | null>(null);
    const [lastMarketUpdate, setLastMarketUpdate] = useState<Date | null>(null);

    const fetchMarketData = useCallback(async () => {
        if (activeView !== 'price_alerts') return;

        try {
            setMarketError(null);
            const fetchAPI = async (endpoint: string) => {
                try {
                    const res = await fetch(endpoint);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return await res.json();
                } catch (e) {
                    console.error(`Fetch ${endpoint} failed:`, e);
                    return null;
                }
            };

            const [currency, gold, silver] = await Promise.all([
                fetchAPI('http://localhost:5000/api/currency'),
                fetchAPI('http://localhost:5000/api/gold'),
                fetchAPI('http://localhost:5000/api/silver')
            ]);

            if (!currency && !gold && !silver) {
                setMarketError('Backend sunucusuna bağlanılamadı. Lütfen start_app.bat dosyasını çalıştırdığıza emin olun.');
                return;
            }

            setMarketData({
                currency: currency?.rates || {},
                gold: gold || {},
                silver: silver || {}
            });
            setLastMarketUpdate(new Date());

        } catch (error) {
            console.error('Market API Error:', error);
            setMarketError('Veri çekme hatası oluştu.');
        }
    }, [activeView]);

    useEffect(() => {
        fetchMarketData();
        const interval = setInterval(fetchMarketData, 30000);
        return () => clearInterval(interval);
    }, [fetchMarketData]);

    const [activeRightTab, setActiveRightTab] = useState<'currency' | 'ticker'>('currency');
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [pwOld, setPwOld] = useState('');
    const [pwNew, setPwNew] = useState('');
    const [pwConfirm, setPwConfirm] = useState('');
    const [pwError, setPwError] = useState<string | null>(null);
    const [pwSaving, setPwSaving] = useState(false);

    useEffect(() => {
        setLocalRates(rates);
        setLocalTickerItems(tickerItems);
        setHasChanges(false);
    }, [rates, tickerItems]);

    // Load user-specific settings when user changes
    useEffect(() => {
        const loaded = loadUserSettings();
        setUserSettings(loaded);
        setLocalShopName(loaded.shopName);
        setLocalScrollingText(loaded.scrollingText);
    }, [currentUser?.name]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClick = () => setDropdownOpen(false);
        if (dropdownOpen) {
            setTimeout(() => document.addEventListener('click', handleClick), 0);
            return () => document.removeEventListener('click', handleClick);
        }
    }, [dropdownOpen]);

    // roles: Admin, Yönetici can edit rates; Üye can only view
    const canEdit = currentUser?.role === 'Admin' || currentUser?.role === 'Yönetici';

    const goldRates = localRates.filter(r => r.type === 'gold');
    const currencyRates = localRates.filter(r => r.type === 'currency');

    const handleGoldRateChange = (filteredIndex: number, field: 'buy' | 'sell' | 'name', value: string) => {
        const goldItem = goldRates[filteredIndex];
        const globalIndex = localRates.findIndex(r => r.name === goldItem.name && r.type === goldItem.type);
        if (globalIndex !== -1) {
            const newRates = [...localRates];
            newRates[globalIndex] = { ...newRates[globalIndex], [field]: value };
            setLocalRates(newRates);
            setHasChanges(true);
        }
    };

    const handleCurrencyRateChange = (filteredIndex: number, field: 'buy' | 'sell' | 'name', value: string) => {
        const currItem = currencyRates[filteredIndex];
        const globalIndex = localRates.findIndex(r => r.name === currItem.name && r.type === currItem.type);
        if (globalIndex !== -1) {
            const newRates = [...localRates];
            newRates[globalIndex] = { ...newRates[globalIndex], [field]: value };
            setLocalRates(newRates);
            setHasChanges(true);
        }
    };

    const handleTickerChange = (index: number, field: string, value: string | boolean) => {
        const newItems = [...localTickerItems];
        const updatedItem = { ...newItems[index], [field]: value };

        if (field === 'value') {
            const newVal = parseFloat(value as string);
            const baseVal = parseFloat(tickerItems[index]?.value || '0');

            if (!isNaN(newVal) && !isNaN(baseVal) && baseVal !== 0) {
                const diff = newVal - baseVal;
                const percent = (diff / baseVal) * 100;
                updatedItem.isUp = diff >= 0;
                updatedItem.change = (diff >= 0 ? '+' : '') + percent.toFixed(2) + '%';
            }
        }

        newItems[index] = updatedItem;
        setLocalTickerItems(newItems);
        setHasChanges(true);
    };

    // --- Item Reordering Logic ---
    const moveCurrencyRate = (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === currencyRates.length - 1)) return;

        const currentCurrencies = [...currencyRates];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        // Swap
        [currentCurrencies[index], currentCurrencies[targetIndex]] = [currentCurrencies[targetIndex], currentCurrencies[index]];

        // Reconstruct localRates
        const newLocalRates = [...goldRates, ...currentCurrencies];
        setLocalRates(newLocalRates);
        setHasChanges(true);
    };

    const moveTickerItem = (index: number, direction: 'left' | 'right') => {
        if ((direction === 'left' && index === 0) || (direction === 'right' && index === localTickerItems.length - 1)) return;

        const newItems = [...localTickerItems];
        const targetIndex = direction === 'left' ? index - 1 : index + 1;

        // Swap
        [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];

        setLocalTickerItems(newItems);
        setHasChanges(true);
    };

    const handleAddRate = (type: 'gold' | 'currency') => {
        const newRate: any = {
            id: Math.floor(Math.random() * 2000000000),
            name: type === 'gold' ? 'Yeni Altın' : 'Yeni Döviz',
            buy: '0',
            sell: '0',
            type: type,
            isVisible: true
        };
        setLocalRates([...localRates, newRate]);
        setHasChanges(true);
    };

    const handleDeleteRate = (index: number, type: 'gold' | 'currency') => {
        if (window.confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
            let targetItem: Rate;
            if (type === 'gold') {
                targetItem = goldRates[index];
            } else {
                targetItem = currencyRates[index];
            }

            if (targetItem) {
                const newRates = localRates.filter(r => r !== targetItem);
                setLocalRates(newRates);
                setHasChanges(true);
            }
        }
    };

    const handleToggleRateVisibility = (index: number, type: 'gold' | 'currency') => {
        let targetItem: Rate;
        if (type === 'gold') {
            targetItem = goldRates[index];
        } else {
            targetItem = currencyRates[index];
        }

        const globalIndex = localRates.findIndex(r => r === targetItem);
        if (globalIndex !== -1) {
            const newRates = [...localRates];
            newRates[globalIndex] = { ...newRates[globalIndex], isVisible: !newRates[globalIndex].isVisible };
            setLocalRates(newRates);
            setHasChanges(true);
        }
    };

    const handleAddTickerItem = () => {
        const newItem: any = {
            id: Math.floor(Math.random() * 2000000000),
            name: 'Yeni Veri',
            value: '0',
            change: '0%',
            isUp: true,
            isVisible: true
        };
        setLocalTickerItems([...localTickerItems, newItem]);
        setHasChanges(true);
    };

    const handleDeleteTickerItem = (index: number) => {
        if (window.confirm('Bu veriyi silmek istediğinize emin misiniz?')) {
            const newItems = localTickerItems.filter((_, i) => i !== index);
            setLocalTickerItems(newItems);
            setHasChanges(true);
        }
    };

    const handleToggleTickerVisibility = (index: number) => {
        const newItems = [...localTickerItems];
        newItems[index] = { ...newItems[index], isVisible: !newItems[index].isVisible };
        setLocalTickerItems(newItems);
        setHasChanges(true);
    };

    const handleSaveRates = () => {
        updateRates(localRates);
        updateTickerItems(localTickerItems);
        setHasChanges(false);
        alert('Kurlar ve alt bant verileri başarıyla güncellendi!');
    };

    const handleSaveSettings = () => {
        if (!currentUser?.name) return;
        const newSettings: UserPanelSettings = {
            shopName: localShopName,
            scrollingText: localScrollingText,
        };
        localStorage.setItem(getUserSettingsKey(currentUser.name), JSON.stringify(newSettings));
        setUserSettings(newSettings);
        alert('Ayarlar başarıyla güncellendi!');
    };

    const handleLogout = () => {
        logoutUser();
        window.location.href = '/login';
    };

    const getRoleBadge = (role: string) => {
        const colors: Record<string, { bg: string; text: string; border: string }> = {
            'Admin': { bg: 'rgba(239, 68, 68, 0.15)', text: '#F87171', border: 'rgba(239, 68, 68, 0.3)' },
            'Yönetici': { bg: 'rgba(96, 165, 250, 0.15)', text: '#60A5FA', border: 'rgba(96, 165, 250, 0.3)' },
            'Üye': { bg: 'rgba(156, 163, 175, 0.15)', text: '#9CA3AF', border: 'rgba(156, 163, 175, 0.3)' },
        };
        return colors[role] || colors['Üye'];
    };

    const formatDate = (date: Date) => {
        const d = new Date(date);
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        return `${day}.${month}.${year} — ${hours}:${minutes}`;
    };

    const roleBadge = getRoleBadge(currentUser?.role || 'Üye');

    const editableInputStyle: React.CSSProperties = {
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '8px',
        color: 'inherit',
        padding: '6px 10px',
        fontSize: '14px',
        fontWeight: 600,
        width: '100px',
        outline: 'none',
        textAlign: 'right',
        transition: 'border-color 0.3s',
    };

    const dropdownItemStyle: React.CSSProperties = {
        width: '100%',
        padding: '12px 18px',
        background: 'transparent',
        border: 'none',
        color: '#C8D4E8',
        textAlign: 'left',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        transition: 'background 0.2s',
        borderRadius: '6px',
    };

    const viewTitles: Record<string, string> = {
        'dashboard': '📊 Kur Paneli',
        'settings': '⚙️ Genel Ayarlar',
        'history': '📜 Geçmiş Listeleme',
        'kar_hesaplama': '🍀 Kar Hesaplama',
        'price_alerts': '🔔 Fiyat Alarm Sistemi',
    };

    const panelThStyle: React.CSSProperties = {
        padding: '14px 16px',
        textAlign: 'left',
        color: '#5A6480',
        fontSize: '12px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
    };

    const panelTdStyle: React.CSSProperties = {
        padding: '10px 16px',
        fontSize: '14px',
        color: '#C8D4E8',
        fontWeight: 500,
        verticalAlign: 'middle',
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#0a0e1a',
            color: '#C8D4E8',
            fontFamily: "'DM Sans', sans-serif",
        }}>
            {/* Top Bar */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 32px',
                background: 'rgba(20, 28, 50, 0.95)',
                borderBottom: '1px solid rgba(212, 167, 49, 0.2)',
                position: 'sticky',
                top: 0,
                zIndex: 100,
                backdropFilter: 'blur(10px)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #D4A731, #8B6914)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: "'Playfair Display', serif",
                        fontWeight: 900,
                        fontSize: '22px',
                        color: '#0a0e1a'
                    }}>K</div>
                    <div>
                        <h1 style={{
                            fontFamily: "'Playfair Display', serif",
                            fontSize: '20px',
                            fontWeight: 700,
                            color: '#F5D56E',
                            margin: 0
                        }}>{userSettings.shopName}</h1>
                        <p style={{ color: '#5A6480', fontSize: '12px', margin: 0 }}>Kullanıcı Paneli</p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Ana Sayfa Link */}
                    <a href="/" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 18px',
                        background: 'rgba(212, 167, 49, 0.1)',
                        border: '1px solid rgba(212, 167, 49, 0.2)',
                        borderRadius: '10px',
                        color: '#F5D56E',
                        textDecoration: 'none',
                        fontSize: '13px',
                        fontWeight: 600,
                        transition: 'all 0.3s',
                    }}>
                        🏠 Ana Sayfa
                    </a>

                    <NotificationBell />

                    {/* User info with dropdown */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                background: dropdownOpen ? 'rgba(212, 167, 49, 0.08)' : 'transparent',
                                border: dropdownOpen ? '1px solid rgba(212, 167, 49, 0.2)' : '1px solid transparent',
                                borderRadius: '12px',
                                padding: '6px 14px',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                            }}
                        >
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: `linear-gradient(135deg, ${roleBadge.bg}, ${roleBadge.border})`,
                                border: `1px solid ${roleBadge.border}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                fontWeight: 800,
                                color: roleBadge.text,
                            }}>
                                {currentUser?.name ? currentUser.name[0].toUpperCase() : '?'}
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#C8D4E8' }}>{currentUser?.name || 'Kullanıcı'}</div>
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: roleBadge.text,
                                    background: roleBadge.bg,
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    border: `1px solid ${roleBadge.border}`,
                                }}>{currentUser?.role}</span>
                            </div>
                            <span style={{
                                color: '#5A6480',
                                fontSize: '12px',
                                transition: 'transform 0.3s',
                                transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            }}>▼</span>
                        </button>

                        {/* Dropdown Menu */}
                        {dropdownOpen && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '8px',
                                background: 'rgba(20, 28, 50, 0.98)',
                                border: '1px solid rgba(212, 167, 49, 0.2)',
                                borderRadius: '14px',
                                padding: '8px',
                                minWidth: '220px',
                                boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                                backdropFilter: 'blur(20px)',
                                animation: 'fadeIn 0.2s ease',
                                zIndex: 200,
                            }}>
                                <button
                                    onClick={() => { setActiveView('dashboard'); setDropdownOpen(false); }}
                                    style={{
                                        ...dropdownItemStyle,
                                        color: activeView === 'dashboard' ? '#F5D56E' : '#C8D4E8',
                                        background: activeView === 'dashboard' ? 'rgba(212, 167, 49, 0.1)' : 'transparent',
                                    }}
                                    onMouseEnter={(e) => { if (activeView !== 'dashboard') e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                    onMouseLeave={(e) => { if (activeView !== 'dashboard') e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <span>📊</span> Kur Paneli
                                </button>
                                <button
                                    onClick={() => { setActiveView('settings'); setDropdownOpen(false); }}
                                    style={{
                                        ...dropdownItemStyle,
                                        color: activeView === 'settings' ? '#F5D56E' : '#C8D4E8',
                                        background: activeView === 'settings' ? 'rgba(212, 167, 49, 0.1)' : 'transparent',
                                    }}
                                    onMouseEnter={(e) => { if (activeView !== 'settings') e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                    onMouseLeave={(e) => { if (activeView !== 'settings') e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <span>⚙️</span> Genel Ayarlar
                                </button>
                                <button
                                    onClick={() => { setActiveView('history'); setDropdownOpen(false); }}
                                    style={{
                                        ...dropdownItemStyle,
                                        color: activeView === 'history' ? '#F5D56E' : '#C8D4E8',
                                        background: activeView === 'history' ? 'rgba(212, 167, 49, 0.1)' : 'transparent',
                                    }}
                                    onMouseEnter={(e) => { if (activeView !== 'history') e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                    onMouseLeave={(e) => { if (activeView !== 'history') e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <span>📜</span> Geçmiş Listeleme
                                </button>

                                {(currentUser?.role === 'Admin' || currentUser?.role === 'Yönetici') && (
                                    <>
                                        <div style={{ height: '1px', background: 'rgba(212, 167, 49, 0.1)', margin: '4px 8px' }} />
                                        <button
                                            onClick={() => { setShowAnnouncementsPopup(true); setDropdownOpen(false); }}
                                            style={{
                                                ...dropdownItemStyle,
                                                color: '#C8D4E8',
                                                background: 'transparent',
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            <span>📢</span> Duyurular
                                        </button>
                                    </>
                                )}

                                <button
                                    onClick={() => { setActiveView('kar_hesaplama'); setDropdownOpen(false); }}
                                    style={{
                                        ...dropdownItemStyle,
                                        color: activeView === 'kar_hesaplama' ? '#F5D56E' : '#C8D4E8',
                                        background: activeView === 'kar_hesaplama' ? 'rgba(212, 167, 49, 0.1)' : 'transparent',
                                    }}
                                    onMouseEnter={(e) => { if (activeView !== 'kar_hesaplama') e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                    onMouseLeave={(e) => { if (activeView !== 'kar_hesaplama') e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <span>🍀</span> Kar Hesaplama
                                </button>
                                <button
                                    onClick={() => { setActiveView('price_alerts'); setDropdownOpen(false); }}
                                    style={{
                                        ...dropdownItemStyle,
                                        color: activeView === 'price_alerts' ? '#F5D56E' : '#C8D4E8',
                                        background: activeView === 'price_alerts' ? 'rgba(212, 167, 49, 0.1)' : 'transparent',
                                    }}
                                    onMouseEnter={(e) => { if (activeView !== 'price_alerts') e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                    onMouseLeave={(e) => { if (activeView !== 'price_alerts') e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <span>🔔</span> Fiyat Alarmları
                                </button>
                                <button
                                    onClick={() => { setShowPasswordModal(true); setDropdownOpen(false); setPwOld(''); setPwNew(''); setPwConfirm(''); setPwError(null); }}
                                    style={{
                                        ...dropdownItemStyle,
                                        color: '#C8D4E8',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <span>🔑</span> Şifre Değiştir
                                </button>

                                <div style={{ height: '1px', background: 'rgba(212, 167, 49, 0.1)', margin: '6px 8px' }} />

                                <button
                                    onClick={handleLogout}
                                    style={{
                                        ...dropdownItemStyle,
                                        color: '#F87171',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <span>🚪</span> Çıkış Yap
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Active View Indicator */}
            {
                activeView !== 'dashboard' && (
                    <div style={{
                        padding: '12px 32px',
                        background: 'rgba(212, 167, 49, 0.04)',
                        borderBottom: '1px solid rgba(212, 167, 49, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                    }}>
                        <button
                            onClick={() => setActiveView('dashboard')}
                            style={{
                                background: 'none', border: 'none', color: '#5A6480',
                                cursor: 'pointer', fontSize: '13px', padding: 0,
                            }}
                        >← Ana Panel</button>
                        <span style={{ color: '#3A4060' }}>|</span>
                        <span style={{ color: '#F5D56E', fontSize: '13px', fontWeight: 600 }}>
                            {viewTitles[activeView]}
                        </span>
                    </div>
                )
            }

            {/* Main Content */}
            <main style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>

                {/* ═══════════════════════════ DASHBOARD VIEW ═══════════════════════════ */}
                {activeView === 'dashboard' && (
                    <>
                        {/* Welcome Banner */}
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(212, 167, 49, 0.1), rgba(212, 167, 49, 0.02))',
                            border: '1px solid rgba(212, 167, 49, 0.2)',
                            borderRadius: '16px',
                            padding: '28px 32px',
                            marginBottom: '28px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <div>
                                <h2 style={{
                                    fontFamily: "'Playfair Display', serif",
                                    fontSize: '24px',
                                    fontWeight: 700,
                                    color: '#F5D56E',
                                    margin: '0 0 6px 0'
                                }}>Hoş Geldiniz, {currentUser?.name?.split(' ')[0] || 'Kullanıcı'}!</h2>
                                <p style={{ color: '#5A6480', fontSize: '14px', margin: 0 }}>
                                    {canEdit
                                        ? 'Kurları güncelleyebilir ve döviz fiyatlarını takip edebilirsiniz.'
                                        : 'Güncel kur ve döviz fiyatlarını buradan takip edebilirsiniz.'}
                                </p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '12px', color: '#5A6480', marginBottom: '4px' }}>Son Güncelleme</div>
                                <div style={{ fontSize: '14px', color: '#F5D56E', fontWeight: 600 }}>{formatDate(lastUpdated)}</div>
                            </div>
                        </div>

                        {/* Live Rates Summary */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '28px' }}>
                            <div style={{
                                background: 'rgba(20, 28, 50, 0.8)',
                                border: '1px solid rgba(212, 167, 49, 0.1)',
                                borderRadius: '14px',
                                padding: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                            }}>
                                <div style={{
                                    width: '50px', height: '50px', borderRadius: '12px',
                                    background: 'rgba(245, 213, 110, 0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '24px'
                                }}>🥇</div>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#5A6480', textTransform: 'uppercase', letterSpacing: '1px' }}>HAS ALTIN</div>
                                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#F5D56E' }}>{liveRates.has}</div>
                                </div>
                            </div>
                            <div style={{
                                background: 'rgba(20, 28, 50, 0.8)',
                                border: '1px solid rgba(212, 167, 49, 0.1)',
                                borderRadius: '14px',
                                padding: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                            }}>
                                <div style={{
                                    width: '50px', height: '50px', borderRadius: '12px',
                                    background: 'rgba(96, 165, 250, 0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '24px'
                                }}>💎</div>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#5A6480', textTransform: 'uppercase', letterSpacing: '1px' }}>ONS</div>
                                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#60A5FA' }}>{liveRates.ons}</div>
                                </div>
                            </div>
                        </div>

                        {/* Edit Info Banner */}
                        {canEdit && (
                            <div style={{
                                background: 'rgba(96, 165, 250, 0.08)',
                                border: '1px solid rgba(96, 165, 250, 0.2)',
                                borderRadius: '12px',
                                padding: '14px 20px',
                                marginBottom: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                color: '#60A5FA',
                                fontSize: '13px',
                                fontWeight: 600,
                            }}>
                                <span style={{ fontSize: '16px' }}>✏️</span>
                                Düzenleme yetkiniz aktif — Alış/Satış değerlerini doğrudan düzenleyebilirsiniz.
                            </div>
                        )}

                        {/* Rate Tables */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            {/* Gold Rates */}
                            <div style={{
                                background: 'rgba(20, 28, 50, 0.8)',
                                border: '1px solid rgba(212, 167, 49, 0.1)',
                                borderRadius: '14px',
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    padding: '18px 24px',
                                    background: 'rgba(0,0,0,0.3)',
                                    borderBottom: '1px solid rgba(212, 167, 49, 0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '10px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '18px' }}>🥇</span>
                                        <h3 style={{ color: '#F5D56E', fontSize: '15px', fontWeight: 700, margin: 0, letterSpacing: '1px' }}>ALTIN / GÜMÜŞ</h3>
                                    </div>
                                    {canEdit && (
                                        <button onClick={() => handleAddRate('gold')} style={{
                                            background: 'rgba(212, 167, 49, 0.1)',
                                            border: '1px solid rgba(212, 167, 49, 0.3)',
                                            color: '#F5D56E',
                                            padding: '6px 14px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                            fontSize: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}>
                                            <span>+</span> Yeni Ekle
                                        </button>
                                    )}
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            <th style={panelThStyle}>Ürün</th>
                                            <th style={panelThStyle}>Alış ₺</th>
                                            <th style={panelThStyle}>Satış ₺</th>
                                            {canEdit && <th style={{ ...panelThStyle, width: '60px', textAlign: 'center' }}>Görünür</th>}
                                            {canEdit && <th style={{ ...panelThStyle, width: '40px' }}></th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {goldRates.map((r, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                <td style={{ ...panelTdStyle, color: '#C8D4E8', fontWeight: 600 }}>{r.name}</td>
                                                <td style={panelTdStyle}>
                                                    {canEdit ? (
                                                        <input type="text" style={{ ...editableInputStyle, color: '#4ADE80' }} value={r.buy}
                                                            onChange={(e) => handleGoldRateChange(i, 'buy', e.target.value)}
                                                            onFocus={(e) => e.target.style.borderColor = '#D4A731'}
                                                            onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'} />
                                                    ) : (
                                                        <span style={{ color: '#4ADE80', fontWeight: 600 }}>{r.buy}</span>
                                                    )}
                                                </td>
                                                <td style={panelTdStyle}>
                                                    {canEdit ? (
                                                        <input type="text" style={{ ...editableInputStyle, color: '#F87171' }} value={r.sell}
                                                            onChange={(e) => handleGoldRateChange(i, 'sell', e.target.value)}
                                                            onFocus={(e) => e.target.style.borderColor = '#D4A731'}
                                                            onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'} />
                                                    ) : (
                                                        <span style={{ color: '#F87171', fontWeight: 600 }}>{r.sell}</span>
                                                    )}
                                                </td>
                                                {canEdit && (
                                                    <>
                                                        <td style={{ ...panelTdStyle, textAlign: 'center' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={r.isVisible !== false}
                                                                onChange={() => handleToggleRateVisibility(i, 'gold')}
                                                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#D4A731' }}
                                                            />
                                                        </td>
                                                        <td style={{ ...panelTdStyle, textAlign: 'center' }}>
                                                            <button
                                                                onClick={() => handleDeleteRate(i, 'gold')}
                                                                style={{
                                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                                                    color: '#F87171',
                                                                    width: '32px',
                                                                    height: '32px',
                                                                    borderRadius: '8px',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontSize: '14px'
                                                                }}
                                                                title="Sil"
                                                            >
                                                                🗑
                                                            </button>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Currency / Ticker Tabbed Panel */}
                            <div style={{
                                background: 'rgba(20, 28, 50, 0.8)',
                                border: '1px solid rgba(212, 167, 49, 0.1)',
                                borderRadius: '14px',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                            }}>
                                {/* Tab Header */}
                                <div style={{
                                    display: 'flex',
                                    borderBottom: '1px solid rgba(212, 167, 49, 0.15)',
                                }}>
                                    <button
                                        onClick={() => setActiveRightTab('currency')}
                                        style={{
                                            flex: 1,
                                            padding: '18px 0',
                                            background: activeRightTab === 'currency' ? 'rgba(96, 165, 250, 0.1)' : 'rgba(0,0,0,0.2)',
                                            border: 'none',
                                            borderBottom: activeRightTab === 'currency' ? '2px solid #60A5FA' : '2px solid transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '10px',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s',
                                        }}
                                    >
                                        <span style={{ fontSize: '18px' }}>💱</span>
                                        <h3 style={{
                                            color: activeRightTab === 'currency' ? '#60A5FA' : '#5A6480',
                                            fontSize: '14px', fontWeight: 700, margin: 0, letterSpacing: '1px'
                                        }}>DÖVİZ</h3>
                                    </button>
                                    <button
                                        onClick={() => setActiveRightTab('ticker')}
                                        style={{
                                            flex: 1,
                                            padding: '18px 0',
                                            background: activeRightTab === 'ticker' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(0,0,0,0.2)',
                                            border: 'none',
                                            borderBottom: activeRightTab === 'ticker' ? '2px solid #4ADE80' : '2px solid transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '10px',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s',
                                        }}
                                    >
                                        <span style={{ fontSize: '18px' }}>📉</span>
                                        <h3 style={{
                                            color: activeRightTab === 'ticker' ? '#4ADE80' : '#5A6480',
                                            fontSize: '14px', fontWeight: 700, margin: 0, letterSpacing: '1px'
                                        }}>ALT BANT</h3>
                                    </button>
                                </div>

                                {/* Table Content */}
                                <div style={{ flex: 1, overflowY: 'auto' }}>
                                    {activeRightTab === 'currency' && (
                                        <div style={{
                                            padding: '18px 24px 0',
                                            background: 'rgba(0,0,0,0.3)',
                                            borderBottom: '1px solid rgba(212, 167, 49, 0.15)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'flex-end',
                                            gap: '10px'
                                        }}>
                                            {canEdit && (
                                                <button onClick={() => handleAddRate('currency')} style={{
                                                    background: 'rgba(96, 165, 250, 0.1)',
                                                    border: '1px solid rgba(96, 165, 250, 0.3)',
                                                    color: '#60A5FA',
                                                    padding: '6px 14px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontWeight: 600,
                                                    fontSize: '12px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    marginBottom: '18px'
                                                }}>
                                                    <span>+</span> Yeni Ekle
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    {activeRightTab === 'ticker' && (
                                        <div style={{
                                            padding: '18px 24px 0',
                                            background: 'rgba(0,0,0,0.3)',
                                            borderBottom: '1px solid rgba(212, 167, 49, 0.15)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'flex-end',
                                            gap: '10px'
                                        }}>
                                            {canEdit && (
                                                <button onClick={handleAddTickerItem} style={{
                                                    background: 'rgba(74, 222, 128, 0.1)',
                                                    border: '1px solid rgba(74, 222, 128, 0.3)',
                                                    color: '#4ADE80',
                                                    padding: '6px 14px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontWeight: 600,
                                                    fontSize: '12px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    marginBottom: '18px'
                                                }}>
                                                    <span>+</span> Yeni Ekle
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ ...panelThStyle, width: '40px' }}></th>
                                                <th style={panelThStyle}>{activeRightTab === 'currency' ? 'Döviz' : 'Başlık'}</th>
                                                <th style={panelThStyle}>{activeRightTab === 'currency' ? 'Alış ₺' : 'Değer'}</th>
                                                <th style={panelThStyle}>{activeRightTab === 'currency' ? 'Satış ₺' : 'Değişim'}</th>
                                                {canEdit && <th style={{ ...panelThStyle, width: '60px', textAlign: 'center' }}>Görünür</th>}
                                                {canEdit && <th style={{ ...panelThStyle, width: '40px' }}></th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeRightTab === 'currency' ? (
                                                // Currency Rows
                                                currencyRates.map((r, i) => (
                                                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                        <td style={{ padding: '8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                            {canEdit && (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                                                                    <button
                                                                        onClick={() => moveCurrencyRate(i, 'up')}
                                                                        disabled={i === 0}
                                                                        style={{
                                                                            background: 'transparent',
                                                                            border: 'none',
                                                                            color: i === 0 ? '#333' : '#60A5FA',
                                                                            cursor: i === 0 ? 'default' : 'pointer',
                                                                            fontSize: '12px',
                                                                            padding: '2px',
                                                                            lineHeight: 1
                                                                        }}
                                                                    >▲</button>
                                                                    <button
                                                                        onClick={() => moveCurrencyRate(i, 'down')}
                                                                        disabled={i === currencyRates.length - 1}
                                                                        style={{
                                                                            background: 'transparent',
                                                                            border: 'none',
                                                                            color: i === currencyRates.length - 1 ? '#333' : '#60A5FA',
                                                                            cursor: i === currencyRates.length - 1 ? 'default' : 'pointer',
                                                                            fontSize: '12px',
                                                                            padding: '2px',
                                                                            lineHeight: 1
                                                                        }}
                                                                    >▼</button>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{ ...panelTdStyle, color: '#C8D4E8', fontWeight: 600 }}>
                                                            {canEdit ? (
                                                                <input type="text" style={{ ...editableInputStyle, width: '100%' }} value={r.name}
                                                                    onChange={(e) => handleCurrencyRateChange(i, 'name', e.target.value)}
                                                                    onFocus={(e) => e.target.style.borderColor = '#D4A731'}
                                                                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'} />
                                                            ) : (
                                                                r.name
                                                            )}
                                                        </td>
                                                        <td style={panelTdStyle}>
                                                            {canEdit ? (
                                                                <input type="text" style={{ ...editableInputStyle, color: '#4ADE80' }} value={r.buy}
                                                                    onChange={(e) => handleCurrencyRateChange(i, 'buy', e.target.value)}
                                                                    onFocus={(e) => e.target.style.borderColor = '#D4A731'}
                                                                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'} />
                                                            ) : (
                                                                <span style={{ color: '#4ADE80', fontWeight: 600 }}>{r.buy}</span>
                                                            )}
                                                        </td>
                                                        <td style={panelTdStyle}>
                                                            {canEdit ? (
                                                                <input type="text" style={{ ...editableInputStyle, color: '#F87171' }} value={r.sell}
                                                                    onChange={(e) => handleCurrencyRateChange(i, 'sell', e.target.value)}
                                                                    onFocus={(e) => e.target.style.borderColor = '#D4A731'}
                                                                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'} />
                                                            ) : (
                                                                <span style={{ color: '#F87171', fontWeight: 600 }}>{r.sell}</span>
                                                            )}
                                                        </td>
                                                        {canEdit && (
                                                            <>
                                                                <td style={{ ...panelTdStyle, textAlign: 'center' }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={r.isVisible !== false}
                                                                        onChange={() => handleToggleRateVisibility(i, 'currency')}
                                                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#D4A731' }}
                                                                    />
                                                                </td>
                                                                <td style={{ ...panelTdStyle, textAlign: 'center' }}>
                                                                    <button
                                                                        onClick={() => handleDeleteRate(i, 'currency')}
                                                                        style={{
                                                                            background: 'rgba(239, 68, 68, 0.1)',
                                                                            border: '1px solid rgba(239, 68, 68, 0.25)',
                                                                            color: '#F87171',
                                                                            width: '32px',
                                                                            height: '32px',
                                                                            borderRadius: '8px',
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            fontSize: '14px'
                                                                        }}
                                                                        title="Sil"
                                                                    >
                                                                        🗑
                                                                    </button>
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                ))
                                            ) : (
                                                // Ticker Rows
                                                localTickerItems.map((item, index) => (
                                                    <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                        <td style={{ padding: '8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                            {canEdit && (
                                                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                                    <button
                                                                        onClick={() => moveTickerItem(index, 'left')}
                                                                        disabled={index === 0}
                                                                        style={{
                                                                            background: 'transparent',
                                                                            border: 'none',
                                                                            color: index === 0 ? '#333' : '#60A5FA',
                                                                            cursor: index === 0 ? 'default' : 'pointer',
                                                                            fontSize: '16px',
                                                                            padding: '2px',
                                                                            lineHeight: 1
                                                                        }}
                                                                        title="Sola (Öne) Taşı"
                                                                    >◄</button>
                                                                    <button
                                                                        onClick={() => moveTickerItem(index, 'right')}
                                                                        disabled={index === localTickerItems.length - 1}
                                                                        style={{
                                                                            background: 'transparent',
                                                                            border: 'none',
                                                                            color: index === localTickerItems.length - 1 ? '#333' : '#60A5FA',
                                                                            cursor: index === localTickerItems.length - 1 ? 'default' : 'pointer',
                                                                            fontSize: '16px',
                                                                            padding: '2px',
                                                                            lineHeight: 1
                                                                        }}
                                                                        title="Sağa (Arkaya) Taşı"
                                                                    >►</button>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={panelTdStyle}>
                                                            {canEdit ? (
                                                                <input type="text" style={{ ...editableInputStyle, width: '100%', textAlign: 'left' }} value={item.name}
                                                                    onChange={(e) => handleTickerChange(index, 'name', e.target.value)}
                                                                    onFocus={(e) => e.target.style.borderColor = '#D4A731'}
                                                                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'} />
                                                            ) : (
                                                                <span style={{ color: '#C8D4E8', fontWeight: 600 }}>{item.name}</span>
                                                            )}
                                                        </td>
                                                        <td style={panelTdStyle}>
                                                            {canEdit ? (
                                                                <input type="text" style={{ ...editableInputStyle }} value={item.value}
                                                                    onChange={(e) => handleTickerChange(index, 'value', e.target.value)}
                                                                    onFocus={(e) => e.target.style.borderColor = '#D4A731'}
                                                                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'} />
                                                            ) : (
                                                                <span style={{ color: '#F5D56E', fontWeight: 600 }}>{item.value}</span>
                                                            )}
                                                        </td>
                                                        <td style={panelTdStyle}>
                                                            {canEdit ? (
                                                                <select
                                                                    value={item.isUp ? 'up' : 'down'}
                                                                    onChange={(e) => handleTickerChange(index, 'isUp', e.target.value === 'up')}
                                                                    style={{
                                                                        ...editableInputStyle,
                                                                        width: 'auto',
                                                                        padding: '6px 8px',
                                                                        color: item.isUp ? '#4ADE80' : '#F87171',
                                                                        fontWeight: 700,
                                                                        background: 'rgba(255, 255, 255, 0.04)',
                                                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                                                        borderRadius: '8px',
                                                                        appearance: 'none',
                                                                        cursor: 'pointer',
                                                                    }}
                                                                >
                                                                    <option value="up" style={{ background: '#0a0e1a' }}>Yukarı (▲)</option>
                                                                    <option value="down" style={{ background: '#0a0e1a' }}>Aşağı (▼)</option>
                                                                </select>
                                                            ) : (
                                                                <span style={{
                                                                    color: item.isUp ? '#4ADE80' : '#F87171',
                                                                    fontWeight: 600,
                                                                    fontSize: '13px'
                                                                }}>
                                                                    {item.change}
                                                                </span>
                                                            )}
                                                        </td>
                                                        {canEdit && (
                                                            <>
                                                                <td style={{ ...panelTdStyle, textAlign: 'center' }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={item.isVisible !== false}
                                                                        onChange={() => handleToggleTickerVisibility(index)}
                                                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#D4A731' }}
                                                                    />
                                                                </td>
                                                                <td style={{ ...panelTdStyle, textAlign: 'center' }}>
                                                                    <button
                                                                        onClick={() => handleDeleteTickerItem(index)}
                                                                        style={{
                                                                            background: 'rgba(239, 68, 68, 0.1)',
                                                                            border: '1px solid rgba(239, 68, 68, 0.25)',
                                                                            color: '#F87171',
                                                                            width: '32px',
                                                                            height: '32px',
                                                                            borderRadius: '8px',
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            fontSize: '14px'
                                                                        }}
                                                                        title="Sil"
                                                                    >
                                                                        🗑
                                                                    </button>
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        {canEdit && hasChanges && (
                            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                                <button onClick={handleSaveRates} style={{
                                    background: 'linear-gradient(135deg, #D4A731, #8B6914)',
                                    color: '#0a0e1a', padding: '14px 32px', borderRadius: '12px',
                                    border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                                    boxShadow: '0 4px 20px rgba(212, 167, 49, 0.3)',
                                    display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.3s',
                                }}
                                    onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
                                >
                                    💾 KURLARI GÜNCELLE
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* ═══════════════════════════ SETTINGS VIEW ═══════════════════════════ */}
                {activeView === 'settings' && (
                    <div>
                        <h2 style={{
                            fontFamily: "'Playfair Display', serif",
                            fontSize: '26px', fontWeight: 700, color: '#F5D56E',
                            marginBottom: '28px',
                        }}>⚙️ Genel Ayarlar</h2>

                        <div style={{
                            background: 'rgba(20, 28, 50, 0.8)',
                            border: '1px solid rgba(212, 167, 49, 0.1)',
                            borderRadius: '14px',
                            padding: '32px',
                        }}>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{
                                    display: 'block', color: '#8B97B8', fontSize: '13px',
                                    marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                }}>DÜKKAN İSMİ</label>
                                <input
                                    type="text"
                                    value={localShopName}
                                    onChange={(e) => setLocalShopName(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '14px 18px',
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '10px',
                                        color: '#C8D4E8',
                                        fontSize: '15px',
                                        fontWeight: 600,
                                        outline: 'none',
                                        transition: 'border-color 0.3s',
                                        boxSizing: 'border-box',
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#D4A731'}
                                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                                />
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{
                                    display: 'block', color: '#8B97B8', fontSize: '13px',
                                    marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                }}>Bilgilendirme</label>
                                <textarea
                                    value={localScrollingText}
                                    onChange={(e) => setLocalScrollingText(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '14px 18px',
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '10px',
                                        color: '#C8D4E8',
                                        fontSize: '14px',
                                        outline: 'none',
                                        minHeight: '100px',
                                        resize: 'vertical',
                                        fontFamily: "'DM Sans', sans-serif",
                                        transition: 'border-color 0.3s',
                                        boxSizing: 'border-box',
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#D4A731'}
                                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                                />
                            </div>



                            <button onClick={handleSaveSettings} style={{
                                background: 'linear-gradient(135deg, #D4A731, #8B6914)',
                                color: '#0a0e1a', padding: '14px 32px', borderRadius: '10px',
                                border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                                boxShadow: '0 4px 20px rgba(212, 167, 49, 0.3)',
                                display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.3s',
                            }}
                                onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
                                onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
                            >
                                💾 AYARLARI KAYDET
                            </button>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════ HISTORY VIEW ═══════════════════════════ */}
                {activeView === 'history' && (
                    <div>
                        <h2 style={{
                            fontFamily: "'Playfair Display', serif",
                            fontSize: '26px', fontWeight: 700, color: '#F5D56E',
                            marginBottom: '28px',
                        }}>📜 Geçmiş Listeleme</h2>

                        {historyLogs.length === 0 ? (
                            <div style={{
                                background: 'rgba(20, 28, 50, 0.8)',
                                border: '1px solid rgba(212, 167, 49, 0.1)',
                                borderRadius: '14px',
                                padding: '48px',
                                textAlign: 'center',
                                color: '#5A6480',
                            }}>
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                                <p style={{ fontSize: '16px', fontWeight: 600 }}>Henüz kayıtlı geçmiş yok</p>
                                <p style={{ fontSize: '13px' }}>Kur güncellemeleri yapıldıkça burada listelenecektir.</p>
                            </div>
                        ) : (
                            <div style={{
                                background: 'rgba(20, 28, 50, 0.8)',
                                border: '1px solid rgba(212, 167, 49, 0.1)',
                                borderRadius: '14px',
                                overflow: 'hidden'
                            }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                                                <th style={historyThStyle}>Tarih</th>
                                                <th style={historyThStyle}>Ürün</th>
                                                <th style={historyThStyle}>Tür</th>
                                                <th style={historyThStyle}>Eski Fiyat (Alış/Satış)</th>
                                                <th style={historyThStyle}>Yeni Fiyat (Alış/Satış)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {historyLogs.map(log => (
                                                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                    <td style={historyTdStyle}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                            <span style={{ color: '#F5D56E', fontWeight: 600 }}>{new Date(log.created_at).toLocaleDateString('tr-TR')}</span>
                                                            <span style={{ color: '#8B97B8', fontSize: '11px' }}>{new Date(log.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ ...historyTdStyle, fontWeight: 700, color: '#E2E8F0' }}>{log.item_name}</td>
                                                    <td style={{ ...historyTdStyle, color: log.item_type === 'gold' ? '#F5D56E' : log.item_type === 'currency' ? '#60A5FA' : '#A78BFA' }}>
                                                        {log.item_type === 'gold' ? '🥇 Altın' : log.item_type === 'currency' ? '💱 Döviz' : '📊 Alt Bant'}
                                                    </td>
                                                    <td style={historyTdStyle}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                            {log.item_type !== 'ticker' && <span style={{ color: '#9CA3AF' }}>A: <span style={{ textDecoration: 'line-through' }}>{log.old_buy || '-'}</span></span>}
                                                            {log.item_type !== 'ticker' && <span style={{ color: '#9CA3AF' }}>S: <span style={{ textDecoration: 'line-through' }}>{log.old_sell || '-'}</span></span>}
                                                            {log.item_type === 'ticker' && <span style={{ color: '#9CA3AF' }}>Değer: <span style={{ textDecoration: 'line-through' }}>{log.old_buy || '-'}</span></span>}
                                                        </div>
                                                    </td>
                                                    <td style={historyTdStyle}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                            {log.item_type !== 'ticker' && <span style={{ color: '#4ADE80' }}>A: {log.new_buy || '-'}</span>}
                                                            {log.item_type !== 'ticker' && <span style={{ color: '#F87171' }}>S: {log.new_sell || '-'}</span>}
                                                            {log.item_type === 'ticker' && <span style={{ color: '#4ADE80' }}>Değer: {log.new_buy || '-'}</span>}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ═══════════════════════════ KAR HESAPLAMA VIEW ═══════════════════════════ */}
                {activeView === 'kar_hesaplama' && (
                    <div style={{ padding: '0 10px' }}>
                        <KarHesaplama />
                    </div>
                )}

                {/* ═══════════════════════════ PRICE ALERTS VIEW ═══════════════════════════ */}
                {activeView === 'price_alerts' && (
                    <div style={{ padding: '0 10px' }}>
                        <PriceAlerts marketData={marketData} lastUpdate={lastMarketUpdate} error={marketError} />
                    </div>
                )}

                {/* Footer */}
                <div style={{
                    marginTop: '32px', textAlign: 'center', padding: '16px',
                    color: '#3A4060', fontSize: '12px', letterSpacing: '2px',
                    textTransform: 'uppercase',
                }}>
                    FİYATLAR BİLGİ AMAÇLIDIR • {userSettings.shopName}
                </div>
            </main>

            {/* Password Change Modal */}
            {
                showPasswordModal && (
                    <div
                        onClick={() => setShowPasswordModal(false)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(4px)',
                            zIndex: 9999,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <div
                            onClick={e => e.stopPropagation()}
                            style={{
                                background: '#141a2e',
                                border: '1px solid rgba(212, 167, 49, 0.25)',
                                borderRadius: '16px',
                                padding: '28px 32px',
                                width: '340px',
                                boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                <span style={{ fontSize: '20px' }}>🔑</span>
                                <h3 style={{ margin: 0, color: '#F5D56E', fontSize: '16px', fontWeight: 700 }}>Şifre Değiştir</h3>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <input
                                    type="password"
                                    placeholder="Eski Şifre"
                                    value={pwOld}
                                    onChange={e => { setPwOld(e.target.value); setPwError(null); }}
                                    style={{
                                        width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '14px',
                                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#C8D4E8', outline: 'none', boxSizing: 'border-box',
                                    }}
                                />
                                <input
                                    type="password"
                                    placeholder="Yeni Şifre"
                                    value={pwNew}
                                    onChange={e => { setPwNew(e.target.value); setPwError(null); }}
                                    style={{
                                        width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '14px',
                                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#C8D4E8', outline: 'none', boxSizing: 'border-box',
                                    }}
                                />
                                <input
                                    type="password"
                                    placeholder="Yeni Şifre (Tekrar)"
                                    value={pwConfirm}
                                    onChange={e => { setPwConfirm(e.target.value); setPwError(null); }}
                                    style={{
                                        width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '14px',
                                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#C8D4E8', outline: 'none', boxSizing: 'border-box',
                                    }}
                                />
                            </div>

                            {pwError && (
                                <div style={{ fontSize: '12px', color: '#F87171', marginTop: '10px' }}>{pwError}</div>
                            )}

                            <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
                                <button
                                    disabled={pwSaving}
                                    onClick={async () => {
                                        if (!currentUser) return;
                                        if (!pwOld) { setPwError('Eski şifre gerekli.'); return; }
                                        if (pwOld !== currentUser.password) { setPwError('Eski şifre yanlış.'); return; }
                                        if (!pwNew || pwNew.length < 3) { setPwError('Yeni şifre en az 3 karakter olmalı.'); return; }
                                        if (pwNew !== pwConfirm) { setPwError('Yeni şifreler eşleşmiyor.'); return; }
                                        if (pwNew === pwOld) { setPwError('Yeni şifre eski şifreyle aynı olamaz.'); return; }

                                        setPwSaving(true);
                                        const ok = await updateMemberPassword(currentUser.id, pwNew);
                                        setPwSaving(false);

                                        if (ok) {
                                            setShowPasswordModal(false);
                                            alert('Şifre başarıyla güncellendi!');
                                        } else {
                                            setPwError('Veritabanı hatası, tekrar deneyin.');
                                        }
                                    }}
                                    style={{
                                        flex: 1, padding: '10px',
                                        background: 'linear-gradient(135deg, #4ADE80, #16A34A)',
                                        border: 'none', borderRadius: '10px',
                                        color: '#000', fontWeight: 700, fontSize: '13px',
                                        cursor: pwSaving ? 'wait' : 'pointer',
                                        opacity: pwSaving ? 0.6 : 1,
                                    }}
                                >
                                    {pwSaving ? '...' : 'Kaydet'}
                                </button>
                                <button
                                    onClick={() => setShowPasswordModal(false)}
                                    style={{
                                        flex: 1, padding: '10px',
                                        background: 'rgba(90, 100, 128, 0.2)',
                                        border: '1px solid rgba(90, 100, 128, 0.3)',
                                        borderRadius: '10px',
                                        color: '#9CA3AF', fontWeight: 600, fontSize: '13px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    İptal
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Announcements Popup */}
            {showAnnouncementsPopup && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(5, 8, 15, 0.85)',
                    backdropFilter: 'blur(10px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px',
                    animation: 'fadeIn 0.2s ease'
                }}>
                    <div style={{
                        background: '#0B0F19',
                        border: '1px solid rgba(212, 167, 49, 0.2)',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '1200px',
                        height: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '16px 24px',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#0F172A'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '20px' }}>📢</span>
                                <h2 style={{ margin: 0, fontSize: '18px', color: '#D4A731', fontWeight: 700, letterSpacing: '1px' }}>
                                    DUYURU YÖNETİMİ
                                </h2>
                            </div>
                            <button
                                onClick={() => setShowAnnouncementsPopup(false)}
                                style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    color: '#ef4444',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                            >
                                ✕
                            </button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', background: '#080b13' }}>
                            <Announcements />
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};



const historyThStyle: React.CSSProperties = {
    textAlign: 'left', padding: '8px 12px', fontSize: '11px',
    fontWeight: 700, color: '#5A6480', textTransform: 'uppercase',
    letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.06)',
};

const historyTdStyle: React.CSSProperties = {
    padding: '10px 12px', fontSize: '13px', color: '#8B97B8',
};

export default UserPanel;
