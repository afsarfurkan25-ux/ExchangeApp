import { supabase } from '../supabaseClient';
import React, { useState, useEffect, type ReactNode, createContext, useMemo, useCallback } from 'react';
import { onMemberLogin, onMemberLogout } from '../lib/authHelpers';
import * as bcrypt from 'bcryptjs';

// Define types
export interface Rate {
    id?: number;
    name: string;
    buy: string;
    sell: string;
    type: 'gold' | 'currency';
    change?: string; // Percentage change
    isVisible?: boolean; // New visibility toggle
    isStale?: boolean; // Kaynak piyasa kapalıyken true (ingestion servisi işaretler)
    liveSymbol?: string | null;   // Bu satırı besleyen canlı sembol (null = manuel)
    isManual?: boolean;           // Satır kilidi: otomasyon dokunmaz
    marginType?: 'percent' | 'amount' | null;
    marginBuy?: number | null;   // Alış marjı: Alış = bid − marj
    marginSell?: number | null;  // Satış marjı: Satış = ask + marj
}

export interface Settings {
    shopName: string;
    scrollingText: string;
    infoPanelText: string; // New field for the top info panel
    isApiMode: boolean;
    margin: number; // Percentage or fixed amount
    displayFontSize: number; // Percentage scale (e.g., 100, 110, 120)
    qrUrl?: string; // QR code URL
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
    organization_id?: string;
    app_role?: 'admin' | 'user';
}

/** Ingestion servisinin yazdığı ham piyasa kotası (marj uygulanmamış). */
export interface LiveMarketRate {
    symbol: string;
    bid: number;
    ask: number;
    change_pct: number | null;
    category: string | null;
    source: string;
    is_stale: boolean;
    fetched_at: string;
    updated_at: string;
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

// Pano ekranı için zorunlu, açılışta yüklenen tablolar
type CoreTable = 'settings' | 'rates' | 'ticker_items' | 'live_rates';

// Yalnızca ilgili panel açıldığında yüklenen tablolar
export type LazyTable = 'members' | 'history_logs' | 'user_sessions' | 'activities';

export interface ExchangeContextType {
    rates: Rate[];
    tickerItems: TickerItem[];
    members: Member[];
    settings: Settings;
    liveMarketRates: LiveMarketRate[];
    updateRateMargin: (rateId: number, marginType: 'percent' | 'amount', marginBuy: number, marginSell: number) => Promise<boolean>;
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
    /** İlgili panel açıldığında ihtiyaç duyduğu tabloları yükler. */
    refreshTables: (tables: LazyTable[]) => Promise<void>;
    authenticateUser: (username: string, password: string) => Promise<{ success: boolean; error?: string; user?: Member }>;
    logoutUser: () => Promise<void>;
    lastUpdated: Date;
    isOffline: boolean;
    isAuthChecking: boolean; // <-- IMPORTANT
}

export const ExchangeContext = createContext<ExchangeContextType | undefined>(undefined);
const defaultSettings: Settings = {
    shopName: "COŞKUN SARRAFİYE",
    scrollingText: "Soma Sarraf ve Kuyumcular Derneği Tavsiye edilen perakende satış fiyatlarıdır.",
    infoPanelText: "Soma Sarraf ve Kuyumcular Derneği",
    isApiMode: false,
    margin: 0,
    displayFontSize: 100,
    qrUrl: "",
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

export const ExchangeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [rates, setRates] = useState<Rate[]>(defaultRates);
    const [tickerItems, setTickerItems] = useState<TickerItem[]>(defaultTickerItems);
    // Üyeler yalnızca yönetim panelleri açıldığında yüklenir (refreshTables)
    const [members, setMembers] = useState<Member[]>([]);
    const [settings, setSettings] = useState<Settings>(defaultSettings);
    const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);
    const [liveMarketRates, setLiveMarketRates] = useState<LiveMarketRate[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<Member | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    // Alt şeritteki HAS/ONS değerleri artık live_rates tablosundan türetiliyor;
    // eskiden localhost proxy üzerinden truncgil'e gidiliyordu.
    const liveRates = useMemo(() => {
        const pick = (symbol: string) => liveMarketRates.find(l => l.symbol === symbol);
        const has = pick('HAS');
        const ons = pick('ONS');
        const fmt = (n: number | undefined) => (n === undefined ? '—' : n.toFixed(2));
        const pct = (n: number | null | undefined) => (n === null || n === undefined ? '0.00' : n.toFixed(2));
        return {
            has: fmt(has?.ask),
            ons: fmt(ons?.ask),
            hasChange: pct(has?.change_pct),
            onsChange: pct(ons?.change_pct),
        };
    }, [liveMarketRates]);

    // Offline status listeners
    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const [isAuthChecking, setIsAuthChecking] = useState(true);

    // Load currentUser from localStorage on mount and verify session against DB to prevent bypass
    useEffect(() => {
        const checkSession = async () => {
            const savedUserStr = localStorage.getItem('currentUser');
            const sessionId = localStorage.getItem('currentSessionId');

            if (savedUserStr && sessionId) {
                try {
                    const savedUser = JSON.parse(savedUserStr);
                    // Veritabanından bu oturumun hala aktif olup olmadığını kontrol et
                    const { data } = await supabase
                        .from('user_sessions')
                        .select('is_active')
                        .eq('id', sessionId)
                        .single();

                    if (data && data.is_active) {
                        setCurrentUser(savedUser);
                    } else {
                        // Bypass tespiti veya oturum kapatılmış
                        localStorage.removeItem('currentUser');
                        localStorage.removeItem('currentSessionId');
                        setCurrentUser(null);
                    }
                } catch (error) {
                    console.error('Error parsing or verifying session:', error);
                    localStorage.removeItem('currentUser');
                    localStorage.removeItem('currentSessionId');
                }
            } else if (savedUserStr && !sessionId) {
                // Sadece username var ama session yok (Bypass girişimi)
                localStorage.removeItem('currentUser');
            }
            setIsAuthChecking(false);
        };

        checkSession();
    }, []);

    // ─── Veri Yükleme ────────────────────────────────────────────────────────
    // Çekirdek tablolar (settings/rates/ticker_items) pano ekranının çalışması
    // için şarttır; açılışta yüklenir ve realtime ile güncel tutulur.
    // Diğerleri (üyeler, loglar, oturumlar, aktiviteler) yalnızca onları
    // gösteren panel açıldığında refreshTables() ile çekilir.

    const fetchSettings = useCallback(async () => {
        const { data, error } = await supabase.from('settings').select('*').single();
        // PGRST116 = hiç kayıt yok; ilk kurulumda normal
        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching settings:', error);
            return;
        }
        if (data) {
            setSettings({
                shopName: data.shop_name,
                scrollingText: data.scrolling_text,
                infoPanelText: data.info_panel_text,
                isApiMode: data.is_api_mode,
                margin: data.margin,
                displayFontSize: data.display_font_size || 100,
                qrUrl: data.qr_url || ""
            });
        }
    }, []);

