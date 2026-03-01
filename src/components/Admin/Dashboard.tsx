import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useExchange } from '../../hooks/useExchange';
import type { TickerItem, HistoryLog } from '../../context/ExchangeContext';
import UserTracking from './UserTracking';
import KarHesaplama from './KarHesaplama';
import Announcements from './Announcements';
import PriceAlerts from './PriceAlerts';
import NotificationBell from '../Shared/NotificationBell';
import { Zap } from 'lucide-react';
import './Members.css';
import './History.css';

const Dashboard: React.FC = () => {
    const context = useExchange();
    const { settings, updateSettings, rates, updateRates, tickerItems, updateTickerItems, members, updateMembers, updateMemberPassword, historyLogs, clearHistory, logoutUser, currentUser } = context;

    const [localShopName, setLocalShopName] = useState(settings.shopName);
    const [localTicker, setLocalTicker] = useState(settings.scrollingText);
    const [localRates, setLocalRates] = useState(rates);
    const [localTickerItems, setLocalTickerItems] = useState(tickerItems);
    const [localMembers, setLocalMembers] = useState(members);
    const [activeTab, setActiveTab] = useState<'home' | 'rates' | 'members' | 'history' | 'user_tracking' | 'kar_hesaplama' | 'announcements' | 'price_alerts'>('home');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [tableWidth, setTableWidth] = useState<number | null>(null);
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const startResize = useCallback((e: React.MouseEvent, side: 'left' | 'right') => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = tableContainerRef.current?.offsetWidth ?? 800;

        const onMouseMove = (mv: MouseEvent) => {
            if (side === 'right') {
                const newWidth = Math.max(400, startWidth + (mv.clientX - startX));
                setTableWidth(newWidth);
            } else {
                const delta = startX - mv.clientX;
                const newWidth = Math.max(400, startWidth + delta);
                setTableWidth(newWidth);
            }
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, []);
    const [bulkPercentage, setBulkPercentage] = useState<string>('0');
    const [percentAnim, setPercentAnim] = useState(false);
    const [updateOverlayAnim, setUpdateOverlayAnim] = useState(false);

    const animatePercent = () => {
        setPercentAnim(true);
        setTimeout(() => setPercentAnim(false), 150);
    };

    const handlePercentIncrease = () => {
        setBulkPercentage(prev => {
            let val = parseInt(prev || '0');
            if (val < 100) { val++; animatePercent(); }
            return val.toString();
        });
    };

    const handlePercentDecrease = () => {
        setBulkPercentage(prev => {
            let val = parseInt(prev || '0');
            if (val > -100) { val--; animatePercent(); }
            return val.toString();
        });
    };

    const handlePercentReset = () => {
        setBulkPercentage('0');
        animatePercent();
    };

    const [bulkBuyAmount, setBulkBuyAmount] = useState<number>(0);
    const [bulkSellAmount, setBulkSellAmount] = useState<number>(0);
    const [buyAnim, setBuyAnim] = useState(false);
    const [sellAnim, setSellAnim] = useState(false);
    const [buyOverlayAnim, setBuyOverlayAnim] = useState(false);
    const [sellOverlayAnim, setSellOverlayAnim] = useState(false);

    const animateBuy = () => { setBuyAnim(true); setTimeout(() => setBuyAnim(false), 150); };
    const animateSell = () => { setSellAnim(true); setTimeout(() => setSellAnim(false), 150); };
    const [showRoleManager, setShowRoleManager] = useState(false);

    // Member Edit Modal State
    const [editMemberId, setEditMemberId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editUsername, setEditUsername] = useState('');
    const [editPwNew, setEditPwNew] = useState('');
    const [editPwConfirm, setEditPwConfirm] = useState('');
    const [editPwError, setEditPwError] = useState<string | null>(null);
    const [editPwSaving, setEditPwSaving] = useState(false);

    // Add Member Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [addName, setAddName] = useState('');
    const [addUsername, setAddUsername] = useState('');
    const [addPassword, setAddPassword] = useState('');
    const [addRole, setAddRole] = useState('Üye');
    const [addError, setAddError] = useState<string | null>(null);
    const [addSaving, setAddSaving] = useState(false);

    // Password Visibility State
    const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

    const togglePasswordVisibility = (id: string) => {
        setVisiblePasswords(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const [localFontSize, setLocalFontSize] = useState(settings.displayFontSize || 100);

    const [error, setError] = useState<string | null>(null);

    const [lastHomeUpdate, setLastHomeUpdate] = useState<Date | null>(null);

    // Live Market Data State
    const [marketData, setMarketData] = useState<any>({});

    // Save Popup State
    const [showSavePopup, setShowSavePopup] = useState(false);
    const [savePopupSummary, setSavePopupSummary] = useState('');

    // Member Filters
    const [memberSearch, setMemberSearch] = useState('');
    const [memberRoleFilter, setMemberRoleFilter] = useState('');

    // History Filters & State
    const [historySearch, setHistorySearch] = useState('');
    const [historyTypeFilter, setHistoryTypeFilter] = useState('');
    const [historySourceFilter, setHistorySourceFilter] = useState('');
    const [historyDateFilter, setHistoryDateFilter] = useState('');
    const [historyPage, setHistoryPage] = useState(0);
    const [openHistoryGroups, setOpenHistoryGroups] = useState<string[]>([]);

    const parsePrice = (priceStr: string | number) => {
        if (typeof priceStr === 'number') return priceStr;
        let str = priceStr.toString().trim();
        if (str === '' || str === '-') return 0;

        // Handle Turkish format: 1.234,56 -> 1234.56
        // If it contains both dot and comma, it's definitely Turkish grouping
        if (str.includes('.') && str.includes(',')) {
            str = str.replace(/\./g, '').replace(',', '.');
        }
        // If it contains only comma, it's likely the decimal separator
        else if (str.includes(',')) {
            // Check if it's like "1,000" (thousands) vs "1,00" (decimal)
            // In Turkish "1.000,00" -> comma is decimal.
            // If there's only one comma and it's 2 digits from end, it's decimal.
            str = str.replace(',', '.');
        }

        const parsed = parseFloat(str);
        return isNaN(parsed) ? 0 : parsed;
    };


    // Fetch Backend Data
    const fetchMarketData = useCallback(async () => {
        if (activeTab !== 'home' && activeTab !== 'price_alerts') return;

        try {
            setError(null);
            // Promise.all to fetch all data
            // We verify response.ok to ensure 200 OK
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

            // Check if we got ANY data. If all null, likely backend down.
            if (!currency && !gold && !silver) {
                setError('Backend sunucusuna bağlanılamadı. Lütfen start_app.bat dosyasını çalıştırdığınızdan emin olun.');
                return;
            }

            setMarketData({
                currency: currency?.rates || {},
                gold: gold || {},
                silver: silver || {}
            });
            setLastHomeUpdate(new Date());

        } catch (error) {
            console.error('Market API Error:', error);
            setError('Veri çekme hatası oluştu.');
        }
    }, [activeTab]);

    useEffect(() => {
        fetchMarketData();
        const interval = setInterval(fetchMarketData, 30000);
        return () => clearInterval(interval);
    }, [fetchMarketData]);

    // Sync local members with context
    useEffect(() => {
        setLocalMembers(members);
    }, [members]);

    // Sync local settings with context (when fetched from Supabase)
    useEffect(() => {
        setLocalShopName(settings.shopName);
        setLocalTicker(settings.scrollingText);
        setLocalFontSize(settings.displayFontSize || 100);
    }, [settings]);

    // Sync local rates with context
    useEffect(() => {
        setLocalRates(rates);
    }, [rates]);

    // Sync local ticker items with context
    useEffect(() => {
        setLocalTickerItems(tickerItems);
    }, [tickerItems]);


    // Grouping and Filtering for History
    const filteredAndGroupedHistory = useMemo(() => {
        let filtered = historyLogs;

        // Apply filters
        if (historySearch) {
            const searchLower = historySearch.toLowerCase();
            filtered = filtered.filter(log =>
                log.item_name.toLowerCase().includes(searchLower) ||
                (log.user_name && log.user_name.toLowerCase().includes(searchLower))
            );
        }
        if (historyTypeFilter) {
            filtered = filtered.filter(log => log.item_group === historyTypeFilter);
        }
        if (historySourceFilter) {
            filtered = filtered.filter(log => log.source === historySourceFilter);
        }
        if (historyDateFilter) {
            filtered = filtered.filter(log => log.created_at.startsWith(historyDateFilter));
        }

        // Group by batch_id or timestamp
        const groups: { [key: string]: HistoryLog[] } = {};
        filtered.forEach(log => {
            // Grouping key: batch_id if exists, otherwise exact second of created_at
            const key = log.batch_id || log.created_at.substring(0, 19);
            if (!groups[key]) groups[key] = [];
            groups[key].push(log);
        });

        // Convert to array and sort by date descending
        return Object.values(groups).sort((a, b) =>
            new Date(b[0].created_at).getTime() - new Date(a[0].created_at).getTime()
        );
    }, [historyLogs, historySearch, historyTypeFilter, historySourceFilter, historyDateFilter]);

    const renderHome = () => {
        return <PriceAlerts marketData={marketData} lastUpdate={lastHomeUpdate} error={error} />;
    };



    const handleBuySave = () => {
        const amount = bulkBuyAmount;
        const newRates = localRates.map(rate => ({
            ...rate,
            buy: (parsePrice(rate.buy) + amount).toFixed(2)
        }));
        setLocalRates(newRates);
        setBulkBuyAmount(0);
        setBuyOverlayAnim(true);
        setTimeout(() => setBuyOverlayAnim(false), 1500);
    };

    const handleSellSave = () => {
        const amount = bulkSellAmount;
        const newRates = localRates.map(rate => ({
            ...rate,
            sell: (parsePrice(rate.sell) + amount).toFixed(2)
        }));
        setLocalRates(newRates);
        setBulkSellAmount(0);
        setSellOverlayAnim(true);
        setTimeout(() => setSellOverlayAnim(false), 1500);
    };

    const handleBulkUpdate = () => {
        const percentVal = parseFloat(bulkPercentage);
        if (isNaN(percentVal) || percentVal === 0) {
            alert('Lütfen 0\'dan farklı bir yüzde giriniz.');
            return;
        }

        const operation = percentVal > 0 ? 'increase' : 'decrease';
        const percent = Math.abs(percentVal);

        if (!window.confirm(`Tüm fiyatları %${percent} oranında ${operation === 'increase' ? 'artırmak' : 'azaltmak'} istediğinize emin misiniz?`)) {
            return;
        }

        const newRates = localRates.map(rate => {
            const formatPrice = (priceNum: number) => {
                return priceNum.toFixed(2); // Keep 2 decimal places standard
            };

            const currentBuy = parsePrice(rate.buy);
            const currentSell = parsePrice(rate.sell);

            let newBuy = currentBuy;
            let newSell = currentSell;

            const factor = percent / 100;

            if (operation === 'increase') {
                newBuy += currentBuy * factor;
                newSell += currentSell * factor;
            } else {
                newBuy -= currentBuy * factor;
                newSell -= currentSell * factor;
            }

            return {
                ...rate,
                buy: formatPrice(newBuy),
                sell: formatPrice(newSell)
            };
        });

        setLocalRates(newRates);
        setUpdateOverlayAnim(true);
        setTimeout(() => setUpdateOverlayAnim(false), 1500);
    };

    const handleSaveSettings = () => {
        updateSettings({
            ...settings,
            shopName: localShopName,
            scrollingText: localTicker
        });

        // Also update local storage for the current logged-in user (Admin)
        // so their specific view updates immediately to match these changes.
        if (currentUser?.name) {
            const userKey = `userPanelSettings_${currentUser.name}`;
            const userSettings = {
                shopName: localShopName,
                scrollingText: localTicker
            };
            localStorage.setItem(userKey, JSON.stringify(userSettings));
        }

        // Calculate changes before saving
        const calculatedRates = localRates.map(newRate => {
            const oldRate = rates.find(r => r.id === newRate.id);
            let change = '0.00';

            if (oldRate) {
                const oldSell = parsePrice(oldRate.sell);
                const newSell = parsePrice(newRate.sell);

                if (oldSell !== newSell && oldSell !== 0) {
                    const diff = ((newSell - oldSell) / oldSell) * 100;
                    change = diff.toFixed(2);
                } else {
                    // If price hasn't changed, preserve the existing change value
                    change = oldRate.change || '0.00';
                }
            }
            // Preserve existing change if no old rate found (e.g. just added but saved twice)
            else if (newRate.change) {
                change = newRate.change;
            }

            return { ...newRate, change };
        });

        // Update local state to reflect new changes immediately
        setLocalRates(calculatedRates);

        updateRates(calculatedRates);
        updateTickerItems(localTickerItems);
        updateMembers(localMembers);
        // addHistorySnapshot() not needed as context logs directly

        // Populate summary and show popup
        setSavePopupSummary(
            `<div style="display:flex;justify-content:space-between">
                <span>📅 Tarih / Saat</span>
                <strong style="color:#e2e8f0">${new Date().toLocaleString('tr-TR')}</strong>
             </div>`
        );
        setShowSavePopup(true);
    };



    const handleRateChange = (index: number, field: 'buy' | 'sell' | 'name', value: string) => {
        const newRates = [...localRates];
        newRates[index] = { ...newRates[index], [field]: value };
        setLocalRates(newRates);
    };

    // --- Item Reordering Logic ---
    const moveRate = (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === localRates.length - 1)) return;

        const newRates = [...localRates];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        // Swap
        [newRates[index], newRates[targetIndex]] = [newRates[targetIndex], newRates[index]];

        setLocalRates(newRates);
    };

    const moveTicker = (index: number, direction: 'left' | 'right') => {
        if ((direction === 'left' && index === 0) || (direction === 'right' && index === localTickerItems.length - 1)) return;

        const newItems = [...localTickerItems];
        const targetIndex = direction === 'left' ? index - 1 : index + 1;

        // Swap
        [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];

        setLocalTickerItems(newItems);
    };

    const handleTickerChange = (index: number, field: string, value: string | boolean) => {
        const newItems = [...localTickerItems];
        const updatedItem = { ...newItems[index], [field]: value };

        // Auto-calculate direction and percentage if value changes
        if (field === 'value') {
            const newVal = parseFloat(value as string);
            // Use existing value from DB if available, otherwise use 0 (for new items)
            const baseItem = tickerItems[index];
            const baseVal = baseItem ? parseFloat(baseItem.value) : 0;

            if (!isNaN(newVal) && !isNaN(baseVal) && baseVal !== 0) {
                const diff = newVal - baseVal;
                const percent = (diff / baseVal) * 100;
                updatedItem.isUp = diff >= 0;
                updatedItem.change = (diff >= 0 ? '+' : '') + percent.toFixed(2) + '%';
            } else if (!baseItem) {
                // New item, no base value to compare
                updatedItem.change = '0.00%';
                updatedItem.isUp = true;
            }
        }

        newItems[index] = updatedItem;
        setLocalTickerItems(newItems);
    };



    const handleAddRate = () => {
        const newRate: any = {
            id: Math.floor(Math.random() * 2000000000), // Temporary ID until saved to DB
            name: 'Yeni Ürün',
            buy: '0',
            sell: '0',
            type: 'gold', // Default type
            change: '0.00',
            isVisible: true
        };
        setLocalRates([...localRates, newRate]);
    };

    const handleDeleteRate = (index: number) => {
        if (window.confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
            const newRates = localRates.filter((_, i) => i !== index);
            setLocalRates(newRates);
        }
    };

    const handleToggleRateVisibility = (index: number) => {
        const newRates = [...localRates];
        newRates[index] = { ...newRates[index], isVisible: !newRates[index].isVisible };
        setLocalRates(newRates);
    };

    // Ticker Management Handlers
    const handleAddTickerItem = () => {
        const newItem: TickerItem = {
            name: '',
            value: '0',
            change: '0.00%',
            isUp: true,
            isVisible: true
        };
        setLocalTickerItems([...localTickerItems, newItem]);
    };

    const handleDeleteTickerItem = (index: number) => {
        const newItems = localTickerItems.filter((_, i) => i !== index);
        setLocalTickerItems(newItems);
    };

    const handleToggleTickerItemVisibility = (index: number) => {
        const newItems = [...localTickerItems];
        newItems[index] = { ...newItems[index], isVisible: !newItems[index].isVisible };
        setLocalTickerItems(newItems);
    };


    /* 
    // MÜŞTERİ TALEBİ ÜZERİNE DÜZENLEME KAPATILDI (PINNED)
    const handleMemberChange = (index: number, field: keyof Member, value: string) => {
        const newMembers = [...localMembers];
        newMembers[index] = { ...newMembers[index], [field]: value };
        setLocalMembers(newMembers);
    };

    const handleAddMember = () => {
        const newMember: Member = {
            id: Date.now(),
            name: '',
            username: '',
            password: '',
            role: 'Üye',
            status: 'Aktif'
        };
        setLocalMembers([...localMembers, newMember]);
    };

    const handleDeleteMember = (index: number) => {
        if (localMembers[index].role === 'Admin') {
            alert('Admin kullanıcısı silinemez!');
            return;
        }
        if (window.confirm('Bu üyeyi silmek istediğinize emin misiniz?')) {
            const newMembers = localMembers.filter((_, i) => i !== index);
            setLocalMembers(newMembers);
        }
    };
    */

    const handleMemberChange = (index: number, field: string, value: string) => {
        // Prevent editing Admin User (username: admin)
        if (localMembers[index].username === 'admin' || localMembers[index].role === 'Admin') {
            // Optional: Allow changing password maybe? For now lock everything as requested
            return;
        }

        const newMembers = [...localMembers];
        newMembers[index] = { ...newMembers[index], [field]: value };
        setLocalMembers(newMembers);
    };

    const handleAddMember = () => {
        setAddName('');
        setAddUsername('');
        setAddPassword('');
        setAddRole('Üye');
        setAddError(null);
        setShowAddModal(true);
    };

    const handleDeleteMember = (index: number) => {
        if (localMembers[index].role === 'Admin' || localMembers[index].username === 'admin') {
            alert('Admin kullanıcısı silinemez!');
            return;
        }
        if (window.confirm('Bu üyeyi silmek istediğinize emin misiniz?')) {
            const newMembers = localMembers.filter((_, i) => i !== index);
            setLocalMembers(newMembers);
        }
    };

    const handleLogout = () => {
        logoutUser();
        window.location.href = '/login';
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'Admin': return { bg: 'rgba(239, 68, 68, 0.15)', text: '#F87171', border: 'rgba(239, 68, 68, 0.3)' };
            case 'Yönetici': return { bg: 'rgba(96, 165, 250, 0.15)', text: '#60A5FA', border: 'rgba(96, 165, 250, 0.3)' };
            default: return { bg: 'rgba(156, 163, 175, 0.15)', text: '#9CA3AF', border: 'rgba(156, 163, 175, 0.3)' };
        }
    };

    const getInitials = (name: string) => {
        if (!name.trim()) return '?';
        const parts = name.trim().split(' ');
        return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name[0].toUpperCase();
    };

    const renderMemberManagement = () => {
        const activeCount = localMembers.filter(m => m.status === 'Aktif').length;
        const adminCount = localMembers.filter(m => m.role === 'Admin').length;
        const managerCount = localMembers.filter(m => m.role === 'Yönetici').length;

        // Common disabled style
        const disabledStyle = {
            opacity: 0.5,
            cursor: 'not-allowed',
        };

        const AVATAR_COLORS = ['#D4AF37', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444'];
        const getAvatarColor = (name: string) => {
            let h = 0;
            for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
            return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
        };

        return (
            <div className="members-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="page-header" style={{ marginBottom: 0, justifyContent: 'flex-end' }}>
                    <div className="header-actions">
                        <button className="btn btn-purple" onClick={() => setShowRoleManager(true)}>
                            <span style={{ fontSize: '16px' }}>🛡</span> Tüm Rolleri Yönet
                        </button>
                        <button className="btn btn-gold" onClick={handleAddMember}>
                            <span style={{ fontSize: '16px' }}>＋</span> Yeni Kullanıcı Ekle
                        </button>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-top">
                            <div className="stat-icon-wrap" style={{ background: 'rgba(212,175,55,0.1)' }}>👥</div>
                            <span className="stat-trend trend-up">Toplam</span>
                        </div>
                        <div className="stat-value" style={{ color: 'var(--gold)' }}>{localMembers.length}</div>
                        <div className="stat-label">Toplam Üye</div>
                        <div className="stat-bar"><div className="stat-bar-fill" style={{ width: '100%', background: 'linear-gradient(90deg,#8a7020,#D4AF37)' }}></div></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-top">
                            <div className="stat-icon-wrap" style={{ background: 'rgba(16,185,129,0.1)' }}>✅</div>
                            <span className="stat-trend trend-up">Aktif</span>
                        </div>
                        <div className="stat-value" style={{ color: 'var(--green)' }}>{activeCount}</div>
                        <div className="stat-label">Aktif Üye</div>
                        <div className="stat-bar"><div className="stat-bar-fill" style={{ width: '100%', background: 'linear-gradient(90deg,#059669,#10b981)' }}></div></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-top">
                            <div className="stat-icon-wrap" style={{ background: 'rgba(239,68,68,0.1)' }}>🛡</div>
                            <span className="stat-trend trend-neutral">Rol</span>
                        </div>
                        <div className="stat-value" style={{ color: 'var(--red)' }}>{adminCount}</div>
                        <div className="stat-label">Admin</div>
                        <div className="stat-bar"><div className="stat-bar-fill" style={{ width: '25%', background: 'linear-gradient(90deg,#991b1b,#ef4444)' }}></div></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-top">
                            <div className="stat-icon-wrap" style={{ background: 'rgba(245,158,11,0.1)' }}>⚙️</div>
                            <span className="stat-trend trend-neutral">Rol</span>
                        </div>
                        <div className="stat-value" style={{ color: 'var(--amber)' }}>{managerCount}</div>
                        <div className="stat-label">Yönetici</div>
                        <div className="stat-bar"><div className="stat-bar-fill" style={{ width: '50%', background: 'linear-gradient(90deg,#92400e,#f59e0b)' }}></div></div>
                    </div>
                </div>

                {/* Member Cards */}
                <div className="content-card">
                    {/* Toolbar */}
                    <div className="content-toolbar">
                        <div className="toolbar-left">
                            <div className="toolbar-title">Kullanıcı Listesi</div>
                            <div className="toolbar-sub">{localMembers.length} kayıt · {activeCount} aktif</div>
                        </div>
                        <div className="toolbar-right">
                            <div className="search-wrap">
                                <span className="search-icon">🔍</span>
                                <input
                                    className="search-input"
                                    type="text"
                                    placeholder="İsim veya kullanıcı adı ara..."
                                    value={memberSearch}
                                    onChange={(e) => setMemberSearch(e.target.value)}
                                />
                            </div>
                            <select
                                className="filter-select"
                                value={memberRoleFilter}
                                onChange={(e) => setMemberRoleFilter(e.target.value)}
                            >
                                <option value="">Tüm Roller</option>
                                <option value="Admin">Admin</option>
                                <option value="Yönetici">Yönetici</option>
                                <option value="Üye">Üye</option>
                            </select>
                        </div>
                    </div>

                    {/* Table Header */}
                    <div className="table-head">
                        <div className="th">ÜYE BİLGİSİ</div>
                        <div className="th">KULLANICI ADI</div>
                        <div className="th">ŞİFRE</div>
                        <div className="th">YETKİ / ROL</div>
                        <div className="th tc">DURUM</div>
                        <div className="th tc">İŞLEM</div>
                    </div>

                    {/* Member Rows */}
                    <div>
                        {localMembers.filter(member => {
                            const matchesSearch = member.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
                                member.username.toLowerCase().includes(memberSearch.toLowerCase());
                            const matchesRole = memberRoleFilter === '' || member.role === memberRoleFilter;
                            return matchesSearch && matchesRole;
                        }).map((member) => {
                            // Find the true global index in localMembers so edits/deletions apply to the right item
                            const globalIndex = localMembers.findIndex(m => m.id === member.id);
                            const initials = getInitials(member.name);
                            const isPinned = member.role === 'Admin' || member.username === 'admin';
                            const rowStyle = isPinned ? disabledStyle : {};

                            let roleClass = 'rol-Üye';
                            if (member.role === 'Admin') roleClass = 'rol-Admin';
                            if (member.role === 'Yönetici') roleClass = 'rol-Yönetici';

                            return (
                                <div key={member.id} className={`member-row row-${member.role}`} style={{ animationDelay: `${globalIndex * 0.06}s` }}>

                                    {/* Name with Avatar */}
                                    <div className="td">
                                        <div className="member-info" style={rowStyle}>
                                            <div className="member-avatar" style={{ background: getAvatarColor(member.name) }}>
                                                {initials}
                                            </div>
                                            <div style={{ width: '100%' }}>
                                                <div className="member-name-input" style={{ padding: '2px 0' }}>
                                                    {member.name}
                                                </div>
                                                <div className="member-email">{member.username}@afsar.local</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Username */}
                                    <div className="td">
                                        <div className="username-cell" style={rowStyle}>
                                            <span className="username-at">@</span>
                                            <div className="username-input" style={{ padding: '2px 0' }}>
                                                {member.username}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Password */}
                                    <div className="td">
                                        <div className="password-cell" style={{ ...rowStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {visiblePasswords.has(member.id) ? (
                                                <span className="password-text" style={{ fontSize: '13px', color: '#e2e8f0', letterSpacing: '1px' }}>{member.password}</span>
                                            ) : (
                                                <span className="password-dots">••••••</span>
                                            )}
                                            <button
                                                onClick={() => togglePasswordVisibility(member.id)}
                                                disabled={isPinned}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#8B97B8',
                                                    cursor: isPinned ? 'not-allowed' : 'pointer',
                                                    padding: '2px 4px',
                                                    fontSize: '14px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    opacity: isPinned ? 0.3 : 0.7,
                                                    transition: 'opacity 0.2s',
                                                }}
                                                onMouseEnter={(e) => { if (!isPinned) e.currentTarget.style.opacity = '1' }}
                                                onMouseLeave={(e) => { if (!isPinned) e.currentTarget.style.opacity = '0.7' }}
                                                title={isPinned ? "Admin şifresi görüntülenemez" : (visiblePasswords.has(member.id) ? "Gizle" : "Göster")}
                                            >
                                                {visiblePasswords.has(member.id) ? '🙈' : '👁️'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Role Badge */}
                                    <div className="td">
                                        <div className="rol-select-wrap">
                                            <select
                                                className={`rol-select ${roleClass}`}
                                                disabled={isPinned}
                                                value={member.role}
                                                onChange={(e) => handleMemberChange(globalIndex, 'role', e.target.value)}
                                            >
                                                {member.role === 'Admin' && <option value="Admin">🛡️ Admin</option>}
                                                <option value="Yönetici">⚙️ Yönetici</option>
                                                <option value="Üye">👤 Üye</option>
                                            </select>
                                            {!isPinned && <span className="rol-chevron">▾</span>}
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <div className="td tc">
                                        <div className="durum-wrap" style={{ justifyContent: 'center' }}>
                                            <div
                                                className={`toggle-track ${member.status === 'Aktif' ? 'on' : 'off'}`}
                                                onClick={() => {
                                                    if (!isPinned) {
                                                        const newVal = member.status === 'Aktif' ? 'Pasif' : 'Aktif';
                                                        handleMemberChange(globalIndex, 'status', newVal);
                                                    }
                                                }}
                                                style={isPinned ? { cursor: 'not-allowed', opacity: 0.5 } : {}}
                                            >
                                                <div className="toggle-thumb"></div>
                                            </div>
                                            <span className={`durum-text ${member.status === 'Aktif' ? 'on' : 'off'}`}>
                                                {member.status === 'Aktif' ? 'Aktif' : 'Pasif'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Delete/Action */}
                                    <div className="td tc">
                                        <div className="action-group">
                                            <button
                                                className="action-btn action-edit"
                                                title="Düzenle"
                                                disabled={isPinned}
                                                onClick={() => {
                                                    setEditMemberId(member.id);
                                                    setEditName(member.name);
                                                    setEditUsername(member.username);
                                                    setEditPwNew('');
                                                    setEditPwConfirm('');
                                                    setEditPwError(null);
                                                }}
                                            >
                                                ✎
                                            </button>
                                            <button
                                                className="action-btn action-delete"
                                                title="Sil"
                                                disabled={isPinned}
                                                onClick={() => handleDeleteMember(globalIndex)}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="table-footer">
                        <div className="footer-info">
                            <strong>{localMembers.length}</strong> üye kaydı · <strong>{activeCount}</strong> aktif
                        </div>
                        <button className="save-btn" onClick={handleSaveSettings}>
                            💾 Değişiklikleri Kaydet
                        </button>
                    </div>
                </div>

                {/* Member Edit Modal */}
                {editMemberId && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        backdropFilter: 'blur(4px)',
                    }}>
                        <div style={{
                            background: '#141C32',
                            borderRadius: '16px',
                            border: '1px solid rgba(212, 175, 55, 0.3)',
                            padding: '30px',
                            maxWidth: '400px',
                            width: '90%',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h3 style={{ color: '#F5D56E', fontSize: '20px', margin: 0, fontWeight: 700 }}>✎ Üye Düzenle</h3>
                                <button
                                    onClick={() => setEditMemberId(null)}
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        color: '#F87171',
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        fontSize: '18px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >✕</button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Ad Soyad</label>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Kullanıcı Adı</label>
                                    <input
                                        type="text"
                                        value={editUsername}
                                        onChange={e => setEditUsername(e.target.value)}
                                        style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                                    />
                                </div>

                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '8px 0' }}></div>
                                <div style={{ fontSize: '13px', color: '#94a3b8' }}>Şifre Güncelle (Değiştirmek istemiyorsanız boş bırakın)</div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Yeni Şifre</label>
                                    <input
                                        type="password"
                                        value={editPwNew}
                                        onChange={e => { setEditPwNew(e.target.value); setEditPwError(null); }}
                                        style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Yeni Şifre (Tekrar)</label>
                                    <input
                                        type="password"
                                        value={editPwConfirm}
                                        onChange={e => { setEditPwConfirm(e.target.value); setEditPwError(null); }}
                                        style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                                        placeholder="••••••••"
                                    />
                                </div>
                                {editPwError && <div style={{ color: '#F87171', fontSize: '12px' }}>{editPwError}</div>}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                                <button
                                    onClick={() => setEditMemberId(null)}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: '#8B97B8',
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        fontSize: '13px',
                                    }}
                                >İptal</button>
                                <button
                                    disabled={editPwSaving}
                                    onClick={async () => {
                                        // validate password if attempting to change
                                        if (editPwNew) {
                                            if (editPwNew.length < 3) { setEditPwError('Yeni şifre en az 3 karakter olmalı.'); return; }
                                            if (editPwNew !== editPwConfirm) { setEditPwError('Şifreler eşleşmiyor.'); return; }
                                        }

                                        setEditPwSaving(true);

                                        // Update local members index
                                        const index = localMembers.findIndex(m => m.id === editMemberId);
                                        if (index > -1) {
                                            const newMembers = [...localMembers];
                                            newMembers[index] = {
                                                ...newMembers[index],
                                                name: editName,
                                                username: editUsername
                                            };
                                            setLocalMembers(newMembers);
                                        }

                                        if (editPwNew) {
                                            const ok = await updateMemberPassword(editMemberId, editPwNew);
                                            if (!ok) {
                                                setEditPwError('Şifre güncellenirken hata oluştu.');
                                                setEditPwSaving(false);
                                                return;
                                            }
                                        }

                                        setEditPwSaving(false);
                                        setEditMemberId(null);
                                    }}
                                    style={{
                                        ...saveButtonStyle,
                                        marginTop: 0,
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        opacity: editPwSaving ? 0.6 : 1,
                                    }}
                                >💾 {editPwSaving ? 'Kaydediliyor...' : 'Kaydet'}</button>
                            </div>
                        </div>
                    </div>
                )}


                {/* Add Member Modal */}
                {showAddModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        backdropFilter: 'blur(4px)',
                    }}>
                        <div style={{
                            background: '#141C32',
                            borderRadius: '16px',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            padding: '30px',
                            maxWidth: '400px',
                            width: '90%',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h3 style={{ color: '#F5D56E', fontSize: '20px', margin: 0, fontWeight: 700 }}>➕ Yeni Üye Ekle</h3>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        color: '#F87171',
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        fontSize: '18px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >✕</button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Ad Soyad</label>
                                    <input
                                        type="text"
                                        value={addName}
                                        onChange={e => { setAddName(e.target.value); setAddError(null); }}
                                        style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                                        placeholder="Kullanıcının tam adı"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Kullanıcı Adı</label>
                                    <input
                                        type="text"
                                        value={addUsername}
                                        onChange={e => { setAddUsername(e.target.value); setAddError(null); }}
                                        style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                                        placeholder="Örn: ahmet"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Şifre</label>
                                    <input
                                        type="password"
                                        value={addPassword}
                                        onChange={e => { setAddPassword(e.target.value); setAddError(null); }}
                                        style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Rol</label>
                                    <select
                                        value={addRole}
                                        onChange={e => setAddRole(e.target.value)}
                                        style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                                    >
                                        <option value="Yönetici">⚙️ Yönetici</option>
                                        <option value="Üye">👤 Üye</option>
                                    </select>
                                </div>
                                {addError && <div style={{ color: '#F87171', fontSize: '12px' }}>{addError}</div>}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: '#8B97B8',
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        fontSize: '13px',
                                    }}
                                >İptal</button>
                                <button
                                    disabled={addSaving}
                                    onClick={() => {
                                        if (!addName.trim() || !addUsername.trim() || !addPassword.trim()) {
                                            setAddError('Tüm alanları doldurun.');
                                            return;
                                        }
                                        if (addPassword.length < 3) {
                                            setAddError('Şifre en az 3 karakter olmalı.');
                                            return;
                                        }

                                        setAddSaving(true);
                                        const newMember: any = {
                                            id: crypto.randomUUID(),
                                            name: addName.trim(),
                                            username: addUsername.trim(),
                                            password: addPassword,
                                            role: addRole,
                                            status: 'Aktif'
                                        };

                                        // Update local members array
                                        setLocalMembers([...localMembers, newMember]);

                                        // Reset and close
                                        setAddSaving(false);
                                        setShowAddModal(false);
                                    }}
                                    style={{
                                        ...saveButtonStyle,
                                        marginTop: 0,
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        opacity: addSaving ? 0.6 : 1,
                                    }}
                                >➕ Ekle</button>
                            </div>
                        </div>
                    </div>
                )}


                {/* Role Management Modal */}
                {showRoleManager && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        backdropFilter: 'blur(4px)',
                    }}>
                        <div style={{
                            background: '#141C32',
                            borderRadius: '16px',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            padding: '30px',
                            maxWidth: '700px',
                            width: '90%',
                            maxHeight: '80vh',
                            overflowY: 'auto',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h3 style={{ color: '#F5D56E', fontSize: '20px', margin: 0, fontWeight: 700 }}>⚙️ Rol Yönetimi</h3>
                                <button
                                    onClick={() => setShowRoleManager(false)}
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        color: '#F87171',
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        fontSize: '18px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >✕</button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {localMembers.map((member, index) => {
                                    const isPinned = member.role === 'Admin' || member.username === 'admin';
                                    const roleColor = getRoleColor(member.role);
                                    return (
                                        <div key={member.id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '14px 18px',
                                            background: 'rgba(0, 0, 0, 0.25)',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(255, 255, 255, 0.05)',
                                            opacity: isPinned ? 0.5 : 1,
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '10px',
                                                    background: `linear-gradient(135deg, ${roleColor.bg}, ${roleColor.border})`,
                                                    border: `1px solid ${roleColor.border}`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '13px',
                                                    fontWeight: 800,
                                                    color: roleColor.text,
                                                }}>{getInitials(member.name)}</div>
                                                <div>
                                                    <div style={{ color: '#C8D4E8', fontWeight: 600, fontSize: '14px' }}>{member.name}</div>
                                                    <div style={{ color: '#5A6480', fontSize: '12px' }}>@{member.username}</div>
                                                </div>
                                            </div>
                                            <select
                                                disabled={isPinned}
                                                style={{
                                                    padding: '8px 14px',
                                                    background: roleColor.bg,
                                                    border: `1px solid ${roleColor.border}`,
                                                    borderRadius: '8px',
                                                    color: roleColor.text,
                                                    fontWeight: 700,
                                                    fontSize: '13px',
                                                    outline: 'none',
                                                    cursor: isPinned ? 'not-allowed' : 'pointer',
                                                    appearance: isPinned ? 'none' : undefined,
                                                }}
                                                value={member.role}
                                                onChange={(e) => handleMemberChange(index, 'role', e.target.value)}
                                            >
                                                {member.role === 'Admin' && <option value="Admin" style={{ background: '#0a0e1a' }}>🛡️ Admin</option>}
                                                <option value="Yönetici" style={{ background: '#0a0e1a' }}>⚙️ Yönetici</option>
                                                <option value="Üye" style={{ background: '#0a0e1a' }}>👤 Üye</option>
                                            </select>
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                                <button
                                    onClick={() => setShowRoleManager(false)}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: '#8B97B8',
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        fontSize: '13px',
                                    }}
                                >Kapat</button>
                                <button
                                    onClick={() => { handleSaveSettings(); setShowRoleManager(false); }}
                                    style={{
                                        ...saveButtonStyle,
                                        marginTop: 0,
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }}
                                >💾 Kaydet</button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        );
    };

    const renderRateManagement = () => (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
            {/* Genel Ayarlar */}
            <section style={sectionStyle}>
                <h2 style={sectionTitleStyle}>Genel Ayarlar</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={labelStyle}>DÜKKAN İSMİ</label>
                        <input
                            type="text"
                            style={inputStyle}
                            value={localShopName}
                            onChange={(e) => setLocalShopName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>BİLGİLENDİRME</label>
                        <textarea
                            style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                            value={localTicker}
                            onChange={(e) => setLocalTicker(e.target.value)}
                        />
                    </div>
                    <button onClick={handleSaveSettings} style={saveButtonStyle}>
                        AYARLARI KAYDET
                    </button>
                </div>
            </section>

            {/* Fiyat Yönetimi */}
            <section style={sectionStyle}>
                <div style={sectionHeaderStyle}>
                    <h2 style={{ ...sectionTitleStyle, marginBottom: 0 }}>Fiyat Yönetimi</h2>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {/* Font Size Control */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ color: '#5A6480', fontSize: '13px', fontWeight: 600 }}>Yazı Boyutu:</span>
                            <div style={{ color: '#F5D56E', fontWeight: 700, fontSize: '13px', minWidth: '40px', textAlign: 'center' }}>
                                %{localFontSize}
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                    onClick={() => {
                                        const newVal = Math.max(50, localFontSize - 5);
                                        setLocalFontSize(newVal);
                                        updateSettings({ ...settings, displayFontSize: newVal });
                                    }}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        color: '#C8D4E8',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '4px',
                                        width: '28px',
                                        height: '28px',
                                        cursor: 'pointer',
                                        fontSize: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    -
                                </button>
                                <button
                                    onClick={() => {
                                        const newVal = Math.min(200, localFontSize + 5);
                                        setLocalFontSize(newVal);
                                        updateSettings({ ...settings, displayFontSize: newVal });
                                    }}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        color: '#C8D4E8',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '4px',
                                        width: '28px',
                                        height: '28px',
                                        cursor: 'pointer',
                                        fontSize: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <button onClick={handleAddRate} style={addButtonStyle}>
                            <span>+</span> Yeni Ekle
                        </button>
                    </div>
                </div>
                <div
                    ref={tableContainerRef}
                    style={{
                        position: 'relative',
                        width: tableWidth ? `${tableWidth}px` : '100%',
                        minWidth: '400px',
                        maxWidth: '100%',
                        margin: '0 auto',
                        boxSizing: 'border-box',
                    }}
                >
                    {/* Sol resize tutacağı */}
                    <div
                        onMouseDown={(e) => startResize(e, 'left')}
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: '6px',
                            cursor: 'ew-resize',
                            zIndex: 10,
                            background: 'linear-gradient(to right, rgba(96,165,250,0.4), transparent)',
                            borderRadius: '4px 0 0 4px',
                        }}
                        title="Sola sürükleyerek genişlet"
                    />
                    {/* Sağ resize tutacağı */}
                    <div
                        onMouseDown={(e) => startResize(e, 'right')}
                        style={{
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            bottom: 0,
                            width: '6px',
                            cursor: 'ew-resize',
                            zIndex: 10,
                            background: 'linear-gradient(to left, rgba(96,165,250,0.4), transparent)',
                            borderRadius: '0 4px 4px 0',
                        }}
                        title="Sağa sürükleyerek genişlet"
                    />
                    <div style={{ overflowX: 'auto' }}>
                        <style dangerouslySetInnerHTML={{
                            __html: `
                    .pc-counter-box{
                        position:relative;
                        display:flex;
                        align-items:center;
                        gap:8px;
                        background:#1e293b;
                        padding:8px 14px;
                        border-radius:14px;
                        box-shadow:0 6px 15px rgba(0,0,0,0.4);
                        margin: 0 auto;
                    }

                    .pc-btn{
                        height:30px;
                        border:none;
                        border-radius:8px;
                        font-size:15px;
                        font-weight:bold;
                        cursor:pointer;
                        transition:all 0.2s ease;
                        color:white;
                        padding:0 10px;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                    }

                    .pc-btn-minus{ background:#ef4444; width:30px; }
                    .pc-btn-plus{ background:#22c55e; width:30px; }
                    .pc-btn-reset{ background:#3b82f6; font-size:12px; }

                    .pc-btn-save{
                        width:30px;
                        background:#f97316;
                        color:white;
                        border:none;
                    }

                    .pc-btn-save:hover{
                        background:#ea6c0a;
                        color:white;
                    }

                    .pc-btn:hover{
                        transform:scale(1.1);
                        box-shadow:0 5px 15px rgba(0,0,0,0.4);
                    }

                    .pc-count {
                        font-size:16px;
                        font-weight:bold;
                        color:white;
                        min-width:50px;
                        text-align:center;
                        background:transparent;
                        border:none;
                        outline:none;
                        transition:0.2s;
                        -moz-appearance: textfield;
                    }

                    .pc-count::-webkit-outer-spin-button,
                    .pc-count::-webkit-inner-spin-button {
                        -webkit-appearance: none;
                        margin: 0;
                    }

                    .pc-count:focus { color:#facc15; }

                    .pc-percent{
                        font-size:16px;
                        font-weight:bold;
                        min-width:50px;
                        text-align:center;
                        transition:0.2s;
                    }

                    .pc-percent.positive{ color:#22c55e; }
                    .pc-percent.negative{ color:#ef4444; }
                    .pc-percent.zero{ color:white; }

                    .pc-percent.animate {
                        transform:scale(1.3);
                        color:#facc15 !important;
                    }

                    .pc-update-overlay{
                        position:absolute;
                        inset:0;
                        background:#16a34a;
                        border-radius:20px;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        font-size:22px;
                        font-weight:bold;
                        color:white;
                        opacity:0;
                        pointer-events:none;
                        transition:opacity 0.3s ease;
                        z-index:10;
                    }

                    .pc-update-overlay.active{
                        opacity:1;
                        pointer-events:auto;
                    }
                    `}} />
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={{ ...thStyle, width: '40px' }}></th>
                                    <th style={{ ...thStyle, color: '#F5D56E' }}>ÜRÜN / DÖVİZ</th>
                                    <th style={{ ...thStyle, color: '#F5D56E', width: '100px' }}>TÜR</th>
                                    <th style={{ ...thStyle, verticalAlign: 'middle', paddingTop: '6px', paddingBottom: '6px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', flexWrap: 'nowrap' }}>
                                            <span style={{ whiteSpace: 'nowrap', fontSize: '13px', fontWeight: 700, letterSpacing: '0.05em', color: '#F5D56E', textTransform: 'uppercase', lineHeight: 1 }}>ALIŞ FİYATI</span>
                                            <div className="pc-counter-box">
                                                <button
                                                    className="pc-btn pc-btn-minus"
                                                    onClick={() => { setBulkBuyAmount(prev => prev - 1); animateBuy(); }}
                                                >−</button>
                                                <div className={`pc-count${buyAnim ? ' animate' : ''}`}>{bulkBuyAmount}</div>
                                                <button
                                                    className="pc-btn pc-btn-plus"
                                                    onClick={() => { setBulkBuyAmount(prev => prev + 1); animateBuy(); }}
                                                >+</button>
                                                <button className="pc-btn pc-btn-save" onClick={handleBuySave}>✓</button>
                                                <button className="pc-btn pc-btn-reset" onClick={() => { setBulkBuyAmount(0); animateBuy(); }}>Sıfırla</button>
                                                <div className={`pc-update-overlay${buyOverlayAnim ? ' active' : ''}`}>Güncellendi</div>
                                            </div>
                                        </div>
                                    </th>
                                    <th style={{ ...thStyle, verticalAlign: 'middle', paddingTop: '6px', paddingBottom: '6px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', flexWrap: 'nowrap' }}>
                                            <span style={{ whiteSpace: 'nowrap', fontSize: '13px', fontWeight: 700, letterSpacing: '0.05em', color: '#F5D56E', textTransform: 'uppercase', lineHeight: 1 }}>SATIŞ FİYATI</span>
                                            <div className="pc-counter-box">
                                                <button
                                                    className="pc-btn pc-btn-minus"
                                                    onClick={() => { setBulkSellAmount(prev => prev - 1); animateSell(); }}
                                                >−</button>
                                                <div className={`pc-count${sellAnim ? ' animate' : ''}`}>{bulkSellAmount}</div>
                                                <button
                                                    className="pc-btn pc-btn-plus"
                                                    onClick={() => { setBulkSellAmount(prev => prev + 1); animateSell(); }}
                                                >+</button>
                                                <button className="pc-btn pc-btn-save" onClick={handleSellSave}>✓</button>
                                                <button className="pc-btn pc-btn-reset" onClick={() => { setBulkSellAmount(0); animateSell(); }}>Sıfırla</button>
                                                <div className={`pc-update-overlay${sellOverlayAnim ? ' active' : ''}`}>Güncellendi</div>
                                            </div>
                                            <div className="pc-counter-box">
                                                <button className="pc-btn pc-btn-minus" onClick={handlePercentDecrease}>−</button>
                                                <div className={`pc-percent ${parseInt(bulkPercentage || '0') > 0 ? 'positive' : parseInt(bulkPercentage || '0') < 0 ? 'negative' : 'zero'}${percentAnim ? ' animate' : ''}`}>
                                                    {bulkPercentage || '0'}%
                                                </div>
                                                <button className="pc-btn pc-btn-plus" onClick={handlePercentIncrease}>+</button>
                                                <button className="pc-btn pc-btn-save" onClick={handleBulkUpdate}>✓</button>
                                                <button className="pc-btn pc-btn-reset" onClick={handlePercentReset}>Sıfırla</button>
                                                <div className={`pc-update-overlay${updateOverlayAnim ? ' active' : ''}`}>Güncellendi</div>
                                            </div>
                                        </div>
                                    </th>
                                    <th style={{ ...thStyle, color: '#F5D56E', width: '80px' }}>DEĞİŞİM</th>
                                    <th style={{ ...thStyle, textAlign: 'center', color: '#F5D56E', width: '60px' }}>GÖRÜNÜR</th>
                                    <th style={{ ...thStyle, width: '40px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {localRates.map((rate, index) => (
                                    <tr
                                        key={index}
                                    >
                                        <td style={{ padding: '8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                                                <button
                                                    onClick={() => moveRate(index, 'up')}
                                                    disabled={index === 0}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: index === 0 ? '#333' : '#60A5FA',
                                                        cursor: index === 0 ? 'default' : 'pointer',
                                                        fontSize: '12px',
                                                        padding: '2px',
                                                        lineHeight: 1
                                                    }}
                                                >▲</button>
                                                <button
                                                    onClick={() => moveRate(index, 'down')}
                                                    disabled={index === localRates.length - 1}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: index === localRates.length - 1 ? '#333' : '#60A5FA',
                                                        cursor: index === localRates.length - 1 ? 'default' : 'pointer',
                                                        fontSize: '12px',
                                                        padding: '2px',
                                                        lineHeight: 1
                                                    }}
                                                >▼</button>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px', color: '#C8D4E8', fontWeight: 500 }}>
                                            <input
                                                type="text"
                                                style={{ ...inputStyle, padding: '8px 12px', width: '100%' }}
                                                value={rate.name}
                                                onChange={(e) => handleRateChange(index, 'name', e.target.value)}
                                            />
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <select
                                                style={{ ...inputStyle, padding: '8px 12px' }}
                                                value={rate.type}
                                                onChange={(e) => {
                                                    const newRates = [...localRates];
                                                    newRates[index] = { ...newRates[index], type: e.target.value as 'gold' | 'currency' };
                                                    setLocalRates(newRates);
                                                }}
                                            >
                                                <option value="gold" style={{ background: '#0a0e1a' }}>🥇 Altın</option>
                                                <option value="currency" style={{ background: '#0a0e1a' }}>💱 Döviz</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <input
                                                type="text"
                                                style={{ ...inputStyle, padding: '8px 12px' }}
                                                value={rate.buy}
                                                onChange={(e) => handleRateChange(index, 'buy', e.target.value)}
                                            />
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <input
                                                type="text"
                                                style={{ ...inputStyle, padding: '8px 12px' }}
                                                value={rate.sell}
                                                onChange={(e) => handleRateChange(index, 'sell', e.target.value)}
                                            />
                                        </td>

                                        <td style={{ padding: '12px', fontSize: '13px', fontWeight: 600 }}>
                                            <span style={{
                                                color: (parseFloat(rate.change || '0') > 0) ? '#4ADE80' :
                                                    (parseFloat(rate.change || '0') < 0) ? '#F87171' : '#8B97B8'
                                            }}>
                                                %{rate.change || '0.00'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <input
                                                type="checkbox"
                                                checked={rate.isVisible !== false}
                                                onChange={() => handleToggleRateVisibility(index)}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#D4A731' }}
                                            />
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <button
                                                onClick={() => handleDeleteRate(index)}
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
                                                }}
                                                title="Sil"
                                            >
                                                🗑
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>{/* /resizable wrapper */}
            </section >
            {/* Alt Bant Veri Yönetimi */}
            < section style={{ ...sectionStyle, marginTop: '20px' }}>
                <div style={sectionHeaderStyle}>
                    <h2 style={{ ...sectionTitleStyle, marginBottom: 0 }}>Alt Bant Veri Yönetimi</h2>
                    <button onClick={handleAddTickerItem} style={addButtonStyle}>
                        <span>+</span> Yeni Ekle
                    </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ ...thStyle, width: '40px' }}></th>
                                <th style={thStyle}>Ürün Adı</th>
                                <th style={thStyle}>Değer</th>
                                <th style={thStyle}>Değişim (%)</th>
                                <th style={thStyle}>Yön</th>
                                <th style={{ ...thStyle, textAlign: 'center', width: '60px' }}>Görünür</th>
                                <th style={{ ...thStyle, width: '40px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {localTickerItems.map((item, index) => (
                                <tr
                                    key={index}
                                >
                                    <td style={{ padding: '8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <button
                                                onClick={() => moveTicker(index, 'left')}
                                                disabled={index === 0}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: index === 0 ? '#333' : '#60A5FA',
                                                    cursor: index === 0 ? 'default' : 'pointer',
                                                    fontSize: '16px',
                                                    padding: '4px',
                                                    lineHeight: 1
                                                }}
                                                title="Sola (Öne) Taşı"
                                            >◄</button>
                                            <button
                                                onClick={() => moveTicker(index, 'right')}
                                                disabled={index === localTickerItems.length - 1}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: index === localTickerItems.length - 1 ? '#333' : '#60A5FA',
                                                    cursor: index === localTickerItems.length - 1 ? 'default' : 'pointer',
                                                    fontSize: '16px',
                                                    padding: '4px',
                                                    lineHeight: 1
                                                }}
                                                title="Sağa (Arkaya) Taşı"
                                            >►</button>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <input
                                            type="text"
                                            style={{ ...inputStyle, padding: '8px 12px' }}
                                            value={item.name}
                                            onChange={(e) => handleTickerChange(index, 'name', e.target.value)}
                                        />
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <input
                                            type="text"
                                            style={{ ...inputStyle, padding: '8px 12px' }}
                                            value={item.value}
                                            onChange={(e) => handleTickerChange(index, 'value', e.target.value)}
                                        />
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <input
                                            type="text"
                                            style={{ ...inputStyle, padding: '8px 12px', background: 'rgba(255, 255, 255, 0.05)', cursor: 'default', color: '#9CA3AF' }}
                                            value={item.change}
                                            readOnly
                                            title="Otomatik hesaplanır"
                                        />
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <select
                                            style={{ ...inputStyle, padding: '8px 12px', background: 'rgba(255, 255, 255, 0.05)', cursor: 'default', color: '#9CA3AF' }}
                                            value={item.isUp ? 'true' : 'false'}
                                            disabled
                                            title="Otomatik hesaplanır"
                                        >
                                            <option value="true" style={{ background: '#0a0e1a' }}>Yukarı (▲)</option>
                                            <option value="false" style={{ background: '#0a0e1a' }}>Aşağı (▼)</option>
                                        </select>
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={item.isVisible !== false}
                                            onChange={() => handleToggleTickerItemVisibility(index)}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#D4A731' }}
                                        />
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
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
                                            }}
                                            title="Sil"
                                        >
                                            🗑
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section >
        </div >
    );

    return (
        <div style={{
            display: 'flex',
            minHeight: '100vh',
            background: '#0a0e1a',
            color: '#C8D4E8',
            fontFamily: "'DM Sans', sans-serif"
        }}>
            {/* Sidebar */}
            <aside
                onMouseEnter={() => setIsSidebarOpen(true)}
                onMouseLeave={() => setIsSidebarOpen(false)}
                style={{
                    width: isSidebarOpen ? '260px' : '80px',
                    background: 'rgba(20, 28, 50, 0.95)',
                    borderRight: '1px solid rgba(212, 167, 49, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.3s ease',
                    position: 'fixed',
                    height: '100vh',
                    zIndex: 100,
                    boxShadow: isSidebarOpen ? '10px 0 30px rgba(0,0,0,0.5)' : 'none'
                }}
            >
                <div style={{ padding: '24px', textAlign: 'center', borderBottom: '1px solid rgba(212, 167, 49, 0.1)' }}>
                    <h2 style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: isSidebarOpen ? '24px' : '12px',
                        color: '#F5D56E',
                        margin: 0,
                        whiteSpace: 'nowrap'
                    }}>
                        {isSidebarOpen ? 'KURMATİK' : 'K'}
                    </h2>
                </div>

                <nav style={{ padding: '20px 10px', flex: 1 }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <li>
                            <a href="/" target="_blank" style={{
                                width: '100%',
                                padding: '12px 16px',
                                background: 'transparent',
                                border: 'none',
                                borderLeft: '3px solid transparent',
                                color: '#8B97B8',
                                textAlign: 'left',
                                cursor: 'pointer',
                                borderRadius: '0 6px 6px 0',
                                transition: 'all 0.3s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                overflow: 'hidden',
                                textDecoration: 'none',
                                fontSize: '14px',
                                fontWeight: 500,
                                boxSizing: 'border-box',
                            }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#F5D56E'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#8B97B8'}
                            >
                                <div style={{ minWidth: '20px', textAlign: 'center', fontWeight: 'bold' }}>🏠</div>
                                {isSidebarOpen && <span style={{ whiteSpace: 'nowrap' }}>Ana Sayfa</span>}
                            </a>
                        </li>
                        <SidebarItem
                            label="Piyasa Canlı"
                            tab="home"
                            activeTab={activeTab}
                            onClick={() => setActiveTab('home')}
                            isOpen={isSidebarOpen}
                        />
                        <li style={{ borderBottom: '1px solid rgba(212, 167, 49, 0.1)', margin: '4px 16px' }}></li>
                        <SidebarItem
                            label="Kur Güncelleme"
                            tab="rates"
                            activeTab={activeTab}
                            onClick={() => setActiveTab('rates')}
                            isOpen={isSidebarOpen}
                        />
                        {(currentUser?.role === 'Admin' || currentUser?.role === 'Yönetici') && (
                            <SidebarItem
                                label="Duyurular"
                                tab="announcements"
                                activeTab={activeTab}
                                onClick={() => setActiveTab('announcements')}
                                isOpen={isSidebarOpen}
                            />
                        )}
                        <SidebarItem
                            label="Üyeler"
                            tab="members"
                            activeTab={activeTab}
                            onClick={() => setActiveTab('members')}
                            isOpen={isSidebarOpen}
                        />
                        <SidebarItem
                            label="Geçmiş Listeleme"
                            tab="history"
                            activeTab={activeTab}
                            onClick={() => setActiveTab('history')}
                            isOpen={isSidebarOpen}
                        />
                        <li style={{ borderBottom: '1px solid rgba(212, 167, 49, 0.1)', margin: '4px 16px' }}></li>
                        <SidebarItem
                            label="Anlık Kullanıcı Takibi"
                            tab="user_tracking"
                            activeTab={activeTab}
                            onClick={() => setActiveTab('user_tracking')}
                            isOpen={isSidebarOpen}
                        />
                        <SidebarItem
                            label="Kar Hesaplama"
                            tab="kar_hesaplama"
                            activeTab={activeTab}
                            onClick={() => setActiveTab('kar_hesaplama')}
                            isOpen={isSidebarOpen}
                        />
                        <SidebarItem
                            label="Fiyat Alarmları"
                            tab="price_alerts"
                            activeTab={activeTab}
                            onClick={() => setActiveTab('price_alerts')}
                            isOpen={isSidebarOpen}
                        />
                    </ul>
                </nav>

                <div style={{ padding: '20px', borderTop: '1px solid rgba(212, 167, 49, 0.1)' }}>
                    {isSidebarOpen && (
                        <button onClick={handleLogout} style={{
                            width: '100%',
                            background: '#EF4444',
                            color: '#fff',
                            border: 'none',
                            padding: '10px',
                            borderRadius: '6px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}>Çıkış Yap</button>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main style={{
                flex: 1,
                marginLeft: '80px', // Keep content at fixed margin to prevent jumping
                padding: '40px',
                transition: 'all 0.3s ease',
                minWidth: 0
            }}>
                <header style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '40px',
                    borderBottom: '1px solid rgba(212, 167, 49, 0.2)',
                    paddingBottom: '20px'
                }}>
                    <div>
                        <h1 style={{
                            fontFamily: "'Playfair Display', serif",
                            fontSize: '32px',
                            fontWeight: 700,
                            color: '#F5D56E',
                            margin: 0
                        }}>
                            {activeTab === 'home' && 'Piyasa Canlı'}
                            {activeTab === 'rates' && 'Kur Güncelleme'}
                            {activeTab === 'members' && 'Üye Yönetimi'}
                            {activeTab === 'history' && 'İşlem Geçmişi'}
                            {activeTab === 'user_tracking' && 'Anlık Kullanıcı Takibi'}
                            {activeTab === 'kar_hesaplama' && 'Kar Hesaplama'}
                            {activeTab === 'announcements' && 'Duyuru ve Bildirim Yönetimi'}
                            {activeTab === 'price_alerts' && 'Fiyat Alarm Sistemi'}
                        </h1>
                        <p style={{ color: '#8B97B8', fontSize: '14px', marginTop: '4px' }}>Kurmatik.net Yönetim Sistemi</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <NotificationBell />
                        <a href="/" target="_blank" style={{
                            color: '#F5D56E',
                            textDecoration: 'none',
                            fontSize: '14px',
                            fontWeight: 600,
                            border: '1px solid #D4A731',
                            padding: '8px 16px',
                            borderRadius: '6px'
                        }}>Sistem Ekranını Aç &rarr;</a>
                    </div>
                </header>

                <div style={{ padding: '0 10px' }}>
                    {activeTab === 'home' && renderHome()}
                    {activeTab === 'rates' && renderRateManagement()}
                    {activeTab === 'members' && renderMemberManagement()}
                    {activeTab === 'user_tracking' && (
                        <UserTracking />
                    )}
                    {activeTab === 'kar_hesaplama' && (
                        <KarHesaplama />
                    )}
                    {activeTab === 'announcements' && (
                        <Announcements />
                    )}
                    {activeTab === 'price_alerts' && (
                        <PriceAlerts marketData={marketData} lastUpdate={lastHomeUpdate} error={error} />
                    )}
                    {activeTab === 'history' && (
                        <div className="history-page">
                            {/* İSTATİSTİKLER */}
                            <div className="history-stats-row">
                                <div className="history-stat-chip" style={{ borderColor: 'rgba(212,175,55,0.2)' }}>
                                    <div className="h-sc-icon">📋</div>
                                    <div>
                                        <div className="h-sc-val" style={{ color: '#D4AF37' }}>{filteredAndGroupedHistory.length}</div>
                                        <div className="h-sc-label">Toplam Güncelleme</div>
                                    </div>
                                </div>
                                <div className="history-stat-chip" style={{ borderColor: 'rgba(16,185,129,0.2)' }}>
                                    <div className="h-sc-icon">📝</div>
                                    <div>
                                        <div className="h-sc-val" style={{ color: '#10b981' }}>{historyLogs.length}</div>
                                        <div className="h-sc-label">Toplam Kayıt</div>
                                    </div>
                                </div>
                                <div className="history-stat-chip" style={{ borderColor: 'rgba(59,130,246,0.2)' }}>
                                    <div className="h-sc-icon">📅</div>
                                    <div>
                                        <div className="h-sc-val" style={{ color: '#60a5fa' }}>{filteredAndGroupedHistory.filter(g => new Date(g[0].created_at).toLocaleDateString() === new Date().toLocaleDateString()).length}</div>
                                        <div className="h-sc-label">Bugün</div>
                                    </div>
                                </div>
                                <div className="history-stat-chip" style={{ borderColor: 'rgba(139,92,246,0.2)' }}>
                                    <div className="h-sc-icon">⏱</div>
                                    <div>
                                        <div className="h-sc-val" style={{ color: '#8b5cf6' }}>{historyLogs.length > 0 ? new Date(historyLogs[0].created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                                        <div className="h-sc-label">Son Güncelleme</div>
                                    </div>
                                </div>
                            </div>

                            {/* FİLTRE BAR */}
                            <div className="history-filter-bar">
                                <div className="h-search-wrap">
                                    <span className="h-search-ic">🔍</span>
                                    <input
                                        className="h-search-input"
                                        type="text"
                                        placeholder="Ürün veya kullanıcı ara..."
                                        value={historySearch}
                                        onChange={e => { setHistorySearch(e.target.value); setHistoryPage(0); }}
                                    />
                                </div>
                                <select className="h-filter-sel" value={historyTypeFilter} onChange={e => { setHistoryTypeFilter(e.target.value); setHistoryPage(0); }}>
                                    <option value="">Tüm Türler</option>
                                    <option value="altin">🥇 Altın</option>
                                    <option value="doviz">💱 Döviz</option>
                                    <option value="gumus">🥈 Gümüş</option>
                                </select>
                                <select className="h-filter-sel" value={historySourceFilter} onChange={e => { setHistorySourceFilter(e.target.value); setHistoryPage(0); }}>
                                    <option value="">Tüm Kaynaklar</option>
                                    <option value="manuel">✏️ Manuel</option>
                                    <option value="api_otomatik">🤖 API Otomatik</option>
                                    <option value="toplu">📦 Toplu</option>
                                </select>
                                <input
                                    className="h-filter-date"
                                    type="date"
                                    value={historyDateFilter}
                                    onChange={e => { setHistoryDateFilter(e.target.value); setHistoryPage(0); }}
                                />
                                {historyLogs.length > 0 && (
                                    <button
                                        onClick={async () => {
                                            if (window.confirm('Tüm geçmiş kayıtları silmek istediğinize emin misiniz?')) {
                                                await clearHistory();
                                            }
                                        }}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: '1px solid rgba(239, 68, 68, 0.25)',
                                            color: '#f87171',
                                            padding: '8px 16px',
                                            borderRadius: '9px',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            marginLeft: '10px'
                                        }}
                                    >
                                        🗑 Temizle
                                    </button>
                                )}
                            </div>

                            {/* AKORDİYON LİSTESİ */}
                            <div className="accordion-list">
                                {filteredAndGroupedHistory.length === 0 ? (
                                    <div className="placeholder" style={{ textAlign: 'center', padding: '80px 20px', background: '#0c1019', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.4 }}>📭</div>
                                        <div style={{ fontSize: '15px', fontWeight: 500, color: '#94a3b8' }}>Kayıt bulunamadı</div>
                                    </div>
                                ) : (
                                    filteredAndGroupedHistory.slice(historyPage * 10, (historyPage + 1) * 10).map((group, gIdx) => {
                                        const first = group[0];
                                        const batchId = first.batch_id || first.created_at.substring(0, 19);
                                        const isOpen = openHistoryGroups.includes(batchId);
                                        const date = new Date(first.created_at);

                                        const altinS = group.filter(r => r.item_group === 'altin').length;
                                        const dovizS = group.filter(r => r.item_group === 'doviz').length;
                                        const gumusS = group.filter(r => r.item_group === 'gumus').length;

                                        return (
                                            <div key={batchId} className={`acc-card ${isOpen ? 'open' : ''}`}>
                                                <div className="acc-header" onClick={() => {
                                                    setOpenHistoryGroups(prev =>
                                                        prev.includes(batchId) ? prev.filter(id => id !== batchId) : [...prev, batchId]
                                                    );
                                                }}>
                                                    <div className="acc-left">
                                                        <div className="acc-num">#{String(filteredAndGroupedHistory.length - (historyPage * 10 + gIdx)).padStart(2, '0')}</div>
                                                        <div className="acc-meta">
                                                            <div className="acc-date">📅 {date.toLocaleDateString('tr-TR')} — {date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                                                            <div className="acc-source">
                                                                <span style={{ color: first.source === 'manuel' ? '#10b981' : '#60a5fa' }}>
                                                                    {first.source === 'manuel' ? '✏️ Manuel' : '🤖 API Otomatik'}
                                                                </span>
                                                                <span>·</span>
                                                                <span>{first.user_name || 'Sistem'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="acc-right">
                                                        <div className="acc-pills">
                                                            {altinS > 0 && <span className="pill pill-altin">{altinS} Altın</span>}
                                                            {dovizS > 0 && <span className="pill pill-doviz">{dovizS} Döviz</span>}
                                                            {gumusS > 0 && <span className="pill pill-gumus">{gumusS} Gümüş</span>}
                                                        </div>
                                                        <div style={{ textAlign: 'center', minWidth: '52px' }}>
                                                            <div className="acc-count">{group.length}</div>
                                                            <div className="acc-count-label">Kayıt</div>
                                                        </div>
                                                    </div>
                                                    <div className="acc-chevron">
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="6 9 12 15 18 9"></polyline>
                                                        </svg>
                                                    </div>
                                                </div>
                                                <div className="acc-body">
                                                    <div className="acc-body-inner">
                                                        <div className="inner-head">
                                                            <div className="ith">Ürün Adı</div>
                                                            <div className="ith">Tür</div>
                                                            <div className="ith tr">Eski Fiyat (A/S)</div>
                                                            <div className="ith tr">Yeni Fiyat (A/S)</div>
                                                            <div className="ith tc">Değişim</div>
                                                        </div>
                                                        {group.map((item) => {
                                                            const diffBuy = parseFloat(item.new_buy || '0') - parseFloat(item.old_buy || '0');
                                                            const diffSell = parseFloat(item.new_sell || '0') - parseFloat(item.old_sell || '0');

                                                            const formatDiff = (d: number) => {
                                                                if (Math.abs(d) < 0.001) return '—';
                                                                return (d > 0 ? '+' : '') + d.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
                                                            };

                                                            return (
                                                                <div key={item.id} className="inner-row">
                                                                    <div className="itd">
                                                                        <div className="product-name">{item.item_name}</div>
                                                                    </div>
                                                                    <div className="itd">
                                                                        <span className={`pill ${item.item_group === 'altin' ? 'pill-altin' : item.item_group === 'doviz' ? 'pill-doviz' : 'pill-gumus'}`}>
                                                                            {item.item_group === 'altin' ? '🥇 Altın' : item.item_group === 'doviz' ? '💱 Döviz' : '🥈 Gümüş'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="itd tr">
                                                                        <div className="fiyat-cell">
                                                                            <div className="fiyat-row">
                                                                                <span className="fiyat-lbl">A</span>
                                                                                <span className="fiyat-val fiyat-eski">{item.old_buy || '—'}</span>
                                                                            </div>
                                                                            <div className="fiyat-row">
                                                                                <span className="fiyat-lbl">S</span>
                                                                                <span className="fiyat-val fiyat-eski">{item.old_sell || '—'}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="itd tr">
                                                                        <div className="fiyat-cell">
                                                                            <div className="fiyat-row">
                                                                                <span className="fiyat-lbl">A</span>
                                                                                <span className="fiyat-val fiyat-yeni" style={{ color: diffBuy > 0 ? '#10b981' : diffBuy < 0 ? '#ef4444' : '#94a3b8' }}>{item.new_buy || '—'}</span>
                                                                            </div>
                                                                            <div className="fiyat-row">
                                                                                <span className="fiyat-lbl">S</span>
                                                                                <span className="fiyat-val fiyat-yeni" style={{ color: diffSell > 0 ? '#10b981' : diffSell < 0 ? '#ef4444' : '#94a3b8' }}>{item.new_sell || '—'}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="itd tc">
                                                                        <div className="degisim-cell">
                                                                            <span style={{ color: diffBuy > 0 ? '#10b981' : diffBuy < 0 ? '#ef4444' : '#475569' }}>{formatDiff(diffBuy)}</span>
                                                                            <span style={{ color: diffSell > 0 ? '#10b981' : diffSell < 0 ? '#ef4444' : '#475569' }}>{formatDiff(diffSell)}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        <div className="acc-footer">
                                                            <span>{group.length} ürün güncellendi</span>
                                                            <span>{new Date(first.created_at).toLocaleString('tr-TR')} · {first.source === 'manuel' ? '✏️ Manuel' : '🤖 API'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* SAYFALAMA */}
                            {filteredAndGroupedHistory.length > 10 && (
                                <div className="history-pagination" style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
                                    <button
                                        disabled={historyPage === 0}
                                        onClick={() => setHistoryPage(prev => prev - 1)}
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', color: '#94a3b8', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
                                    >← Önceki</button>
                                    {[...Array(Math.ceil(filteredAndGroupedHistory.length / 10))].map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setHistoryPage(i)}
                                            style={{
                                                background: historyPage === i ? '#D4AF37' : 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.06)',
                                                color: historyPage === i ? '#000' : '#94a3b8',
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontWeight: historyPage === i ? 'bold' : 'normal'
                                            }}
                                        >{i + 1}</button>
                                    ))}
                                    <button
                                        disabled={historyPage >= Math.ceil(filteredAndGroupedHistory.length / 10) - 1}
                                        onClick={() => setHistoryPage(prev => prev + 1)}
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', color: '#94a3b8', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
                                    >Sonraki →</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main >

            {/* Custom Save Popup */}
            {showSavePopup && (
                <div
                    id="save-popup-overlay"
                    onClick={() => setShowSavePopup(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.65)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 1, // Controlled purely sequentially right now
                        transition: 'opacity 0.3s',
                    }}
                >
                    <div
                        id="save-popup"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'linear-gradient(145deg,#0f1825,#0c1220)',
                            border: '1px solid rgba(212,175,55,0.35)',
                            borderRadius: '24px',
                            padding: '48px 52px',
                            textAlign: 'center',
                            boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,55,0.08)',
                            transform: 'scale(1) translateY(0)',
                            transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                            maxWidth: '420px',
                            width: '90%',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Arka plan parıltı */}
                        <div style={{
                            position: 'absolute',
                            top: '-60px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '280px',
                            height: '180px',
                            background: 'radial-gradient(ellipse,rgba(212,175,55,0.12) 0%,transparent 70%)',
                            pointerEvents: 'none',
                        }}></div>

                        {/* Check ikonu */}
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.05))',
                            border: '2px solid rgba(16,185,129,0.4)',
                            margin: '0 auto 24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '36px',
                            color: '#10b981',
                            animation: 'sp-checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both',
                        }}>✓</div>

                        {/* Başlık */}
                        <div style={{
                            fontSize: '22px',
                            fontWeight: 700,
                            color: '#D4AF37',
                            letterSpacing: '1px',
                            marginBottom: '10px',
                        }}>Kaydedildi!</div>

                        {/* Açıklama */}
                        <div style={{
                            fontSize: '13px',
                            color: '#64748b',
                            lineHeight: 1.7,
                            marginBottom: '24px',
                        }}>Tüm değişiklikler başarıyla kaydedildi.</div>

                        {/* Ayırıcı */}
                        <div style={{
                            width: '50px',
                            height: '2px',
                            background: 'linear-gradient(90deg,transparent,#D4AF37,transparent)',
                            margin: '0 auto 20px',
                        }}></div>

                        {/* Özet */}
                        <div
                            id="save-summary"
                            dangerouslySetInnerHTML={{ __html: savePopupSummary }}
                            style={{
                                background: 'rgba(212,175,55,0.05)',
                                border: '1px solid rgba(212,175,55,0.12)',
                                borderRadius: '12px',
                                padding: '14px 18px',
                                marginBottom: '28px',
                                textAlign: 'left',
                                fontSize: '12px',
                                color: '#94a3b8',
                                lineHeight: 2.2,
                            }}
                        ></div>

                        {/* Kapat butonu */}
                        <button
                            onClick={() => setShowSavePopup(false)}
                            style={{
                                background: 'linear-gradient(135deg,#c9a227,#e8c547)',
                                color: '#000',
                                border: 'none',
                                borderRadius: '12px',
                                padding: '13px 0',
                                width: '100%',
                                fontSize: '14px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 4px 20px rgba(212,175,55,0.35)',
                                transition: 'all 0.2s',
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 6px 25px rgba(212,175,55,0.5)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = '';
                                e.currentTarget.style.boxShadow = '0 4px 20px rgba(212,175,55,0.35)';
                            }}
                        >
                            Tamam
                        </button>
                    </div>
                    <style dangerouslySetInnerHTML={{
                        __html: `
                        @keyframes sp-checkPop {
                            0%   { transform: scale(0) rotate(-15deg); opacity: 0; }
                            60%  { transform: scale(1.2) rotate(5deg); }
                            100% { transform: scale(1)   rotate(0deg); opacity: 1; }
                        }
                    `}} />
                </div>
            )}
        </div >
    );
};

interface SidebarItemProps {
    label: string;
    tab: string;
    activeTab: string;
    onClick: () => void;
    isOpen: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ label, tab, activeTab, onClick, isOpen }) => {
    const isActive = activeTab === tab;
    return (
        <li>
            <button
                onClick={onClick}
                style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: isActive ? 'linear-gradient(90deg, rgba(212, 167, 49, 0.2), transparent)' : 'transparent',
                    border: 'none',
                    borderLeft: isActive ? '3px solid #D4A731' : '3px solid transparent',
                    color: isActive ? '#F5D56E' : '#8B97B8',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderRadius: '0 6px 6px 0',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    overflow: 'hidden'
                }}
            >
                <div style={{ minWidth: '20px', textAlign: 'center', fontWeight: 'bold' }}>
                    {tab === 'home' && <Zap size={16} style={{ marginBottom: '-2px' }} />}
                    {tab === 'rates' && '₺'}
                    {tab === 'announcements' && '📢'}
                    {tab === 'members' && '👤'}
                    {tab === 'history' && '📜'}
                    {tab === 'user_tracking' && '📊'}
                    {tab === 'kar_hesaplama' && '💰'}
                </div>
                {isOpen && <span style={{ fontWeight: isActive ? 700 : 500, fontSize: '14px', whiteSpace: 'nowrap' }}>{label}</span>}
            </button>
        </li>
    );
};

const sectionStyle: React.CSSProperties = {
    background: 'rgba(20, 28, 50, 0.8)',
    padding: '30px',
    borderRadius: '12px',
    border: '1px solid rgba(212, 167, 49, 0.1)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
};

const sectionTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 700,
    color: '#F5D56E',
    marginBottom: '20px',
    textTransform: 'uppercase',
    letterSpacing: '1px'
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    color: '#8B97B8',
    fontSize: '13px',
    marginBottom: '8px',
    fontWeight: 600
};

const saveButtonStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #D4A731, #8B6914)',
    color: '#0a0e1a',
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    alignSelf: 'flex-start',
    marginTop: '10px'
};



const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#fff',
    outline: 'none',
    fontSize: '14px',
    transition: 'all 0.3s'
};

const sectionHeaderStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
};

const addButtonStyle: React.CSSProperties = {
    background: 'rgba(212, 167, 49, 0.1)',
    border: '1px solid rgba(212, 167, 49, 0.3)',
    color: '#F5D56E',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
};

const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '12px',
    fontSize: '12px',
    fontWeight: 700,
    color: '#8B97B8',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    borderBottom: '1px solid rgba(212, 167, 49, 0.2)'
};

export default Dashboard;
