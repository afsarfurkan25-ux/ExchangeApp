import { supabase } from '../supabaseClient';
import React, { useState, useEffect, type ReactNode, createContext } from 'react';
import { onMemberLogin, onMemberLogout } from '../lib/authHelpers';

// Define types
export interface Rate {
    id?: number;
    name: string;
    buy: string;
    sell: string;
    type: 'gold' | 'currency';
    change?: string; // Percentage change
    isVisible?: boolean; // New visibility toggle
}

export interface Settings {
    shopName: string;
    scrollingText: string;
    infoPanelText: string; // New field for the top info panel
    isApiMode: boolean;
    margin: number; // Percentage or fixed amount
    displayFontSize: number; // Percentage scale (e.g., 100, 110, 120)
}

export interface TickerItem {
    id?: number;
    name: string;
    value: string;
    change: string;
    isUp: boolean;
    isVisible?: boolean; // New visibility toggle
}

export type UserRole = 'Admin' | 'Yönetici' | 'Üye';

export interface Member {
    id: string;
    name: string;
    username: string;
    password: string;
    role: UserRole;
    status: 'Aktif' | 'Pasif';
    shopName?: string;
    email?: string;
}

export interface HistoryLog {
    id: string;
    item_name: string;
    item_type: string;
    old_buy?: string;
    old_sell?: string;
    new_buy?: string;
    new_sell?: string;
    user_name?: string;
    user_role?: string;
    item_group?: string; // 'altin' | 'doviz' | 'gumus'
    source?: string; // 'manuel' | 'api_otomatik' | 'toplu'
    batch_id?: string; // For grouping multiple updates in one session
    created_at: string;
}

export interface UserSession {
    id: string;
    member_id: string;
    login_time: string;
    logout_time: string | null;
    ip_address: string | null;
    device_info: string | null;
    is_active: boolean;
    // Joined member fields for UI:
    members?: { name: string; role: string };
}

export interface Activity {
    id: string;
    member_id: string | null;
    user_name: string;
    type: 'giris' | 'cikis' | 'fiyat' | 'sistem';
    icon: string;
    text_content: string;
    created_at: string;
}

export interface ExchangeContextType {
    rates: Rate[];
    tickerItems: TickerItem[];
    members: Member[];
    settings: Settings;
    liveRates: {
        has: string;
        ons: string;
        hasChange: string;
        onsChange: string;
    };
    historyLogs: HistoryLog[];
    sessions: UserSession[];
    activities: Activity[];
    currentUser: Member | null;
    updateSettings: (newSettings: Settings) => void;
    updateRates: (newRates: Rate[]) => void;
    updateTickerItems: (newItems: TickerItem[]) => void;
    updateMembers: (newMembers: Member[]) => void;
    updateMemberPassword: (memberId: string, newPassword: string) => Promise<boolean>;
    updateCurrentMemberProfile: (updates: { name: string; email?: string; shopName?: string }) => Promise<boolean>;
    clearHistory: () => Promise<void>;
    authenticateUser: (username: string, password: string) => Promise<{ success: boolean; error?: string; user?: Member }>;
    logoutUser: () => Promise<void>;
    lastUpdated: Date;
}

export const ExchangeContext = createContext<ExchangeContextType | undefined>(undefined);
const defaultSettings: Settings = {
    shopName: "COŞKUN SARRAFİYE",
    scrollingText: "Soma Sarraf ve Kuyumcular Derneği Tavsiye edilen perakende satış fiyatlarıdır.",
    infoPanelText: "Soma Sarraf ve Kuyumcular Derneği",
    isApiMode: false,
    margin: 0,
    displayFontSize: 100,
};