    const fetchRates = useCallback(async () => {
        const { data, error } = await supabase.from('rates').select('*').order('order_index');
        if (error) { console.error('Error fetching rates:', error); return; }
        if (data) {
            setRates(data.map((r: any) => ({
                id: r.id,
                name: r.name,
                buy: r.buy,
                sell: r.sell,
                type: r.type as 'gold' | 'currency',
                change: r.change,
                isVisible: r.is_visible !== false,
                isStale: r.is_stale === true,
                liveSymbol: r.live_symbol ?? null,
                isManual: r.is_manual === true,
                marginType: r.margin_type ?? null,
                marginBuy: r.margin_buy ?? null,
                marginSell: r.margin_sell ?? null,
            })));
        }
    }, []);

    const fetchTickerItems = useCallback(async () => {
        const { data, error } = await supabase.from('ticker_items').select('*').order('order_index');
        if (error) { console.error('Error fetching ticker items:', error); return; }
        if (data) {
            setTickerItems(data.map((t: any) => ({
                id: t.id,
                name: t.name,
                value: t.value,
                change: t.change,
                isUp: t.is_up,
                isVisible: t.is_visible !== false,
            })));
        }
    }, []);

    const fetchLiveMarketRates = useCallback(async () => {
        const { data, error } = await supabase.from('live_rates').select('*');
        if (error) {
            // Tablo henüz kurulmadıysa (ingestion devreye alınmadan önce) sessiz geç
            if (error.code !== '42P01') console.error('Error fetching live rates:', error);
            return;
        }
        if (data) setLiveMarketRates(data as LiveMarketRate[]);
    }, []);

    const fetchMembers = useCallback(async () => {
        const { data, error } = await supabase.from('members').select('*');
        if (error) { console.error('Error fetching members:', error); return; }
        if (data) setMembers(data.map((m: any) => ({ ...m, shopName: m.shop_name })) as Member[]);
    }, []);

