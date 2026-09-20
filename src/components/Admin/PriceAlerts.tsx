import React, { useState, useEffect, useCallback, useRef } from 'react';
import './PriceAlerts.css';
import type { LiveMarketRate } from '../../context/ExchangeContext';

interface PriceAlertsProps {
    /** Ingestion servisinin yazdığı ham piyasa kotaları (live_rates tablosu). */
    liveRates: LiveMarketRate[];
    lastUpdate: Date | null;
    error?: string | null;
}

interface Alarm {
    id: number;
    key: string;
    threshUp: number | null;
    threshDown: number | null;
    notifs: string[];
    active: boolean;
    createdAt: Date;
    lastTriggered: Date | null;
}

interface AlarmLogItem {
    name: string;
    direction: 'up' | 'down';
    prev: number;
    current: number;
    thresh: number;
    time: Date;
}

interface ProductInfo {
    key: string;
    name: string;
    cat: string;
    current: number;
    prev: number | null;
    change: number;
}

const PriceAlerts: React.FC<PriceAlertsProps> = ({ liveRates, lastUpdate, error }) => {
    // State
    const [prices, setPrices] = useState<{ [key: string]: ProductInfo }>({});
    const [alarms, setAlarms] = useState<Alarm[]>([]);
    const [alarmLog, setAlarmLog] = useState<AlarmLogItem[]>([]);
    const [totalTriggered, setTotalTriggered] = useState(0);
    const [countdownVal, setCountdownVal] = useState(30);
    const [popupQueue, setPopupQueue] = useState<any[]>([]);
    const [isPopupShowing, setIsPopupShowing] = useState(false);
    const [currentPopup, setCurrentPopup] = useState<any>(null);
    const isNotificationSupported = typeof window !== 'undefined' && 'Notification' in window;
    const [permBannerVisible, setPermBannerVisible] = useState(isNotificationSupported && Notification.permission !== 'granted');
    const [notifPermission, setNotifPermission] = useState(isNotificationSupported ? Notification.permission : 'denied');
    const [flashRowKey, setFlashRowKey] = useState<{ key: string, direction: 'up' | 'down' } | null>(null);

    // Form State
    const [selectedProduct, setSelectedProduct] = useState('');
    const [threshUp, setThreshUp] = useState('');
    const [threshDown, setThreshDown] = useState('');
    const [notifTypes, setNotifTypes] = useState(['push', 'sound', 'popup', 'flash']);
    const [isShaking, setIsShaking] = useState<string | null>(null);

    // Refs
    const countdownTimer = useRef<any>(null);
    const prevPricesRef = useRef<{ [key: string]: number }>({});
    const initialLoadDone = useRef(false);

    // Load alarms from localStorage
    useEffect(() => {
        const savedAlarms = localStorage.getItem('price_alarms');
        if (savedAlarms) {
            try {
                const parsed = JSON.parse(savedAlarms);
                setAlarms(parsed.map((a: any) => ({
                    ...a,
                    createdAt: new Date(a.createdAt),
                    lastTriggered: a.lastTriggered ? new Date(a.lastTriggered) : null
                })));
            } catch (e) {
                console.error('Error loading alarms:', e);
            }
        }
    }, []);

    // Save alarms to localStorage
    useEffect(() => {
        localStorage.setItem('price_alarms', JSON.stringify(alarms));
    }, [alarms]);

    // Process Market Data
    useEffect(() => {
        if (liveRates.length === 0) return;

        const bySymbol = new Map(liveRates.map(l => [l.symbol, l]));
        // Satış (ask) tarafını izliyoruz; panoda öne çıkan taraf bu.
        const px = (symbol: string): number | null => {
            const q = bySymbol.get(symbol);
            return q && Number.isFinite(q.ask) ? q.ask : null;
        };

        const hasGram = px('HAS');

        // Kaynakta karşılığı olan her ürün gerçek piyasa fiyatından okunur.
        // Yalnızca 18 Ayar'ın sembolü yok, o has altından saflık oranıyla türetilir.
        const definitions: { key: string; name: string; cat: string; val: number | null }[] = [
            { key: 'HAS_GRAM',   name: '24 Ayar (Has) Gram', cat: 'Altın', val: hasGram },
            { key: '22_AYAR',    name: '22 Ayar Bilezik',    cat: 'Altın', val: px('AYAR22') },
            { key: '18_AYAR',    name: '18 Ayar',            cat: 'Altın', val: hasGram === null ? null : hasGram * 0.750 },
            { key: '14_AYAR',    name: '14 Ayar',            cat: 'Altın', val: px('AYAR14') },
            { key: 'GRAM_ALTIN', name: 'Gram Altın',         cat: 'Altın', val: hasGram },
            { key: 'CEYREK',     name: 'Çeyrek Altın',       cat: 'Altın', val: px('CEYREK') },
            { key: 'YARIM',      name: 'Yarım Altın',        cat: 'Altın', val: px('YARIM') },
            { key: 'TAM',        name: 'Tam Altın',          cat: 'Altın', val: px('TAM') },
            { key: 'CUMHURIYET', name: 'Cumhuriyet Altını',  cat: 'Altın', val: px('ATA') },
            { key: 'ATA',        name: 'Ata Altın',          cat: 'Altın', val: px('ATA') },
            { key: 'GREMSE',     name: 'Gremse (2.5)',       cat: 'Altın', val: px('GREMSE') },
            { key: 'GUMUS',      name: 'Gümüş (Gram)',       cat: 'Gümüş', val: px('GUMUS') },
            { key: 'USD',        name: 'Amerikan Doları',    cat: 'Döviz', val: px('USD') },
            { key: 'EUR',        name: 'Euro',               cat: 'Döviz', val: px('EUR') },
            { key: 'GBP',        name: 'İngiliz Sterlini',   cat: 'Döviz', val: px('GBP') },
        ].filter(d => d.val !== null);

        const newPrices: { [key: string]: ProductInfo } = {};
        definitions.forEach(d => {
            const prev = prevPricesRef.current[d.key] ?? null;
            const val = d.val as number;
            newPrices[d.key] = {
                key: d.key,
                name: d.name,
                cat: d.cat,
                current: val,
                prev: prev,
                change: prev !== null && prev !== 0 ? ((val - prev) / prev) * 100 : 0
            };
            prevPricesRef.current[d.key] = val;
        });

        setPrices(newPrices);

        if (initialLoadDone.current) {
            checkAlarms(newPrices);
        }
        initialLoadDone.current = true;
        setCountdownVal(30);
    }, [liveRates]);

    // Countdown Timer
    useEffect(() => {
        countdownTimer.current = setInterval(() => {
            setCountdownVal(prev => prev > 0 ? prev - 1 : 30);
        }, 1000);
        return () => {
            if (countdownTimer.current) clearInterval(countdownTimer.current);
        };
    }, []);

    // Alarm Check Logic
    const checkAlarms = useCallback((currentPrices: { [key: string]: ProductInfo }) => {
        setAlarms(prevAlarms => {
            let updatedAlarms = [...prevAlarms];

            updatedAlarms = updatedAlarms.map(alarm => {
                if (!alarm.active) return alarm;
                const pr = currentPrices[alarm.key];
                if (!pr || pr.prev === null) return alarm;

                const cur = pr.current;
                const prev = pr.prev;

                let triggered = false;
                let direction: 'up' | 'down' = 'up';

                if (alarm.threshUp && prev < alarm.threshUp && cur >= alarm.threshUp) {
                    triggered = true;
                    direction = 'up';
                } else if (alarm.threshDown && prev > alarm.threshDown && cur <= alarm.threshDown) {
                    triggered = true;
                    direction = 'down';
                }

                if (triggered) {
                    fireAlarm(alarm, pr, direction);
                    return { ...alarm, lastTriggered: new Date() };
                }
                return alarm;
            });

            return updatedAlarms;
        });
    }, []);

    const fireAlarm = (alarm: Alarm, pr: ProductInfo, direction: 'up' | 'down') => {
        setTotalTriggered(prev => prev + 1);

        const thresh = (direction === 'up' ? alarm.threshUp : alarm.threshDown) || 0;
        const icon = direction === 'up' ? '📈' : '📉';
        const msg = `${pr.name} ${direction === 'up' ? '▲ üst eşiği' : '▼ alt eşiği'} geçti: ₺${thresh.toLocaleString('tr-TR')}`;

        // Add to Log
        setAlarmLog(prev => [{
            name: pr.name,
            direction,
            prev: pr.prev!,
            current: pr.current,
            thresh,
            time: new Date()
        }, ...prev].slice(0, 30));

        // Trigger Notifications based on alarm settings
        if (alarm.notifs.includes('flash')) {
            setFlashRowKey({ key: alarm.key, direction });
            setTimeout(() => setFlashRowKey(null), 1200);
        }

        if (alarm.notifs.includes('sound')) {
            playAlarmSound(direction);
        }

        if (alarm.notifs.includes('popup')) {
            setPopupQueue(prev => [...prev, {
                name: pr.name,
                icon: direction === 'up' ? '📈' : '📉',
                direction,
                prev: pr.prev!,
                current: pr.current,
                thresh
            }]);
        }

        if (alarm.notifs.includes('push')) {
            sendPushNotification(icon + ' ' + msg, pr.name + ' fiyat alarmı');
        }
    };

    const playAlarmSound = (direction: 'up' | 'down') => {
        try {
            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return;
            const ctx = new AudioContextClass();
            const notes = direction === 'up'
                ? [{ f: 523, d: 0.1 }, { f: 659, d: 0.15 }, { f: 784, d: 0.25 }]
                : [{ f: 784, d: 0.1 }, { f: 659, d: 0.15 }, { f: 523, d: 0.25 }];

            let time = ctx.currentTime;
            notes.forEach(n => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.value = n.f;
                gain.gain.setValueAtTime(0.3, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + n.d);
                osc.start(time);
                osc.stop(time + n.d);
                time += n.d;
            });
        } catch (e) { console.warn('[FiyatAlarm] Ses çalınamadı:', e); }
    };

    const sendPushNotification = (title: string, body: string) => {
        if (Notification.permission !== 'granted') return;
        try {
            new Notification(title, {
                body: body,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><text y="18" font-size="18">🔔</text></svg>',
                tag: 'fiyat-alarm',
            });
        } catch (e) { console.warn('[FiyatAlarm] Push bildirimi gönderilemedi:', e); }
    };

    // Popup Logic
    useEffect(() => {
        if (!isPopupShowing && popupQueue.length > 0) {
            const next = popupQueue[0];
            setCurrentPopup(next);
            setIsPopupShowing(true);
            setPopupQueue(prev => prev.slice(1));

            // Auto close after 8 seconds
            const timer = setTimeout(() => {
                setIsPopupShowing(false);
            }, 8000);
            return () => clearTimeout(timer);
        }
    }, [isPopupShowing, popupQueue]);

    // Handlers
    const addAlarm = () => {
        if (!selectedProduct) {
            setIsShaking('alarm-product');
            setTimeout(() => setIsShaking(null), 400);
            return;
        }

        const u = parseFloat(threshUp);
        const d = parseFloat(threshDown);

        if (isNaN(u) && isNaN(d)) {
            setIsShaking('thresh-up');
            setTimeout(() => setIsShaking(null), 400);
            return;
        }

        const newAlarm: Alarm = {
            id: Date.now(),
            key: selectedProduct,
            threshUp: isNaN(u) ? null : u,
            threshDown: isNaN(d) ? null : d,
            notifs: [...notifTypes],
            active: true,
            createdAt: new Date(),
            lastTriggered: null
        };

        setAlarms(prev => {
            const idx = prev.findIndex(a => a.key === selectedProduct);
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = newAlarm;
                return updated;
            }
            return [...prev, newAlarm];
        });

        // Reset form
        setSelectedProduct('');
        setThreshUp('');
        setThreshDown('');
    };

    const toggleAlarm = (id: number) => {
        setAlarms(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
    };

    const removeAlarm = (id: number) => {
        setAlarms(prev => prev.filter(a => a.id !== id));
    };

    const toggleNotifType = (type: string) => {
        setNotifTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
    };

    const requestPermission = async () => {
        if (!isNotificationSupported) {
            alert('Tarayıcınız bildirim sistemini desteklemiyor.');
            return;
        }

        try {
            const result = await Notification.requestPermission();
            setNotifPermission(result);
            if (result === 'granted') {
                setPermBannerVisible(false);
                // Send a welcome/test notification
                new Notification('Fiyat Alarm Sistemi Aktif!', {
                    body: 'Bildirimler başarıyla etkinleştirildi. Fiyat eşikleri aşıldığında buradan bilgilendirileceksiniz.',
                    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><text y="18" font-size="18">🔔</text></svg>',
                });
            } else if (result === 'denied') {
                alert('Bildirim izni reddedildi. Alarmlar için lütfen tarayıcı ayarlarından siteye bildirim izni verin.');
            }
        } catch (e) {
            console.error('Permission request failed:', e);
        }
    };

    const closePopup = () => {
        setIsPopupShowing(false);
    };

    return (
        <div className="price-alerts-wrapper">
            {/* POPUP BİLDİRİM */}
            <div className={`pa-popup-overlay ${isPopupShowing ? 'show' : ''}`} onClick={closePopup}>
                {currentPopup && (
                    <div className="pa-popup-card" onClick={e => e.stopPropagation()}>
                        <div className="pa-popup-top">
                            <div className="pa-popup-icon">{currentPopup.icon}</div>
                            <div>
                                <h4 className="pa-popup-title">{currentPopup.name} Alarm!</h4>
                                <div className="pa-popup-sub">
                                    {currentPopup.direction === 'up'
                                        ? `▲ Üst eşik ₺${currentPopup.thresh.toLocaleString('tr-TR')} geçildi`
                                        : `▼ Alt eşik ₺${currentPopup.thresh.toLocaleString('tr-TR')} altına indi`}
                                </div>
                            </div>
                        </div>
                        <div className="pa-popup-price-row">
                            <div className="pa-popup-price-box old">
                                <div className="pa-popup-price-label">Önceki Fiyat</div>
                                <div className="pa-popup-price-val">₺{currentPopup.prev.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                            </div>
                            <div className={`pa-popup-price-box ${currentPopup.direction === 'up' ? 'new-up' : 'new-down'}`}>
                                <div className="pa-popup-price-label">Şu Anki Fiyat</div>
                                <div className={`pa-popup-price-val ${currentPopup.direction === 'up' ? 'green' : 'red'}`}>
                                    ₺{currentPopup.current.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>
                        <button className="pa-popup-close-btn" onClick={closePopup}>Tamam, Anladım</button>
                    </div>
                )}
            </div>

            <div className="pa-page">
                {/* BAŞLIK */}
                <div className="pa-page-header">
                    <div>
                        <div className="pa-eyebrow">Kurmatik.net Admin</div>
                        <h1 className="pa-page-title">
                            <svg style={{ display: 'inline', verticalAlign: '-3px', marginRight: '8px' }} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <polyline points="2 12 6 12 8 5 11 19 14 9 16 14 18 12 22 12" />
                            </svg>
                            Fiyat Alarm Sistemi
                        </h1>
                        <p className="pa-page-sub">Belirlediğin eşik değerleri aşıldığında anlık bildirim al</p>
                    </div>
                    <div className="pa-live-badge">
                        <span className="pa-live-dot"></span>
                        <span>{countdownVal}s sonra güncelleme</span>
                    </div>
                </div>

                {/* HATA BANNER */}
                {error && (
                    <div className="pa-permission-banner" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.25)', marginBottom: '22px' }}>
                        <div className="pa-perm-icon">⚠️</div>
                        <div className="pa-perm-text">
                            <strong style={{ color: 'var(--red)' }}>Bağlantı Hatası</strong>
                            {error}
                        </div>
                    </div>
                )}

                {/* İZİN BANNER */}
                {permBannerVisible && (
                    <div className="pa-permission-banner">
                        <div className="pa-perm-icon">🔔</div>
                        <div className="pa-perm-text">
                            {notifPermission === 'denied' ? (
                                <>
                                    <strong style={{ color: 'var(--red)' }}>Bildirimler Engellendi</strong>
                                    Fiyat alarmları için tarayıcı ayarlarından bildirimlere izin verin
                                </>
                            ) : (
                                <>
                                    <strong>Tarayıcı bildirimleri kapalı</strong>
                                    Sayfa kapalıyken de bildirim almak için izin ver
                                </>
                            )}
                        </div>
                        {notifPermission !== 'denied' && (
                            <button className="pa-perm-btn" onClick={requestPermission}>İzin Ver</button>
                        )}
                    </div>
                )}

                {/* STAT KARTLARI */}
                <div className="pa-stats-row">
                    <div className="pa-stat-card" style={{ borderColor: 'rgba(212,175,55,0.25)', animationDelay: '0.05s' }}>
                        <div className="pa-stat-ico">🎯</div>
                        <div>
                            <div className="pa-stat-val" style={{ color: 'var(--gold)' }}>{alarms.filter(a => a.active).length}</div>
                            <div className="pa-stat-lbl">Aktif Alarm</div>
                        </div>
                    </div>
                    <div className="pa-stat-card" style={{ borderColor: 'rgba(16,185,129,0.25)', animationDelay: '0.1s' }}>
                        <div className="pa-stat-ico">⚡</div>
                        <div>
                            <div className="pa-stat-val" style={{ color: 'var(--green)' }}>{totalTriggered}</div>
                            <div className="pa-stat-lbl">Tetiklenen</div>
                        </div>
                    </div>
                    <div className="pa-stat-card" style={{ borderColor: 'rgba(59,130,246,0.25)', animationDelay: '0.15s' }}>
                        <div className="pa-stat-ico">📊</div>
                        <div>
                            <div className="pa-stat-val" style={{ color: 'var(--blue)' }}>{Object.keys(prices).length}</div>
                            <div className="pa-stat-lbl">İzlenen Ürün</div>
                        </div>
                    </div>
                    <div className="pa-stat-card" style={{ borderColor: 'rgba(245,158,11,0.25)', animationDelay: '0.2s' }}>
                        <div className="pa-stat-ico">🕐</div>
                        <div>
                            <div className="pa-stat-val" style={{ color: 'var(--amber)', fontSize: '18px' }}>
                                {lastUpdate ? lastUpdate.toLocaleTimeString('tr-TR') : '--:--'}
                            </div>
                            <div className="pa-stat-lbl">Son Güncelleme</div>
                        </div>
                    </div>
                </div>

                {/* ANA IZGARA */}
                <div className="pa-main-grid">
                    {/* FİYAT TABLOSU */}
                    <div>
                        <div className="pa-card">
                            <div className="pa-card-head">
                                <div>
                                    <div className="pa-card-title">Canlı Fiyatlar</div>
                                    <div className="pa-card-sub">Kurmatik API · Her 30 saniyede güncellenir</div>
                                </div>
                                <div className="pa-update-time">
                                    <span className="pa-update-dot"></span>
                                    <span>Son: {lastUpdate ? lastUpdate.toLocaleTimeString('tr-TR') : 'Bekleniyor...'}</span>
                                </div>
                            </div>
                            <div className="pa-pt-head">
                                <div className="pa-pt-th">Ürün</div>
                                <div className="pa-pt-th r">Fiyat (TRY)</div>
                                <div className="pa-pt-th r">Değişim</div>
                                <div className="pa-pt-th c">Alarm</div>
                                <div className="pa-pt-th c">Durum</div>
                            </div>
                            <div className="pa-price-table-body">
                                {Object.values(prices).map(p => {
                                    const hasActiveAlarm = alarms.some(a => a.key === p.key && a.active);
                                    const isTriggered = flashRowKey?.key === p.key;
                                    const directionClass = isTriggered ? (flashRowKey?.direction === 'up' ? 'triggered-up' : 'triggered-down') : '';

                                    return (
                                        <div
                                            key={p.key}
                                            className={`pa-pt-row ${hasActiveAlarm ? 'has-alarm' : ''} ${directionClass}`}
                                            onClick={() => setSelectedProduct(p.key)}
                                        >
                                            <div>
                                                <div className="pa-pt-name">{p.name}</div>
                                                <div className="pa-pt-cat">{p.cat}</div>
                                            </div>
                                            <div className="pa-pt-price">₺{p.current.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                            <div className="pa-pt-change">
                                                <span className={`pa-change-badge ${p.change > 0.01 ? 'pa-change-up' : p.change < -0.01 ? 'pa-change-down' : 'pa-change-flat'}`}>
                                                    {(p.change >= 0 ? '+' : '')}{p.change.toFixed(2)}%
                                                </span>
                                            </div>
                                            <div className="pa-pt-alarm">
                                                <div className={`pa-alarm-indicator ${hasActiveAlarm ? 'active' : 'inactive'}`}>
                                                    {hasActiveAlarm ? '🔔' : '🔕'}
                                                </div>
                                            </div>
                                            <div className="pa-pt-durum">
                                                <span className="pa-durum-badge pa-durum-live">CANLI</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ALARM GEÇMİŞİ */}
                        <div className="pa-log-card">
                            <div className="pa-card-head">
                                <div>
                                    <div className="pa-card-title">Alarm Geçmişi</div>
                                    <div className="pa-card-sub">Son tetiklenen alarmlar</div>
                                </div>
                                <button onClick={() => setAlarmLog([])} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '11px', cursor: 'pointer' }}>Temizle</button>
                            </div>
                            <div className="pa-log-list">
                                {alarmLog.length === 0 ? (
                                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '12px' }}>Henüz tetiklenen alarm yok</div>
                                ) : (
                                    alarmLog.map((log, idx) => (
                                        <div key={idx} className="pa-log-item">
                                            <div className="pa-log-time">{log.time.toLocaleTimeString('tr-TR')}</div>
                                            <div className="pa-log-icon">{log.direction === 'up' ? '📈' : '📉'}</div>
                                            <div className="pa-log-text"><strong>{log.name}</strong> eşik aşıldı (₺{log.thresh.toLocaleString('tr-TR')})</div>
                                            <div className={`pa-log-val ${log.direction === 'up' ? 'up' : 'down'}`}>
                                                ₺{log.current.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ALARM PANELİ */}
                    <div className="pa-alarm-panel">
                        <div className="pa-alarm-form-card">
                            <div className="pa-card-head">
                                <div>
                                    <div className="pa-card-title">🎯 Yeni Alarm Kur</div>
                                    <div className="pa-card-sub">Fiyat eşiği belirle, bildirim al</div>
                                </div>
                            </div>
                            <div className="pa-alarm-form-body">
                                <div className="pa-form-group">
                                    <label className="pa-form-label">Ürün Seç</label>
                                    <select
                                        className={`pa-product-select ${isShaking === 'alarm-product' ? 'pa-shake-anim' : ''}`}
                                        value={selectedProduct}
                                        onChange={e => setSelectedProduct(e.target.value)}
                                    >
                                        <option value="">— Ürün seçin —</option>
                                        {Object.values(prices).map(p => (
                                            <option key={p.key} value={p.key}>{p.name} ({p.cat})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="pa-form-group">
                                    <label className="pa-form-label">Eşik Değerleri</label>
                                    <div className="pa-threshold-row">
                                        <div>
                                            <div className="pa-threshold-label-row">
                                                <div className="pa-threshold-dot up"></div>
                                                <span className="pa-threshold-tag">Üst Eşik (yükselince)</span>
                                            </div>
                                            <div className="pa-threshold-group">
                                                <input
                                                    type="number"
                                                    className={`pa-threshold-input up ${isShaking === 'thresh-up' ? 'pa-shake-anim' : ''}`}
                                                    placeholder="örn: 8000"
                                                    value={threshUp}
                                                    onChange={e => setThreshUp(e.target.value)}
                                                />
                                                <span className="pa-threshold-currency">₺</span>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="pa-threshold-label-row">
                                                <div className="pa-threshold-dot down"></div>
                                                <span className="pa-threshold-tag">Alt Eşik (düşünce)</span>
                                            </div>
                                            <div className="pa-threshold-group">
                                                <input
                                                    type="number"
                                                    className="pa-threshold-input down"
                                                    placeholder="örn: 7000"
                                                    value={threshDown}
                                                    onChange={e => setThreshDown(e.target.value)}
                                                />
                                                <span className="pa-threshold-currency">₺</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pa-form-group">
                                    <label className="pa-form-label">Bildirim Türleri</label>
                                    <div className="pa-notif-types">
                                        <div className={`pa-notif-chip ${notifTypes.includes('push') ? 'active' : ''}`} onClick={() => toggleNotifType('push')}>🔔 Tarayıcı</div>
                                        <div className={`pa-notif-chip ${notifTypes.includes('sound') ? 'active' : ''}`} onClick={() => toggleNotifType('sound')}>🔊 Ses</div>
                                        <div className={`pa-notif-chip ${notifTypes.includes('popup') ? 'active' : ''}`} onClick={() => toggleNotifType('popup')}>💬 Popup</div>
                                        <div className={`pa-notif-chip ${notifTypes.includes('flash') ? 'active' : ''}`} onClick={() => toggleNotifType('flash')}>✨ Tablo</div>
                                    </div>
                                </div>

                                <button className="pa-add-alarm-btn" onClick={addAlarm}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <line x1="12" y1="5" x2="12" y2="19" />
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                    Alarm Kur
                                </button>
                            </div>
                        </div>

                        {/* AKTİF ALARMLAR */}
                        <div className="pa-alarms-card">
                            <div className="pa-card-head">
                                <div>
                                    <div className="pa-card-title">Aktif Alarmlar</div>
                                    <div className="pa-card-sub">
                                        {alarms.length === 0 ? 'Henüz alarm yok' : `${alarms.length} alarm · ${alarms.filter(a => a.active).length} aktif`}
                                    </div>
                                </div>
                            </div>
                            <div className="pa-alarms-list">
                                {alarms.length === 0 ? (
                                    <div className="pa-alarms-empty">
                                        <div className="pa-alarms-empty-icon">🔕</div>
                                        Henüz alarm kurulmadı.<br />Soldaki panelden ekle.
                                    </div>
                                ) : (
                                    alarms.map(alarm => {
                                        const pInfo = prices[alarm.key];
                                        return (
                                            <div key={alarm.id} className={`pa-alarm-item ${alarm.lastTriggered ? 'triggered' : ''}`}>
                                                <div className="pa-ai-icon">{alarm.active ? '🔔' : '🔕'}</div>
                                                <div className="pa-ai-body">
                                                    <div className="pa-ai-name">{pInfo?.name || alarm.key}</div>
                                                    <div className="pa-ai-thresholds">
                                                        {alarm.threshUp && <span className="pa-ai-thresh up">▲ ₺{alarm.threshUp.toLocaleString('tr-TR')}</span>}
                                                        {alarm.threshDown && <span className="pa-ai-thresh down">▼ ₺{alarm.threshDown.toLocaleString('tr-TR')}</span>}
                                                    </div>
                                                    <div className="pa-ai-notifs">
                                                        {alarm.notifs.map(n => ({ push: '🔔', sound: '🔊', popup: '💬', flash: '✨' }[n as 'push' | 'sound' | 'popup' | 'flash'] || n)).join(' ')}
                                                    </div>
                                                    <div className={`pa-ai-status ${alarm.lastTriggered ? 'triggered' : 'active'}`}>
                                                        {alarm.lastTriggered
                                                            ? `⚡ Tetiklendi · ${alarm.lastTriggered.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
                                                            : (alarm.active ? '🎯 Bekliyor' : '⏸ Durduruldu')}
                                                    </div>
                                                </div>
                                                <div className="pa-ai-actions">
                                                    <button className="pa-ai-btn toggle" onClick={() => toggleAlarm(alarm.id)} title={alarm.active ? 'Durdur' : 'Başlat'}>
                                                        {alarm.active ? '⏸' : '▶'}
                                                    </button>
                                                    <button className="pa-ai-btn" onClick={() => removeAlarm(alarm.id)} title="Sil">✕</button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PriceAlerts;