const defaultRates: Rate[] = [
    { id: 1, name: "24 Ayar (Has) Gram", buy: "3076.00", sell: "3082.00", type: 'gold', isVisible: true },
    { id: 2, name: "22 Ayar Bilezik", buy: "2820.00", sell: "2950.00", type: 'gold', isVisible: true },
    { id: 3, name: "18 Ayar", buy: "2250.00", sell: "2550.00", type: 'gold', isVisible: true },
    { id: 4, name: "14 Ayar", buy: "1750.00", sell: "2050.00", type: 'gold', isVisible: true },
    { id: 5, name: "Gram Altın", buy: "3076.00", sell: "3082.00", type: 'gold', isVisible: true },
    { id: 6, name: "Çeyrek Altın", buy: "5050.00", sell: "5150.00", type: 'gold', isVisible: true },
    { id: 7, name: "Yarım Altın", buy: "10100.00", sell: "10300.00", type: 'gold', isVisible: true },
    { id: 8, name: "Tam Altın", buy: "20200.00", sell: "20600.00", type: 'gold', isVisible: true },
    { id: 9, name: "Cumhuriyet Altını", buy: "20700.00", sell: "21100.00", type: 'gold', isVisible: true },
    { id: 10, name: "Ata Altın", buy: "20800.00", sell: "21200.00", type: 'gold', isVisible: true },
    { id: 11, name: "Gremse (2.5)", buy: "50500.00", sell: "51500.00", type: 'gold', isVisible: true },
    { id: 12, name: "Gümüş (Gram)", buy: "35.00", sell: "38.50", type: 'gold', isVisible: true },
    { id: 13, name: "Amerikan Doları", buy: "34.25", sell: "34.35", type: 'currency', isVisible: true },
    { id: 14, name: "Euro", buy: "36.80", sell: "36.95", type: 'currency', isVisible: true },
    { id: 15, name: "İngiliz Sterlini", buy: "42.50", sell: "43.10", type: 'currency', isVisible: true },
];

const defaultTickerItems: TickerItem[] = [
    { id: 1, name: 'Gram Altın', value: '7.076', change: '+2.56%', isUp: true, isVisible: true },
    { id: 2, name: 'Çeyrek', value: '11.955', change: '-0.41%', isUp: false, isVisible: true },
    { id: 3, name: 'Tam Altın', value: '47.675', change: '+0.41%', isUp: true, isVisible: true },
    { id: 4, name: 'USD/TRY', value: '43.7339', change: '+0.10%', isUp: true, isVisible: true },
    { id: 5, name: 'EUR/TRY', value: '51.8339', change: '-0.15%', isUp: false, isVisible: true },
];

const defaultMembers: Member[] = [
    { id: 'e87747e8-4673-4b68-8097-48f654032501', name: 'Admin User', username: 'admin', password: '1234', role: 'Admin', status: 'Aktif' },
];

