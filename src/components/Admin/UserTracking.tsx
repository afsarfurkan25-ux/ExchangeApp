import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useExchange } from '../../hooks/useExchange';
import { supabase } from '../../supabaseClient';

// ── Types ────────────────────────────────────────────────────────────────────
type TabType = 'online' | 'aktivite' | 'oturum';

interface UserData {
    id: string;
    ad: string;
    rol: 'admin' | 'yonetici' | 'uye';
    renk: string;
    online: boolean;
    lastSeen: string | null;
    deviceInfo: string;
    sonAktivite: string;
}

interface ActivityData {
    id: string;
    zaman: string;
    ikon: string;
    tip: 'giris' | 'cikis' | 'fiyat' | 'sistem';
    kullanici: string;
    metin: string;
}

interface SessionData {
    kullanici: string;
    rol: 'admin' | 'yonetici' | 'uye';
    giris: string;
    cikis: string;
    sure: string;
    loginTime: Date;
    logoutTime: Date | null;
    cihaz: string;
    aktif: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const HB_INTERVAL = 30; // seconds
const OFFLINE_THRESHOLD = 60; // seconds

const ROL = {
    admin: { color: '#ef4444', label: 'Admin' },
    yonetici: { color: '#f59e0b', label: 'Yönetici' },
    uye: { color: '#10b981', label: 'Üye' },
    sistem: { color: '#94a3b8', label: 'Sistem' },
};

const AVATAR_COLORS = ['#D4AF37', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(name: string) {
    return name.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
}

function avatarColor(name: string) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function timeSince(dateStr: string | null): string {
    if (!dateStr) return 'Hiç giriş yapmadı';
    const ms = Date.now() - new Date(dateStr).getTime();
    const s = Math.floor(ms / 1000);
    if (s < 60) return s + ' sn önce';
    if (s < 3600) return Math.floor(s / 60) + ' dk önce';
    return Math.floor(s / 3600) + 'sa ' + Math.floor((s % 3600) / 60) + 'dk önce';
}

function fmtDuration(ms: number): string {
    const s = Math.floor(ms / 1000);
    if (s < 60) return s + ' sn';
    if (s < 3600) return Math.floor(s / 60) + ' dk';
    return Math.floor(s / 3600) + 'sa ' + Math.floor((s % 3600) / 60) + 'dk';
}

function fmtTime(d: Date | null): string {
    if (!d) return '—';
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function isOnline(presence: any): boolean {
    if (!presence || !presence.is_online) return false;
    return (Date.now() - new Date(presence.last_seen).getTime()) / 1000 < OFFLINE_THRESHOLD;
}

// ── Component ─────────────────────────────────────────────────────────────────
const UserTracking: React.FC = () => {
    const { members, activities, sessions } = useExchange();
    const [activeTab, setActiveTab] = useState<TabType>('online');

    // Presence
    const [presenceList, setPresenceList] = useState<any[]>([]);

    useEffect(() => {
        supabase.from('user_presence').select('*').then(({ data }) => {
            if (data) setPresenceList(data);
        });
        const ch = supabase.channel('ut-presence')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' }, (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    setPresenceList(prev => {
                        const exists = prev.find(p => p.member_id === payload.new.member_id);
                        return exists
                            ? prev.map(p => p.member_id === payload.new.member_id ? payload.new : p)
                            : [...prev, payload.new];
                    });
                } else if (payload.eventType === 'DELETE') {
                    setPresenceList(prev => prev.filter(p => p.member_id !== payload.old.member_id));
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, []);

    // Heartbeat countdown
    const [hbTimer, setHbTimer] = useState(HB_INTERVAL);
    const hbRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        hbRef.current = setInterval(() => {
            setHbTimer(prev => {
                if (prev <= 1) return HB_INTERVAL;
                return prev - 1;
            });
        }, 1000);
        return () => { if (hbRef.current) clearInterval(hbRef.current); };
    }, []);

    const hbPct = (hbTimer / HB_INTERVAL) * 100;