    const fetchHistoryLogs = useCallback(async () => {
        const { data, error } = await supabase
            .from('history_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);
        if (error) { console.error('Error fetching history:', error); return; }
        if (data) setHistoryLogs(data as HistoryLog[]);
    }, []);

    const fetchSessions = useCallback(async () => {
        const { data, error } = await supabase
            .from('user_sessions')
            .select('*, members(name, role)')
            .order('login_time', { ascending: false })
            .limit(50);
        if (error) { console.error('Error fetching sessions:', error); return; }
        if (data) setSessions(data);
    }, []);

    const fetchActivities = useCallback(async () => {
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
        if (error) { console.error('Error fetching activities:', error); return; }
        if (data) setActivities(data);
    }, []);

    const refreshCore = useCallback(async (table?: CoreTable) => {
        const jobs: Promise<void>[] = [];
        if (!table || table === 'settings') jobs.push(fetchSettings());
        if (!table || table === 'rates') jobs.push(fetchRates());
        if (!table || table === 'ticker_items') jobs.push(fetchTickerItems());
        if (!table || table === 'live_rates') jobs.push(fetchLiveMarketRates());
        await Promise.all(jobs);
    }, [fetchSettings, fetchRates, fetchTickerItems, fetchLiveMarketRates]);

    // Panellerin ihtiyaç duyduklarını açıkça istemesi için.
    const refreshTables = useCallback(async (tables: LazyTable[]) => {
        await Promise.all(tables.map((t) => {
            switch (t) {
                case 'members': return fetchMembers();
                case 'history_logs': return fetchHistoryLogs();
                case 'user_sessions': return fetchSessions();
                case 'activities': return fetchActivities();
            }
        }));
    }, [fetchMembers, fetchHistoryLogs, fetchSessions, fetchActivities]);

    useEffect(() => {
        const init = async () => {
            // Electron'da önce yerel önbellek, sonra ağ
            if (window.electronAPI) {
                try {
                    const [savedRates, savedTicker, savedSettings, savedLastUpdated] = await Promise.all([
                        window.electronAPI.storeGet('rates'),
                        window.electronAPI.storeGet('tickerItems'),
                        window.electronAPI.storeGet('settings'),
                        window.electronAPI.storeGet('lastUpdated'),
                    ]);
                    if (savedRates) setRates(savedRates);
                    if (savedTicker) setTickerItems(savedTicker);
                    if (savedSettings) setSettings(savedSettings);
                    if (savedLastUpdated) setLastUpdated(new Date(savedLastUpdated));
                } catch (e) {
                    console.error('Error loading from store:', e);
                }
            }
            refreshCore();
        };

        init();

        // Realtime yalnızca çekirdek tablolarda. Önceden tüm public şeması
        // dinleniyordu; her presence ping'i bütün istemcilere yayılıyordu.
        const realtimeOk = { current: false };

        const channel = supabase.channel('exchange-core')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => refreshCore('settings'))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rates' }, () => refreshCore('rates'))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ticker_items' }, () => refreshCore('ticker_items'))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'live_rates' }, () => refreshCore('live_rates'))
            .on('broadcast', { event: 'data-update' }, () => refreshCore())
            .subscribe((status) => {
                realtimeOk.current = status === 'SUBSCRIBED';
                if (status !== 'SUBSCRIBED') console.warn('Supabase realtime durumu:', status);
            });

        // Yalnızca realtime kopuksa devreye giren yedek yoklama.
        const pollInterval = setInterval(() => {
            if (!realtimeOk.current && navigator.onLine) {
                console.warn('Realtime bağlantısı yok, çekirdek veriler yoklanıyor...');
                refreshCore();
            }
        }, 60000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(pollInterval);
        };
    }, [refreshCore]);

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
    const updateSettings = useCallback(async (newSettings: Settings) => {
        setSettings(newSettings);
        if (window.electronAPI) {
            window.electronAPI.storeSet('settings', newSettings);
        }
        try {
            const { error } = await supabase.from('settings').update({
                shop_name: newSettings.shopName,
                scrolling_text: newSettings.scrollingText,
                info_panel_text: newSettings.infoPanelText,
                is_api_mode: newSettings.isApiMode,
                margin: newSettings.margin,
                display_font_size: newSettings.displayFontSize,
                qr_url: newSettings.qrUrl
            }).eq('id', 1);

            if (error) {
                console.error('Error updating settings:', error);
            } else {
                // Broadcast update to other clients
                supabase.channel('exchange-app-changes').send({
                    type: 'broadcast',
                    event: 'data-update',
                    payload: { type: 'settings' }
                });
            }
        } catch (error) {
            console.error('Unexpected error updating settings:', error);
        }
    }, []);

    const updateRates = useCallback(async (newRates: Rate[]) => {
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
        if (window.electronAPI) {
            window.electronAPI.storeSet('rates', newRates);
            window.electronAPI.storeSet('lastUpdated', new Date().toISOString());
        }

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

                // Broadcast update to other clients
                supabase.channel('exchange-app-changes').send({
                    type: 'broadcast',
                    event: 'data-update',
                    payload: { type: 'rates' }
                });
            }
        } catch (error: any) {
            console.error('Unexpected error updating rates:', error);
            alert('Beklenmedik hata: ' + error.message);
        }
    }, [rates, currentUser]);

    const updateTickerItems = useCallback(async (newItems: TickerItem[]) => {
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
        if (window.electronAPI) {
            window.electronAPI.storeSet('tickerItems', newItems);
            window.electronAPI.storeSet('lastUpdated', new Date().toISOString());
        }

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

                // Broadcast update to other clients
                supabase.channel('exchange-app-changes').send({
                    type: 'broadcast',
                    event: 'data-update',
                    payload: { type: 'ticker' }
                });
            }
        } catch (error: any) {
            console.error('Unexpected error updating ticker items:', error);
            alert('Beklenmedik hata: ' + error.message);
        }
    }, [tickerItems]);

    const updateMembers = useCallback(async (newMembers: Member[]) => {
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
    }, []);

    const updateMemberPassword = useCallback(async (memberId: string, newPassword: string): Promise<boolean> => {
        try {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            const { error } = await supabase.from('members').update({ password: hashedPassword }).eq('id', memberId);
            if (error) {
                console.error('Error updating password:', error);
                return false;
            }
            // Update local state with the hashed password
            setMembers(prev => prev.map(m => m.id === memberId ? { ...m, password: hashedPassword } : m));
            return true;
        } catch (error) {
            console.error('Unexpected error updating password:', error);
            return false;
        }
    }, []);

    const updateCurrentMemberProfile = useCallback(async (updates: { name: string; email?: string; shopName?: string }): Promise<boolean> => {
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
    }, [currentUser]);

    const clearHistory = useCallback(async () => {
        try {
            const { error } = await supabase.from('history_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
            if (error) throw error;
            setHistoryLogs([]);
        } catch (error) {
            console.error('Error clearing history:', error);
            alert('Geçmiş temizlenirken hata oluştu.');
        }
    }, []);

    /**
     * Bir kur satırının marjını günceller. Yalnızca Admin/Yönetici.
     * Değeri ingestion servisi bir sonraki turunda (varsayılan 5 sn) uygular;
     * marjlı fiyat rates tablosundan realtime ile geri gelir.
     */
    const updateRateMargin = useCallback(async (
        rateId: number,
        marginType: 'percent' | 'amount',
        marginBuy: number,
        marginSell: number
    ): Promise<boolean> => {
        if (currentUser?.role !== 'Admin' && currentUser?.role !== 'Yönetici') {
            console.warn('Marj değiştirme yetkisi yok.');
            return false;
        }
        // Negatif değere izin var: marjı ters yöne kaydırmak isteyen olabilir
        // (alış marjı -10 => bid + 10). Sadece sayı olmasını şart koşuyoruz.
        if (!Number.isFinite(marginBuy) || !Number.isFinite(marginSell)) {
            console.warn('Marj sayısal olmalı.');
            return false;
        }

        const { error } = await supabase
            .from('rates')
            .update({ margin_type: marginType, margin_buy: marginBuy, margin_sell: marginSell })
            .eq('id', rateId);

        if (error) {
            console.error('Marj güncellenemedi:', error);
            return false;
        }

        setRates(prev => prev.map(r =>
            r.id === rateId ? { ...r, marginType, marginBuy, marginSell } : r
        ));
        return true;
    }, [currentUser]);

    const authenticateUser = useCallback(async (username: string, password: string): Promise<{ success: boolean; error?: string; user?: Member }> => {
        // Üye listesi artık önden indirilmiyor; yalnızca giriş yapan kişinin
        // kaydı sorgulanır. .eq() değeri kaçışlar, PostgREST filtresine
        // kullanıcı girdisi enjekte edilemez.
        const lookup = async (column: 'username' | 'email') => {
            const { data, error } = await supabase
                .from('members')
                .select('*')
                .eq(column, username)
                .limit(1);
            if (error) {
                console.error(`Error looking up member by ${column}:`, error);
                return null;
            }
            return data?.[0] ?? null;
        };

        const row = (await lookup('username')) ?? (await lookup('email'));
        if (!row) {
            return { success: false, error: 'Kullanıcı bulunamadı!' };
        }
        const member: Member = { ...row, shopName: row.shop_name };
        if (member.status === 'Pasif') {
            return { success: false, error: 'Hesabınız pasif durumdadır. Yöneticinizle iletişime geçin.' };
        }

        const memberEmail = member.email || `${member.username}@kurmatik.local`;

        // 1. ONAYLI/GÜVENLİ GİRİŞ (Supabase Auth)
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: memberEmail,
            password: password,
        });

        // Supabase Auth başarılıysa, kullanıcı tamamen göç etmiştir ve şifresi doğrudur.
        if (authData.user && authData.session) {
            setCurrentUser(member);
            localStorage.setItem('currentUser', JSON.stringify(member));
            localStorage.setItem('currentSessionId', authData.session.access_token);

            try {
                await onMemberLogin(member);
            } catch (e) { }

            return { success: true, user: member };
        }

        // Hesabı varsa ama e-postası doğrulanmamışsa (Gelecek kullanımlar için e-mail teyidi aktif edilirse)
        if (authError && authError.message.includes('Email not confirmed')) {
            return { success: false, error: 'Lütfen mailinizi doğrulayın.' };
        }

        // 2. MIGRATION (GÖÇ) ve LEGACY DESTEĞİ
        // Eğer Supabase bu şifreyi kabul etmediyse, eski "members" tablosundaki şifreyi kontrol edeceğiz.
        const isHashed = member.password?.startsWith('$2');
        let passwordMatch = false;
        if (isHashed) {
            passwordMatch = await bcrypt.compare(password, member.password);
        } else {
            passwordMatch = member.password === password;
        }

        // Eğer eski şifre de yanlışsa girişi tamamen reddet
        if (!passwordMatch) {
            return { success: false, error: 'Kullanıcı adı veya şifre hatalı!' };
        }

        // ESKİ ŞİFRE DOĞRU (Legacy kullanıcı başarılı giriş yaptı)
        // BUG FIX & MIGRATION: 
        // Kullanıcı Supabase'e daha önce göç etmiş DEĞİLSE arka planda güvenli tarafa kaydettir.
        try {
            const { error: signUpErr } = await supabase.auth.signUp({
                email: memberEmail,
                password: password,
            });

            // Eğer Supabase "User already registered" diyorsa o zaman kullanıcı GÖÇ ETMİŞTİR!
            // Ama yukarıdaki adımda `signInWithPassword` BAŞARISIZ OLMUŞTU!
            // Bu demektir ki: Kullanıcı Supabase şifresini değiştirmiş, ama sitemiz eski (değişmemiş) members şifresine kanıp içeri alıyor.
            // Bu güvenlik zafiyetini engellemek için girişi reddet ve güncel şifre iste!
            if (signUpErr && signUpErr.message.includes('already registered')) {
                return {
                    success: false,
                    error: 'Hesabınız yeni güvenliğe taşındığı için eski şifreniz geçersizdir. Lütfen en güncel (yeni) şifrenizi giriniz.'
                };
            }
        } catch (e) {
            console.error('Arka planda göç/migration başarısız:', e);
        }

        // Güvenlik adımını geçen veya başarıyla arka planda Supabase'e kaydedilen eski üyeyi içeri al.
        setCurrentUser(member);
        localStorage.setItem('currentUser', JSON.stringify(member));

        try {
            const sessionData = await onMemberLogin(member);
            if (sessionData?.id) {
                localStorage.setItem('currentSessionId', sessionData.id);
            }
        } catch (e) {
            console.error('Session logging error:', e);
        }

        return { success: true, user: member };
    }, []);

    const logoutUser = useCallback(async () => {
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
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentSessionId');
    }, [currentUser]);

    const contextValue = useMemo(() => ({
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
        refreshTables,
        liveMarketRates,
        updateRateMargin,
        authenticateUser,
        logoutUser,
        lastUpdated,
        isOffline,
        isAuthChecking
    }), [rates, tickerItems, members, settings, liveRates, historyLogs, sessions, activities, currentUser, lastUpdated, isOffline, isAuthChecking, updateSettings, updateRates, updateTickerItems, updateMembers, updateMemberPassword, updateCurrentMemberProfile, clearHistory, refreshTables, liveMarketRates, updateRateMargin, authenticateUser, logoutUser]);

    return (
        <ExchangeContext.Provider value={contextValue}>
            {children}
        </ExchangeContext.Provider>
    );
};