export const ExchangeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [rates, setRates] = useState<Rate[]>(defaultRates);
    const [tickerItems, setTickerItems] = useState<TickerItem[]>(defaultTickerItems);
    const [members, setMembers] = useState<Member[]>(defaultMembers);
    const [settings, setSettings] = useState<Settings>(defaultSettings);
    const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<Member | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [liveRates, setLiveRates] = useState({
        has: '—',
        ons: '—',
        hasChange: '0.00',
        onsChange: '0.00'
    });

    // Load currentUser from localStorage on mount
    useEffect(() => {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            try {
                setCurrentUser(JSON.parse(savedUser));
            } catch (error) {
                console.error('Error parsing saved user:', error);
                localStorage.removeItem('currentUser');
            }
        }
    }, []);

    // Initial Data Fetch from Supabase
    useEffect(() => {
        let mounted = true;

        const fetchInitialData = async () => {
            try {
                // Fetch Settings
                const { data: settingsData, error: settingsError } = await supabase.from('settings').select('*').single();

                if (settingsError && settingsError.code !== 'PGRST116') {
                    console.error('Error fetching settings:', settingsError);
                }

                if (settingsData && mounted) {
                    setSettings({
                        shopName: settingsData.shop_name,
                        scrollingText: settingsData.scrolling_text,
                        infoPanelText: settingsData.info_panel_text,
                        isApiMode: settingsData.is_api_mode,
                        margin: settingsData.margin,
                        displayFontSize: settingsData.display_font_size || 100
                    });
                }

                // Fetch Rates
                const { data: ratesData, error: ratesError } = await supabase.from('rates').select('*').order('order_index');
                if (ratesError) console.error('Error fetching rates:', ratesError);

                if (ratesData && mounted) {
                    const mappedRates: Rate[] = ratesData.map((r: any) => ({
                        id: r.id,
                        name: r.name,
                        buy: r.buy,
                        sell: r.sell,
                        type: r.type as 'gold' | 'currency', // Map DB type to frontend type
                        change: r.change, // Map new change field
                        isVisible: r.is_visible !== false, // Default to true if null or undefined
                    }));
                    setRates(mappedRates);
                }

                // Fetch Ticker Items
                const { data: tickerData, error: tickerError } = await supabase.from('ticker_items').select('*').order('order_index');
                if (tickerError) console.error('Error fetching ticker items:', tickerError);

                if (tickerData && mounted) {
                    const mappedTickerItems: TickerItem[] = tickerData.map((t: any) => ({
                        id: t.id,
                        name: t.name,
                        value: t.value,
                        change: t.change,
                        isUp: t.is_up, // Correctly map is_up from DB to isUp in frontend
                        isVisible: t.is_visible !== false, // Default to true
                    }));
                    setTickerItems(mappedTickerItems);
                }

                // Fetch Members
                const { data: membersData, error: membersError } = await supabase.from('members').select('*');
                if (membersError) console.error('Error fetching members:', membersError);

                if (membersData && mounted) {
                    const mappedMembers = membersData.map((m: any) => ({
                        ...m,
                        shopName: m.shop_name
                    }));
                    setMembers(mappedMembers as Member[]);
                }

                // Fetch History Logs
                const { data: historyData, error: historyError } = await supabase.from('history_logs').select('*').order('created_at', { ascending: false }).limit(200);
                if (historyError) console.error('Error fetching history:', historyError);
                if (historyData && mounted) {
                    setHistoryLogs(historyData as HistoryLog[]);
                }

                // Fetch Sessions
                const { data: sessionsData, error: sessionsError } = await supabase
                    .from('user_sessions')
                    .select('*, members(name, role)')
                    .order('login_time', { ascending: false })
                    .limit(50);
                if (sessionsError) console.error('Error fetching sessions:', sessionsError);
                if (sessionsData && mounted) {
                    setSessions(sessionsData);
                }

                // Fetch Activities
                const { data: activitiesData, error: activitiesError } = await supabase
                    .from('activities')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(100);
                if (activitiesError) console.error('Error fetching activities:', activitiesError);
                if (activitiesData && mounted) {
                    setActivities(activitiesData);
                }
            } catch (error) {
                console.error('CRITICAL ERROR processing initial data:', error);
            }
        };

        fetchInitialData();

        // Realtime Subscription
        const channel = supabase.channel('schema-db-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public' },
                (_payload) => {
                    fetchInitialData();
                }
            )
            .subscribe();

        return () => {
            mounted = false;
            supabase.removeChannel(channel);
        };
    }, []);

    // Handle Tab Close / Browser Close
    useEffect(() => {
        const handleBeforeUnload = async () => {
            const sessionId = localStorage.getItem('currentSessionId');
            if (sessionId) {
                // Determine if we should optionally keep them logged in across sessions (e.g. remember me).
                // But specifically for 'online' status tracking, the session is no longer 'active' if the tab closes.
                // We use navigator.sendBeacon as it's more reliable during page unload than standard fetch/supabase client

                // Construct the payload for Supabase REST API
                const url = `${import.meta.env.VITE_SUPABASE_URL || 'https://your-supabase-url.supabase.co'}/rest/v1/user_sessions?id=eq.${sessionId}`;
                const payload = JSON.stringify({ is_active: false, logout_time: new Date().toISOString() });
                const headers = {
                    type: 'application/json',
                };

                // To do an update via REST we need the anon key
                const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

                const blob = new Blob([payload], headers);
                navigator.sendBeacon(`${url}&apikey=${apikey}`, blob);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);


    // Live Rates from backend proxy (finans.truncgil.com via localhost:5000)
    useEffect(() => {
        const fetchLiveRates = async () => {
            try {
                // Try backend proxy first
                let data;
                try {
                    const response = await fetch('http://localhost:5000/api/live-rates');
                    if (response.ok) {
                        data = await response.json();
                    }
                } catch (e) {
                    console.warn('Backend proxy unavailable for live rates, trying direct...');
                }

                // Fallback to direct API if backend is down
                if (!data) {
                    const response = await fetch('https://finans.truncgil.com/v4/today.json');
                    const raw = await response.json();
                    if (raw) {
                        let hasVal = raw.HAS?.Selling;
                        let hasChange = raw.HAS?.Change || '0.00';
                        let onsVal = raw.ONS?.Selling;
                        let onsChange = raw.ONS?.Change || '0.00';
                        const usdVal = raw.USD?.Selling;

                        if ((!onsVal || onsVal == 0) && hasVal && usdVal) {
                            onsVal = (parseFloat(hasVal) * 31.1035) / parseFloat(usdVal);
                            onsChange = '0.00';
                        }

                        data = {
                            has: hasVal ? parseFloat(hasVal).toFixed(2) : '—',
                            ons: onsVal ? parseFloat(onsVal).toFixed(2) : '—',
                            hasChange: hasChange.toString(),
                            onsChange: onsChange.toString()
                        };
                    }
                }

                if (data) {
                    setLiveRates({
                        has: data.has || '—',
                        ons: data.ons || '—',
                        hasChange: data.hasChange || '0.00',
                        onsChange: data.onsChange || '0.00'
                    });
                }
            } catch (error) {
                console.error('Error fetching live rates:', error);
            }
        };

        fetchLiveRates();
        const interval = setInterval(fetchLiveRates, 10000); // 10s update
        return () => clearInterval(interval);
    }, []);

    const updateSettings = async (newSettings: Settings) => {
        setSettings(newSettings);
        try {
            const { error } = await supabase.from('settings').update({
                shop_name: newSettings.shopName,
                scrolling_text: newSettings.scrollingText,
                info_panel_text: newSettings.infoPanelText,
                is_api_mode: newSettings.isApiMode,
                margin: newSettings.margin,
                display_font_size: newSettings.displayFontSize
            }).eq('id', 1);

            if (error) {
                console.error('Error updating settings:', error);
            }
        } catch (error) {
            console.error('Unexpected error updating settings:', error);
        }
    };

    const updateRates = async (newRates: Rate[]) => {
        // Compare newRates with old rates to generate history logs
        const historyInserts: any[] = [];
        const activityInserts: any[] = [];
        const batchId = crypto.randomUUID();

        newRates.forEach(newR => {
            const oldR = rates.find(r => r.id === newR.id || (r.name === newR.name && newR.id === undefined));
            if (oldR) {
                if (oldR.buy !== newR.buy || oldR.sell !== newR.sell) {
                    historyInserts.push({
                        item_name: newR.name,
                        item_type: newR.type, // 'gold' | 'currency'
                        old_buy: oldR.buy || null,
                        old_sell: oldR.sell || null,
                        new_buy: newR.buy || null,
                        new_sell: newR.sell || null,
                        user_name: currentUser ? currentUser.name : 'Sistem',
                        user_role: currentUser ? currentUser.role : 'sistem',
                        item_group: newR.type === 'gold' && newR.name.toLowerCase().includes('gümüş') ? 'gumus' : (newR.type === 'gold' ? 'altin' : 'doviz'),
                        source: currentUser ? 'manuel' : 'api_otomatik',
                        batch_id: batchId
                    });

                    if (currentUser) {
                        activityInserts.push({
                            member_id: currentUser.id,
                            user_name: currentUser.name,
                            type: 'fiyat',
                            icon: '✏️',
                            text_content: `<span class="ak-isim">${currentUser.name}</span> → <span class="ak-urun">${newR.name}</span> güncelledi: Alış ${oldR.buy}→${newR.buy}, Satış ${oldR.sell}→${newR.sell}`,
                        });
                    }
                }
            }
        });

        setRates(newRates);
        setLastUpdated(new Date());

        try {
            // 1. Get all existing IDs from DB to identify deletions
            const { data: existingRates } = await supabase.from('rates').select('id');
            const existingIds = existingRates?.map((r: any) => r.id) || [];
            const newIds = newRates.map(r => r.id).filter(id => id !== undefined);

            // 2. Find IDs to delete (exist in DB but not in new list)
            const idsToDelete = existingIds.filter(id => !newIds.includes(id));

            // 3. Delete them
            if (idsToDelete.length > 0) {
                const { error: deleteError } = await supabase.from('rates').delete().in('id', idsToDelete);
                if (deleteError) {
                    console.error('Error deleting rates:', deleteError);
                    alert('Silme işlemi sırasında hata oluştu: ' + deleteError.message);
                }
            }

            // 4. Map for Upsert
            const dbRates = newRates.map((r, index) => ({
                id: r.id, // Keep existing ID if present
                name: r.name,
                buy: r.buy,
                sell: r.sell,
                type: r.type,
                order_index: index + 1,
                is_visible: r.isVisible,
                change: r.change // Add change field to persistence
            }));

            const { error } = await supabase.from('rates').upsert(dbRates);
            if (error) {
                console.error('Error updating rates:', error);
                if (error.code === '42703') { // Undefined column
                    // Fallback if I missed something, but I commented out the field above
                    alert('Veritabanı şeması hatası: ' + error.message);
                } else {
                    alert('Fiyatlar kaydedilirken hata oluştu: ' + error.message);
                }
            } else {
                // Determine success message
                let message = 'Tüm değişiklikler başarıyla kaydedildi!';
                if (historyInserts.length > 0) {
                    const { error: histError } = await supabase.from('history_logs').insert(historyInserts);
                    if (histError) {
                        console.error('Error saving history logs:', histError);
                        message += ' Ancak geçmiş kaydedilirken hata oluştu.';
                    }
                }
                if (activityInserts.length > 0) {
                    const { error: actError } = await supabase.from('activities').insert(activityInserts);
                    if (actError) console.error('Error saving activities:', actError);
                }
            }
        } catch (error: any) {
            console.error('Unexpected error updating rates:', error);
            alert('Beklenmedik hata: ' + error.message);
        }
    };

    const updateTickerItems = async (newItems: TickerItem[]) => {
        const historyInserts: any[] = [];
        const activityInserts: any[] = [];
        newItems.forEach(newI => {
            const oldI = tickerItems.find(i => i.id === newI.id || (i.name === newI.name && newI.id === undefined));
            if (oldI) {
                if (oldI.value !== newI.value) {
                    historyInserts.push({
                        item_name: newI.name,
                        item_type: 'ticker', // identify as alt bant
                        old_buy: oldI.value || null,
                        old_sell: null,
                        new_buy: newI.value || null,
                        new_sell: null
                    });
                }
            }
        });

        setTickerItems(newItems);
        setLastUpdated(new Date());

        try {
            // 1. Get all existing IDs from DB to identify deletions
            const { data: existingItems } = await supabase.from('ticker_items').select('id');
            const existingIds = existingItems?.map((t: any) => t.id) || [];
            const newIds = newItems.map(t => t.id).filter(id => id !== undefined);

            // 2. Find IDs to delete
            const idsToDelete = existingIds.filter(id => !newIds.includes(id));

            // 3. Delete them
            if (idsToDelete.length > 0) {
                const { error: deleteError } = await supabase.from('ticker_items').delete().in('id', idsToDelete);
                if (deleteError) {
                    console.error('Error deleting ticker items:', deleteError);
                    alert('Silme işlemi sırasında hata oluştu: ' + deleteError.message);
                }
            }

            // 4. Upsert remaining items
            const dbItems = newItems.map((item, index) => ({
                id: item.id, // Keep existing ID
                name: item.name,
                value: item.value,
                change: item.change,
                is_up: item.isUp,
                order_index: index + 1,
                is_visible: item.isVisible // Map frontend isVisible to DB is_visible
            }));

            const { error } = await supabase.from('ticker_items').upsert(dbItems);
            if (error) {
                console.error('Error updating ticker items:', error);
                if (error.code === '42703') { // Undefined column
                    alert('Veritabanı şeması eksik! Lütfen "ticker_items" tablosuna "is_visible" (boolean) sütununu ekleyin.');
                } else {
                    alert('Alt bant verileri kaydedilirken hata oluştu: ' + error.message);
                }
            } else {
                if (historyInserts.length > 0) {
                    const { error: histError } = await supabase.from('history_logs').insert(historyInserts);
                    if (histError) console.error('Error saving history logs:', histError);
                }
                if (activityInserts.length > 0) {
                    const { error: actError } = await supabase.from('activities').insert(activityInserts);
                    if (actError) console.error('Error saving activities:', actError);
                }
            }
        } catch (error: any) {
            console.error('Unexpected error updating ticker items:', error);
            alert('Beklenmedik hata: ' + error.message);
        }
    };

    const updateMembers = async (newMembers: Member[]) => {
        setMembers(newMembers);
        try {
            const dbMembers = newMembers.map((m) => {
                const { shopName, ...rest } = m;
                return {
                    ...rest,
                    shop_name: shopName
                };
            });
            const { error } = await supabase.from('members').upsert(dbMembers, { onConflict: 'username' });
            if (error) {
                console.error('Error updating members:', error);
                alert('Üyeler kaydedilirken hata oluştu: ' + error.message);
            } else {
                console.log('Members updated successfully in Supabase');
            }
        } catch (error) {
            console.error('Unexpected error updating members:', error);
            alert('Bir hata oluştu: ' + error);
        }
    };

    const updateMemberPassword = async (memberId: string, newPassword: string): Promise<boolean> => {
        try {
            const { error } = await supabase.from('members').update({ password: newPassword }).eq('id', memberId);
            if (error) {
                console.error('Error updating password:', error);
                return false;
            }
            // Update local state
            setMembers(prev => prev.map(m => m.id === memberId ? { ...m, password: newPassword } : m));
            return true;
        } catch (error) {
            console.error('Unexpected error updating password:', error);
            return false;
        }
    };

    const updateCurrentMemberProfile = async (updates: { name: string; email?: string; shopName?: string }): Promise<boolean> => {
        if (!currentUser) return false;
        try {
            const { error } = await supabase.from('members').update({
                name: updates.name,
                email: updates.email,
                shop_name: updates.shopName
            }).eq('id', currentUser.id);

            if (error) {
                console.error('Error updating profile:', error);
                return false;
            }

            const updatedMember = { ...currentUser, name: updates.name, email: updates.email, shopName: updates.shopName };
            setCurrentUser(updatedMember);
            localStorage.setItem('currentUser', JSON.stringify(updatedMember));
            setMembers(prev => prev.map(m => m.id === currentUser.id ? updatedMember : m));
            return true;
        } catch (error) {
            console.error('Unexpected error updating profile:', error);
            return false;
        }
    };

    const clearHistory = async () => {
        try {
            const { error } = await supabase.from('history_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
            if (error) throw error;
            setHistoryLogs([]);
        } catch (error) {
            console.error('Error clearing history:', error);
            alert('Geçmiş temizlenirken hata oluştu.');
        }
    };

    const authenticateUser = async (username: string, password: string): Promise<{ success: boolean; error?: string; user?: Member }> => {
        const member = members.find(m => m.username === username);
        if (!member) {
            return { success: false, error: 'Kullanıcı bulunamadı!' };
        }
        if (member.password !== password) {
            return { success: false, error: 'Hatalı şifre!' };
        }
        if (member.status === 'Pasif') {
            return { success: false, error: 'Hesabınız pasif durumdadır. Yöneticinizle iletişime geçin.' };
        }

        setCurrentUser(member);
        localStorage.setItem('currentUser', JSON.stringify(member));

        // Use Auth Helpers for session tracking and presence
        try {
            const sessionData = await onMemberLogin(member);
            if (sessionData?.id) {
                localStorage.setItem('currentSessionId', sessionData.id);
            }
        } catch (e) {
            console.error('Error logging session/activity/presence', e);
        }

        return { success: true, user: member };
    };

    const logoutUser = async () => {
        if (currentUser) {
            const sessionId = localStorage.getItem('currentSessionId');
            try {
                // Use Auth Helpers to clear session and presence tracking
                await onMemberLogout(currentUser, sessionId);
            } catch (e) {
                console.error('Error closing session/presence', e);
            }
        }

        setCurrentUser(null);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentSessionId');
    };

    return (
        <ExchangeContext.Provider value={{
            rates,
            tickerItems,
            members,
            settings,
            liveRates,
            historyLogs,
            sessions,
            activities,
            currentUser,
            updateSettings,
            updateRates,
            updateTickerItems,
            updateMembers,
            updateMemberPassword,
            updateCurrentMemberProfile,
            clearHistory,
            authenticateUser,
            logoutUser,
            lastUpdated
        }}>
            {children}
        </ExchangeContext.Provider>
    );
};