    // Derived data
    const mappedUsers = useMemo<UserData[]>(() => {
        return members.map(m => {
            const presence = presenceList.find(p => p.member_id === m.id);
            const isTrulyOnline = isOnline(presence);

            const userActivities = activities.filter(a => a.member_id === m.id);
            const lastAct = userActivities[0];
            let sonAktivite = 'Yok';
            if (lastAct) {
                const tmp = document.createElement('div');
                tmp.innerHTML = lastAct.text_content;
                sonAktivite = (tmp.textContent || lastAct.text_content).slice(0, 30) + (lastAct.text_content.length > 30 ? '...' : '');
            }

            let rolNorm: 'admin' | 'yonetici' | 'uye' = 'uye';
            if (m.role === 'Admin') rolNorm = 'admin';
            if (m.role === 'Yönetici') rolNorm = 'yonetici';

            return {
                id: m.id,
                ad: m.name,
                rol: rolNorm,
                renk: avatarColor(m.name),
                online: isTrulyOnline,
                lastSeen: presence?.last_seen ?? null,
                deviceInfo: presence?.device_info ?? '',
                sonAktivite,
            };
        });
    }, [members, presenceList, activities]);

    const dOnline = useMemo(() => mappedUsers.filter(u => u.online), [mappedUsers]);
    const dOffline = useMemo(() => mappedUsers.filter(u => !u.online), [mappedUsers]);

