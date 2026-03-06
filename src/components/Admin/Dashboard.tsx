import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExchange } from '../../hooks/useExchange';
import type { TickerItem, HistoryLog, Rate, Member } from '../../context/ExchangeContext';
import UserTracking from './UserTracking';
import KarHesaplama from './KarHesaplama';
import Announcements from './Announcements';
import PriceAlerts from './PriceAlerts';
import NotificationBell from '../Shared/NotificationBell';
import ProfileModal from '../Shared/ProfileModal';

import { Zap } from 'lucide-react';
import './Members.css';
import './History.css';
import DOMPurify from 'dompurify';

import HistoryPanel from './HistoryPanel';
import MemberManagement from './MemberManagement';
import RateManagement from './RateManagement';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const context = useExchange();
    const { settings, updateSettings, rates, updateRates, tickerItems, updateTickerItems, members, updateMembers, updateMemberPassword, historyLogs, clearHistory, logoutUser, currentUser } = context;

    const [localShopName, setLocalShopName] = useState(settings.shopName);
    const [localTicker, setLocalTicker] = useState(settings.scrollingText);
    const [localRates, setLocalRates] = useState(rates);
    const [localTickerItems, setLocalTickerItems] = useState(tickerItems);
    const [localMembers, setLocalMembers] = useState(members);
    const [activeTab, setActiveTab] = useState<'home' | 'rates' | 'members' | 'history' | 'user_tracking' | 'kar_hesaplama' | 'announcements'>('home');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);

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




    const [localFontSize, setLocalFontSize] = useState(settings.displayFontSize || 100);

    const [error, setError] = useState<string | null>(null);

    const [lastHomeUpdate, setLastHomeUpdate] = useState<Date | null>(null);

    // Live Market Data State
    const [marketData, setMarketData] = useState<any>({});

    // Save Popup State
    const [showSavePopup, setShowSavePopup] = useState(false);
    const [savePopupSummary, setSavePopupSummary] = useState('');

    // Member Selection State
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());

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

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClick = () => setDropdownOpen(false);
        if (dropdownOpen) {
            setTimeout(() => document.addEventListener('click', handleClick), 0);
            return () => document.removeEventListener('click', handleClick);
        }
    }, [dropdownOpen]);

    const getRoleBadge = (role: string) => {
        const colors: Record<string, { bg: string; text: string; border: string }> = {
            'Admin': { bg: 'rgba(239, 68, 68, 0.15)', text: '#F87171', border: 'rgba(239, 68, 68, 0.3)' },
            'Yönetici': { bg: 'rgba(96, 165, 250, 0.15)', text: '#60A5FA', border: 'rgba(96, 165, 250, 0.3)' },
            'Üye': { bg: 'rgba(156, 163, 175, 0.15)', text: '#9CA3AF', border: 'rgba(156, 163, 175, 0.3)' },
        };
        return colors[role] || colors['Üye'];
    };

    const roleBadge = getRoleBadge(currentUser?.role || 'Admin');

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
        if (activeTab !== 'home') return;

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
                fetchAPI(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/currency`),
                fetchAPI(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/gold`),
                fetchAPI(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/silver`)
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



    const saveCalculatedRates = (ratesToSave: Rate[]) => {
        const calculatedRates = ratesToSave.map(newRate => {
            const oldRate = rates.find(r => r.id === newRate.id);
            let change = '0.00';

            if (oldRate) {
                const oldSell = parsePrice(oldRate.sell);
                const newSell = parsePrice(newRate.sell);

                if (oldSell !== newSell && oldSell !== 0) {
                    const diff = ((newSell - oldSell) / oldSell) * 100;
                    change = diff.toFixed(2);
                } else {
                    change = oldRate.change || '0.00';
                }
            } else if (newRate.change) {
                change = newRate.change;
            }

            return { ...newRate, change };
        });

        setLocalRates(calculatedRates);
        updateRates(calculatedRates);
        return calculatedRates;
    };

    const handleBuySave = () => {
        const amount = bulkBuyAmount;
        const newRates = localRates.map(rate => ({
            ...rate,
            buy: (parsePrice(rate.buy) + amount).toFixed(2)
        }));
        saveCalculatedRates(newRates);
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
        saveCalculatedRates(newRates);
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

        saveCalculatedRates(newRates);
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
        saveCalculatedRates(localRates);
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



    const handleDeleteMember = async (index: number) => {
        const memberToDelete = localMembers[index];
        if (memberToDelete.role === 'Admin' || memberToDelete.username === 'admin') {
            alert('Admin kullanıcısı silinemez!');
            return;
        }

        if (window.confirm(`${memberToDelete.name} (@${memberToDelete.username}) adlı üyeyi silmek istediğinize emin misiniz?`)) {
            try {
                const { supabase } = await import('../../supabaseClient');
                const { error: deleteError } = await supabase
                    .from('members')
                    .delete()
                    .eq('id', memberToDelete.id);

                if (deleteError) {
                    console.error('Error deleting member:', deleteError);
                    alert('Üye silinirken hata oluştu: ' + deleteError.message);
                    return;
                }

                // Update local members array only after successful DB deletion
                const newMembers = localMembers.filter((_, i) => i !== index);
                setLocalMembers(newMembers);
            } catch (err) {
                console.error('Unexpected error during deletion:', err);
                alert('Beklenmedik bir hata oluştu.');
            }
        }
    };

    const handleLogout = () => {
        // Custom prompt logic for Electron
        const wantsToQuit = window.confirm('Tamamen uygulamadan çıkmak istiyor musunuz?\n\nTamam = Uygulamayı Kapat\nİptal = Sadece Oturumu Kapat (Giriş Ekranına Dön)');

        logoutUser();

        if (wantsToQuit) {
            window.close(); // Ask browser window to close (Quits app in Electron)
        } else {
            navigate('/login');
        }
    };

    const toggleSelectMember = (id: string) => {
        setSelectedMemberIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleSelectAll = (filteredMembers: Member[]) => {
        if (selectedMemberIds.size === filteredMembers.length && filteredMembers.length > 0) {
            setSelectedMemberIds(new Set());
        } else {
            setSelectedMemberIds(new Set(filteredMembers.map(m => m.id)));
        }
    };

    const handleBulkDelete = async () => {
        const count = selectedMemberIds.size;
        if (count === 0) return;

        const adminSelected = localMembers.some(m => selectedMemberIds.has(m.id) && (m.role === 'Admin' || m.username === 'admin'));
        if (adminSelected) {
            alert('Admin kullanıcısı toplu silme işlemiyle silinemez. Lütfen seçiminizi kontrol edin.');
            return;
        }

        if (window.confirm(`${count} seçili üyeyi kalıcı olarak silmek istediğinize emin misiniz?`)) {
            try {
                const { supabase } = await import('../../supabaseClient');
                const selectedArray = Array.from(selectedMemberIds);

                const { error: deleteError } = await supabase
                    .from('members')
                    .delete()
                    .in('id', selectedArray);

                if (deleteError) {
                    console.error('Error in bulk deletion:', deleteError);
                    alert('Toplu silme sırasında hata oluştu: ' + deleteError.message);
                    return;
                }

                // Update local state
                setLocalMembers(prev => prev.filter(m => !selectedMemberIds.has(m.id)));
                setSelectedMemberIds(new Set());
                alert('Seçili üyeler başarıyla silindi.');
            } catch (err) {
                console.error('Unexpected error in bulk delete:', err);
                alert('Beklenmedik bir hata oluştu.');
            }
        }
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

    const renderRateManagement = () => (
        <RateManagement
            localShopName={localShopName}
            setLocalShopName={setLocalShopName}
            localTicker={localTicker}
            setLocalTicker={setLocalTicker}
            handleSaveSettings={handleSaveSettings}
            localFontSize={localFontSize}
            setLocalFontSize={setLocalFontSize}
            settings={settings}
            updateSettings={updateSettings}
            localRates={localRates}
            setLocalRates={setLocalRates}
            handleRateChange={handleRateChange}
            handleAddRate={handleAddRate}
            handleDeleteRate={handleDeleteRate}
            handleToggleRateVisibility={handleToggleRateVisibility}
            moveRate={moveRate}
            bulkBuyAmount={bulkBuyAmount}
            setBulkBuyAmount={setBulkBuyAmount}
            bulkSellAmount={bulkSellAmount}
            setBulkSellAmount={setBulkSellAmount}
            buyAnim={buyAnim}
            sellAnim={sellAnim}
            buyOverlayAnim={buyOverlayAnim}
            sellOverlayAnim={sellOverlayAnim}
            animateBuy={animateBuy}
            animateSell={animateSell}
            handleBuySave={handleBuySave}
            handleSellSave={handleSellSave}
            bulkPercentage={bulkPercentage}
            setBulkPercentage={setBulkPercentage}
            percentAnim={percentAnim}
            updateOverlayAnim={updateOverlayAnim}
            handlePercentIncrease={handlePercentIncrease}
            handlePercentDecrease={handlePercentDecrease}
            handlePercentReset={handlePercentReset}
            handleBulkUpdate={handleBulkUpdate}
            localTickerItems={localTickerItems}
            handleTickerChange={handleTickerChange}
            handleAddTickerItem={handleAddTickerItem}
            handleDeleteTickerItem={handleDeleteTickerItem}
            handleToggleTickerItemVisibility={handleToggleTickerItemVisibility}
            moveTicker={moveTicker}
        />
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

                        </h1>
                        <p style={{ color: '#8B97B8', fontSize: '14px', marginTop: '4px' }}>Kurmatik.net Yönetim Sistemi</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <a href="/" target="_blank" style={{
                            color: '#F5D56E',
                            textDecoration: 'none',
                            fontSize: '14px',
                            fontWeight: 600,
                            padding: '8px 16px',
                            background: 'rgba(212, 167, 49, 0.1)',
                            border: '1px solid rgba(212, 167, 49, 0.2)',
                            borderRadius: '10px',
                            transition: 'all 0.3s'
                        }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(212, 167, 49, 0.2)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(212, 167, 49, 0.1)'; }}
                        >Sistem Ekranını Aç &rarr;</a>

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
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#C8D4E8' }}>{currentUser?.name || 'Yönetici'}</div>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        color: roleBadge.text,
                                        background: roleBadge.bg,
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        border: `1px solid ${roleBadge.border}`,
                                    }}>{currentUser?.role || 'Admin'}</span>
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
                                    <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '4px' }}>
                                        <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>{currentUser?.name}</div>
                                        <div style={{ color: '#8B97B8', fontSize: '12px' }}>{currentUser?.username ? `@${currentUser.username}` : ''}</div>
                                    </div>
                                    <button
                                        onClick={() => { setShowProfileModal(true); setDropdownOpen(false); }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                                            padding: '10px 12px', border: 'none', borderRadius: '8px',
                                            cursor: 'pointer', transition: 'all 0.2s',
                                            fontSize: '13px', fontWeight: 600, textAlign: 'left',
                                            color: '#C8D4E8', background: 'transparent'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        <span>👤</span> Üye Bilgileri
                                    </button>

                                    <div style={{ height: '1px', background: 'rgba(212, 167, 49, 0.1)', margin: '6px 8px' }} />

                                    <button
                                        onClick={handleLogout}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                                            padding: '10px 12px', border: 'none', borderRadius: '8px',
                                            cursor: 'pointer', transition: 'all 0.2s',
                                            fontSize: '13px', fontWeight: 600, textAlign: 'left',
                                            color: '#F87171', background: 'transparent'
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

                <div style={{ padding: '0 10px' }}>
                    {activeTab === 'home' && renderHome()}
                    {activeTab === 'rates' && renderRateManagement()}
                    {activeTab === 'members' && (
                        <MemberManagement
                            localMembers={localMembers}
                            setLocalMembers={setLocalMembers}
                            selectedMemberIds={selectedMemberIds}
                            memberSearch={memberSearch}
                            setMemberSearch={setMemberSearch}
                            memberRoleFilter={memberRoleFilter}
                            setMemberRoleFilter={setMemberRoleFilter}
                            handleBulkDelete={handleBulkDelete}
                            handleMemberChange={handleMemberChange}
                            handleDeleteMember={handleDeleteMember}
                            handleSaveSettings={handleSaveSettings}
                            toggleSelectMember={toggleSelectMember}
                            handleSelectAll={handleSelectAll}
                            getRoleColor={getRoleColor}
                            getInitials={getInitials}
                            updateMemberPassword={updateMemberPassword}
                        />
                    )}
                    {activeTab === 'user_tracking' && (
                        <UserTracking />
                    )}
                    {activeTab === 'kar_hesaplama' && (
                        <KarHesaplama />
                    )}
                    {activeTab === 'announcements' && (
                        <Announcements />
                    )}

                    {activeTab === 'history' && (
                        <HistoryPanel
                            historyLogs={historyLogs}
                            filteredAndGroupedHistory={filteredAndGroupedHistory}
                            historySearch={historySearch}
                            setHistorySearch={setHistorySearch}
                            historyTypeFilter={historyTypeFilter}
                            setHistoryTypeFilter={setHistoryTypeFilter}
                            historySourceFilter={historySourceFilter}
                            setHistorySourceFilter={setHistorySourceFilter}
                            historyDateFilter={historyDateFilter}
                            setHistoryDateFilter={setHistoryDateFilter}
                            historyPage={historyPage}
                            setHistoryPage={setHistoryPage}
                            openHistoryGroups={openHistoryGroups}
                            setOpenHistoryGroups={setOpenHistoryGroups}
                            clearHistory={clearHistory}
                        />
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
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(savePopupSummary) }}
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

            {/* Profile Modal */}
            <ProfileModal
                isOpen={showProfileModal}
                onClose={() => setShowProfileModal(false)}
            />
        </div>
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

export default Dashboard;