    const mappedActivities = useMemo<ActivityData[]>(() => {
        return activities.map(a => ({
            id: a.id,
            zaman: new Date(a.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            ikon: a.icon,
            tip: a.type as ActivityData['tip'],
            kullanici: a.user_name,
            metin: a.text_content,
        }));
    }, [activities]);

    const mappedSessions = useMemo<SessionData[]>(() => {
        return sessions.map(s => {
            const loginDate = new Date(s.login_time);
            const logoutDate = s.logout_time ? new Date(s.logout_time) : null;

            let rolLabel: 'admin' | 'yonetici' | 'uye' = 'uye';
            if (s.members?.role === 'Admin') rolLabel = 'admin';
            if (s.members?.role === 'Yönetici') rolLabel = 'yonetici';

            const aktif = s.is_active && (Date.now() - loginDate.getTime()) / 3600000 < 8;
            const sure = aktif
                ? 'Devam ediyor'
                : logoutDate
                    ? fmtDuration(logoutDate.getTime() - loginDate.getTime())
                    : '—';

            return {
                kullanici: s.members?.name || 'Bilinmeyen',
                rol: rolLabel,
                giris: fmtTime(loginDate),
                cikis: logoutDate ? fmtTime(logoutDate) : '—',
                sure,
                loginTime: loginDate,
                logoutTime: logoutDate,
                cihaz: s.device_info || 'Bilinmeyen',
                aktif,
            };
        });
    }, [sessions]);

    const todaySessions = useMemo(
        () => mappedSessions.filter(s => s.loginTime.toDateString() === new Date().toDateString()),
        [mappedSessions]
    );

    // Filters — Aktivite
    const [aktSearch, setAktSearch] = useState('');
    const [aktTip, setAktTip] = useState('');
    const [aktKul, setAktKul] = useState('');
    const [aktPage, setAktPage] = useState(0);
    const AKT_SIZE = 8;

    const filteredAkt = useMemo(() => mappedActivities.filter(a => {
        if (aktTip && a.tip !== aktTip) return false;
        if (aktKul && a.kullanici !== aktKul) return false;
        if (aktSearch && !a.metin.toLowerCase().includes(aktSearch.toLowerCase()) && !a.kullanici.toLowerCase().includes(aktSearch.toLowerCase())) return false;
        return true;
    }), [mappedActivities, aktSearch, aktTip, aktKul]);

    // Filters — Oturum
    const [otSearch, setOtSearch] = useState('');
    const [otKul, setOtKul] = useState('');
    const [otPage, setOtPage] = useState(0);
    const OT_SIZE = 6;

    const filteredOt = useMemo(() => mappedSessions.filter(o => {
        if (otKul && o.kullanici !== otKul) return false;
        if (otSearch && !o.kullanici.toLowerCase().includes(otSearch.toLowerCase())) return false;
        return true;
    }), [mappedSessions, otSearch, otKul]);

    const uniqueUsers = useMemo(() => Array.from(new Set(mappedUsers.map(u => u.ad))), [mappedUsers]);

    function Pagination({ total, page, size, setPage }: { total: number; page: number; size: number; setPage: (p: number) => void }) {
        const pages = Math.ceil(total / size);
        if (pages <= 1) return null;
        return (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 4px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#475569' }}>{total} kayıt</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button disabled={page === 0} onClick={() => setPage(page - 1)} style={pgBtnStyle(false)}>← Önceki</button>
                    {Array.from({ length: pages }).map((_, i) => (
                        <button key={i} onClick={() => setPage(i)} style={pgBtnStyle(i === page)}>{i + 1}</button>
                    ))}
                    <button disabled={page >= pages - 1} onClick={() => setPage(page + 1)} style={pgBtnStyle(false)}>Sonraki →</button>
                </div>
            </div>
        );
    }

    function pgBtnStyle(active: boolean): React.CSSProperties {
        return {
            background: active ? '#D4AF37' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${active ? '#D4AF37' : 'rgba(255,255,255,0.1)'}`,
            color: active ? '#000' : '#e2e8f0',
            borderRadius: '7px', padding: '5px 12px',
            fontSize: '12px', cursor: 'pointer', fontWeight: active ? 700 : 400,
        };
    }

    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <div id="ut-root">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

                #ut-root { font-family: 'DM Sans', -apple-system, sans-serif; color: #e2e8f0; width: 100%; }
                #ut-root * { box-sizing: border-box; }

                /* ──── HEADER ──── */
                .at-eyebrow {
                    font-size: 11px; color: #8a7020; letter-spacing: 3px;
                    text-transform: uppercase; margin-bottom: 6px;
                    display: flex; align-items: center; gap: 8px;
                }
                .at-eyebrow::before { content: ''; width: 18px; height: 1px; background: #8a7020; }
                .at-page-title { font-family: 'Cinzel', serif; font-size: 24px; color: #D4AF37; letter-spacing: 0.5px; margin: 0; }
                .at-page-sub   { font-size: 13px; color: #475569; margin-top: 4px; }

                /* ──── LIVE BADGE ──── */
                .at-live-badge {
                    display: flex; align-items: center; gap: 8px; font-size: 12px;
                    color: #10b981; background: rgba(16,185,129,0.1);
                    border: 1px solid rgba(16,185,129,0.25);
                    padding: 7px 14px; border-radius: 100px; white-space: nowrap;
                }
                .at-live-dot {
                    width: 7px; height: 7px; border-radius: 50%;
                    background: #10b981; display: inline-block;
                    animation: at-pulse 1.5s infinite; flex-shrink: 0;
                }

                /* ──── HEARTBEAT BAR ──── */
                .at-hb-indicator {
                    display: flex; align-items: center; gap: 8px;
                    font-size: 11px; color: #475569; margin-top: 16px;
                }
                .at-hb-bar { flex: 1; height: 3px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; }
                .at-hb-fill { height: 100%; background: #10b981; border-radius: 2px; transition: width 1s linear; }

                /* ──── STAT CARDS ──── */
                .at-stats-grid {
                    display: grid; grid-template-columns: repeat(4, 1fr);
                    gap: 14px; margin-bottom: 24px;
                }
                @media (max-width: 900px) { .at-stats-grid { grid-template-columns: repeat(2, 1fr); } }
                @media (max-width: 600px) { .at-stats-grid { grid-template-columns: 1fr 1fr; } }

                .at-stat-card {
                    background: #0c1019; border: 1px solid; border-radius: 14px;
                    padding: 18px 20px; display: flex; align-items: center; gap: 12px;
                }
                .at-stat-val { font-size: 28px; font-weight: 700; line-height: 1; }
                .at-stat-lbl { font-size: 11px; color: #475569; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.8px; }

                /* ──── TABS ──── */
                .at-tabs {
                    display: flex; gap: 4px; margin-bottom: 20px;
                    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 12px; padding: 5px; width: fit-content; max-width: 100%; flex-wrap: wrap;
                }
                .at-tab {
                    padding: 8px 16px; border-radius: 8px; font-size: 13px;
                    font-weight: 500; cursor: pointer; border: 1px solid transparent;
                    background: transparent; color: #475569; transition: all 0.2s; font-family: inherit;
                }
                .at-tab.at-active { background: rgba(212,175,55,0.15); color: #D4AF37; border-color: rgba(212,175,55,0.3); }
                .at-tab:hover:not(.at-active) { color: #e2e8f0; }

                /* ──── SECTION LABEL ──── */
                .at-section-label {
                    font-size: 11px; font-weight: 600; color: #475569;
                    text-transform: uppercase; letter-spacing: 1px;
                    margin-bottom: 12px; display: flex; align-items: center; gap: 8px;
                }

                /* ──── USER CARD GRID ──── */
                .at-online-grid {
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
                    gap: 12px; margin-bottom: 24px;
                }
                @media (max-width: 600px) { .at-online-grid { grid-template-columns: 1fr; } }

                /* ──── USER CARD ──── */
                .at-user-card {
                    background: #0c1019; border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 14px; padding: 16px;
                    display: flex; align-items: center; gap: 12px;
                    transition: all 0.35s cubic-bezier(0.4,0,0.2,1);
                    position: relative; overflow: hidden; animation: at-fadeIn 0.3s ease;
                }
                .at-user-card::before {
                    content: ''; position: absolute; left: 0; top: 0; bottom: 0;
                    width: 3px; border-radius: 0 2px 2px 0; opacity: 0; transition: opacity 0.35s;
                }
                .at-user-card.is-online { border-color: rgba(16,185,129,0.3); }
                .at-user-card.is-online::before { background: #10b981; opacity: 1; }
                .at-user-card.is-offline { opacity: 0.6; }

                .at-uc-avatar {
                    width: 40px; height: 40px; border-radius: 11px;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 14px; font-weight: 700; color: #000;
                    flex-shrink: 0; position: relative; transition: opacity 0.35s;
                }
                .at-user-card.is-offline .at-uc-avatar { opacity: 0.45; }
                .at-uc-dot {
                    position: absolute; bottom: 0; right: 0;
                    width: 11px; height: 11px; border-radius: 50%;
                    border: 2px solid #0c1019; transition: background 0.35s;
                }
                .at-user-card.is-online  .at-uc-dot { background: #10b981; animation: at-pulse 2s infinite; }
                .at-user-card.is-offline .at-uc-dot { background: #475569; }

                .at-uc-name   { font-size: 13px; font-weight: 600; color: #e2e8f0; }
                .at-uc-role   { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
                .at-uc-status { font-size: 11px; margin-top: 5px; padding: 3px 8px; border-radius: 4px; display: inline-block; }
                .at-user-card.is-online  .at-uc-status { background: rgba(16,185,129,0.1); color: #10b981; }
                .at-user-card.is-offline .at-uc-status { color: #475569; background: transparent; padding-left: 0; }
                .at-uc-heartbeat {
                    position: absolute; right: 14px; top: 14px;
                    font-size: 10px; font-family: 'DM Mono', monospace; color: #475569;
                }
                .at-user-card.is-online .at-uc-heartbeat { color: rgba(16,185,129,0.6); }

                /* ──── FILTER BAR ──── */
                .at-filtre {
                    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 10px; padding: 12px 16px; margin-bottom: 16px;
                    display: flex; gap: 10px; flex-wrap: wrap; align-items: center;
                }
                .at-arama-wr { position: relative; flex: 2; min-width: 180px; }
                .at-arama-ic { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 13px; pointer-events: none; }
                #ut-root input[type=text], #ut-root select {
                    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 8px; padding: 7px 12px; color: #e2e8f0; font-size: 13px;
                    outline: none; font-family: inherit; transition: border-color 0.2s; appearance: auto;
                }
                #ut-root input[type=text] { padding-left: 32px; width: 100%; }
                #ut-root input[type=text]:focus, #ut-root select:focus { border-color: rgba(212,175,55,0.4); }
                #ut-root select { flex: 1; min-width: 130px; cursor: pointer; }
                #ut-root select option { background: #1a2035; color: #e2e8f0; }

                /* ──── ACTIVITY LIST ──── */
                .at-activity-list {
                    background: #0c1019; border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 14px; overflow: hidden;
                }
                .at-activity-row {
                    display: flex; align-items: center; gap: 12px;
                    padding: 13px 20px; border-bottom: 1px solid rgba(255,255,255,0.04);
                    font-size: 13px; transition: background 0.15s; animation: at-slideIn 0.3s ease both;
                }
                .at-activity-row:last-child { border-bottom: none; }
                .at-activity-row:hover { background: rgba(255,255,255,0.02); }
                .at-act-time  { font-family: 'DM Mono', monospace; font-size: 11px; color: #475569; min-width: 56px; }
                .at-act-icon  { font-size: 16px; flex-shrink: 0; }
                .at-act-text  { flex: 1; color: #e2e8f0; line-height: 1.5; }
                .at-act-text .ak-isim { color: #D4AF37; font-weight: 600; }
                .at-act-text .ak-urun { color: #60a5fa; }
                .at-act-badge { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 100px; }
                .at-b-giris   { background: rgba(16,185,129,0.12); color: #10b981; }
                .at-b-cikis   { background: rgba(239,68,68,0.12);  color: #ef4444; }
                .at-b-fiyat   { background: rgba(212,175,55,0.12); color: #D4AF37; }
                .at-b-sistem  { background: rgba(148,163,184,0.1);  color: #94a3b8; }

                /* ──── SESSION TABLE ──── */
                .at-session-table {
                    background: #0c1019; border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 14px; overflow: hidden; overflow-x: auto;
                }
                .at-st-head {
                    display: grid; grid-template-columns: 2fr 1.5fr 1.5fr 1.5fr 1.2fr 1fr;
                    padding: 11px 20px; background: rgba(212,175,55,0.04);
                    border-bottom: 1px solid rgba(255,255,255,0.06); min-width: 650px;
                }
                .at-st-th {
                    font-size: 10px; font-weight: 600; color: #8a7020;
                    text-transform: uppercase; letter-spacing: 0.8px; padding: 0 6px;
                }
                .at-st-th.tc { text-align: center; }
                .at-st-row {
                    display: grid; grid-template-columns: 2fr 1.5fr 1.5fr 1.5fr 1.2fr 1fr;
                    padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.04);
                    align-items: center; transition: background 0.15s; min-width: 650px;
                    animation: at-fadeIn 0.3s ease both;
                }
                .at-st-row:last-child { border-bottom: none; }
                .at-st-row:hover { background: rgba(255,255,255,0.02); }
                .at-st-td { padding: 0 6px; font-size: 12px; }
                .at-st-td.tc { text-align: center; }
                .at-sbadge { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 100px; }

                /* ──── EMPTY ──── */
                .at-bos { padding: 48px 20px; text-align: center; color: #475569; font-size: 13px; }

                /* ──── ANIMATIONS ──── */
                @keyframes at-pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
                    50%       { box-shadow: 0 0 0 5px rgba(16,185,129,0); }
                }
                @keyframes at-fadeIn {
                    from { opacity: 0; transform: translateY(6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes at-slideIn {
                    from { opacity: 0; transform: translateX(-10px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
            `}</style>

            {/* ── HEADER ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <div className="at-eyebrow">Kurmatik.net Admin</div>
                    <h1 className="at-page-title">👥 Anlık Kullanıcı Takibi</h1>
                    <p className="at-page-sub">Heartbeat sistemi · Realtime güncelleme · 30 sn timeout koruması</p>
                </div>
                <div className="at-live-badge">
                    <span className="at-live-dot"></span> Gerçek Zamanlı
                </div>
            </div>

            {/* ── HEARTBEAT BAR ── */}
            <div className="at-hb-indicator">
                <span>💓 Sonraki heartbeat:</span>
                <div className="at-hb-bar">
                    <div className="at-hb-fill" style={{ width: `${hbPct}%` }}></div>
                </div>
                <span style={{ minWidth: '40px', textAlign: 'right', fontFamily: "'DM Mono', monospace", fontSize: '11px', color: '#475569' }}>
                    {hbTimer}s
                </span>
            </div>

            {/* ── STATS ── */}
            <div className="at-stats-grid" style={{ marginTop: '20px' }}>
                <div className="at-stat-card" style={{ borderColor: 'rgba(16,185,129,0.25)' }}>
                    <span style={{ fontSize: '22px' }}>🟢</span>
                    <div>
                        <div className="at-stat-val" style={{ color: '#10b981' }}>{dOnline.length}</div>
                        <div className="at-stat-lbl">Şu An Online</div>
                    </div>
                </div>
                <div className="at-stat-card" style={{ borderColor: 'rgba(212,175,55,0.25)' }}>
                    <span style={{ fontSize: '22px' }}>📅</span>
                    <div>
                        <div className="at-stat-val" style={{ color: '#D4AF37' }}>{todaySessions.length}</div>
                        <div className="at-stat-lbl">Bugün Giriş</div>
                    </div>
                </div>
                <div className="at-stat-card" style={{ borderColor: 'rgba(59,130,246,0.25)' }}>
                    <span style={{ fontSize: '22px' }}>⏱</span>
                    <div>
                        <div className="at-stat-val" style={{ color: '#3b82f6' }}>{hbTimer}s</div>
                        <div className="at-stat-lbl">Sonraki Heartbeat</div>
                    </div>
                </div>
                <div className="at-stat-card" style={{ borderColor: 'rgba(139,92,246,0.25)' }}>
                    <span style={{ fontSize: '22px' }}>📊</span>
                    <div>
                        <div className="at-stat-val" style={{ color: '#8b5cf6' }}>{mappedActivities.length}</div>
                        <div className="at-stat-lbl">Toplam Aktivite</div>
                    </div>
                </div>
            </div>

            {/* ── TABS ── */}
            <div className="at-tabs" style={{ marginTop: '4px' }}>
                <button className={`at-tab${activeTab === 'online' ? ' at-active' : ''}`} onClick={() => setActiveTab('online')}>🟢 Şu An Online</button>
                <button className={`at-tab${activeTab === 'aktivite' ? ' at-active' : ''}`} onClick={() => setActiveTab('aktivite')}>⚡ Aktivite Akışı</button>
                <button className={`at-tab${activeTab === 'oturum' ? ' at-active' : ''}`} onClick={() => setActiveTab('oturum')}>🔐 Oturum Geçmişi</button>
            </div>

            {/* ── PANEL: ONLINE ── */}
            {activeTab === 'online' && (
                <div>
                    <div className="at-section-label">
                        <span className="at-live-dot" style={{ width: '6px', height: '6px' }}></span>
                        Aktif Kullanıcılar
                    </div>
                    <div className="at-online-grid">
                        {dOnline.length === 0
                            ? <div style={{ color: '#475569', fontSize: '13px' }}>Şu an online kullanıcı yok</div>
                            : dOnline.map(u => (
                                <div key={u.id} className="at-user-card is-online">
                                    <div className="at-uc-avatar" style={{ background: u.renk }}>
                                        {initials(u.ad)}
                                        <span className="at-uc-dot"></span>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="at-uc-name">{u.ad}</div>
                                        <div className="at-uc-role" style={{ color: ROL[u.rol].color }}>{ROL[u.rol].label}</div>
                                        <div className="at-uc-status">⚡ Aktif{u.deviceInfo ? ` · ${u.deviceInfo}` : ''}</div>
                                    </div>
                                    <div className="at-uc-heartbeat">💓 {u.lastSeen ? fmtTime(new Date(u.lastSeen)) : '—'}</div>
                                </div>
                            ))
                        }
                    </div>

                    {dOffline.length > 0 && (
                        <>
                            <div className="at-section-label" style={{ marginTop: '8px' }}>
                                <span style={{ opacity: 0.4 }}>⚫</span> Çevrimdışı
                            </div>
                            <div className="at-online-grid">
                                {dOffline.map(u => (
                                    <div key={u.id} className="at-user-card is-offline">
                                        <div className="at-uc-avatar" style={{ background: u.renk }}>
                                            {initials(u.ad)}
                                            <span className="at-uc-dot"></span>
                                        </div>
                                        <div>
                                            <div className="at-uc-name" style={{ opacity: 0.7 }}>{u.ad}</div>
                                            <div className="at-uc-role" style={{ color: ROL[u.rol].color }}>{ROL[u.rol].label}</div>
                                            <div className="at-uc-status">🕐 {timeSince(u.lastSeen)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── PANEL: AKTİVİTE ── */}
            {activeTab === 'aktivite' && (
                <div>
                    <div className="at-filtre">
                        <div className="at-arama-wr">
                            <span className="at-arama-ic">🔍</span>
                            <input type="text" placeholder="Aktivite ara..." value={aktSearch} onChange={e => { setAktSearch(e.target.value); setAktPage(0); }} />
                        </div>
                        <select value={aktTip} onChange={e => { setAktTip(e.target.value); setAktPage(0); }}>
                            <option value="">Tüm Aktiviteler</option>
                            <option value="giris">Giriş</option>
                            <option value="cikis">Çıkış</option>
                            <option value="fiyat">Fiyat Değişimi</option>
                            <option value="sistem">Sistem</option>
                        </select>
                        <select value={aktKul} onChange={e => { setAktKul(e.target.value); setAktPage(0); }}>
                            <option value="">Tüm Kullanıcılar</option>
                            {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>

                    <div className="at-activity-list">
                        {filteredAkt.length === 0
                            ? <div className="at-bos">📭 Kayıt bulunamadı</div>
                            : filteredAkt.slice(aktPage * AKT_SIZE, (aktPage + 1) * AKT_SIZE).map((a, i) => (
                                <div key={a.id} className="at-activity-row" style={{ animationDelay: `${i * 0.03}s` }}>
                                    <div className="at-act-time">{a.zaman}</div>
                                    <div className="at-act-icon">{a.ikon}</div>
                                    <div className="at-act-text" dangerouslySetInnerHTML={{ __html: a.metin }} />
                                    {a.tip === 'giris' && <span className="at-act-badge at-b-giris">🔑 Giriş</span>}
                                    {a.tip === 'cikis' && <span className="at-act-badge at-b-cikis">🚪 Çıkış</span>}
                                    {a.tip === 'fiyat' && <span className="at-act-badge at-b-fiyat">✏️ Fiyat</span>}
                                    {a.tip === 'sistem' && <span className="at-act-badge at-b-sistem">🤖 Sistem</span>}
                                </div>
                            ))
                        }
                    </div>
                    <Pagination total={filteredAkt.length} page={aktPage} size={AKT_SIZE} setPage={setAktPage} />
                </div>
            )}

            {/* ── PANEL: OTURUM ── */}
            {activeTab === 'oturum' && (
                <div>
                    <div className="at-filtre">
                        <div className="at-arama-wr">
                            <span className="at-arama-ic">🔍</span>
                            <input type="text" placeholder="Kullanıcı ara..." value={otSearch} onChange={e => { setOtSearch(e.target.value); setOtPage(0); }} />
                        </div>
                        <select value={otKul} onChange={e => { setOtKul(e.target.value); setOtPage(0); }}>
                            <option value="">Tüm Kullanıcılar</option>
                            {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>

                    <div className="at-session-table">
                        <div className="at-st-head">
                            <div className="at-st-th">Kullanıcı</div>
                            <div className="at-st-th">Giriş</div>
                            <div className="at-st-th">Çıkış</div>
                            <div className="at-st-th">Süre</div>
                            <div className="at-st-th">Cihaz</div>
                            <div className="at-st-th tc">Durum</div>
                        </div>
                        <div>
                            {filteredOt.length === 0
                                ? <div className="at-bos">📭 Kayıt bulunamadı</div>
                                : filteredOt.slice(otPage * OT_SIZE, (otPage + 1) * OT_SIZE).map((s, i) => {
                                    const rol = ROL[s.rol];
                                    const renk = avatarColor(s.kullanici);
                                    return (
                                        <div key={i} className="at-st-row" style={{ animationDelay: `${i * 0.04}s` }}>
                                            <div className="at-st-td" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: renk, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#000', flexShrink: 0 }}>
                                                    {initials(s.kullanici)}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{s.kullanici}</div>
                                                    <div style={{ fontSize: '10px', color: rol.color, fontWeight: 600, textTransform: 'uppercase' }}>{rol.label}</div>
                                                </div>
                                            </div>
                                            <div className="at-st-td" style={{ fontFamily: "'DM Mono',monospace", color: '#10b981' }}>▶ {s.giris}</div>
                                            <div className="at-st-td" style={{ fontFamily: "'DM Mono',monospace", color: s.logoutTime ? '#ef4444' : '#475569' }}>
                                                {s.logoutTime ? `⏹ ${s.cikis}` : '—'}
                                            </div>
                                            <div className="at-st-td">{s.sure}</div>
                                            <div className="at-st-td" style={{ fontSize: '11px', color: '#475569' }}>{s.cihaz}</div>
                                            <div className="at-st-td tc">
                                                {s.aktif
                                                    ? <span className="at-sbadge" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>🟢 Aktif</span>
                                                    : <span className="at-sbadge" style={{ background: 'rgba(100,116,139,0.1)', color: '#475569' }}>⚫ Kapandı</span>
                                                }
                                            </div>
                                        </div>
                                    );
                                })
                            }
                        </div>
                    </div>
                    <Pagination total={filteredOt.length} page={otPage} size={OT_SIZE} setPage={setOtPage} />
                </div>
            )}
        </div>
    );
};

export default UserTracking;