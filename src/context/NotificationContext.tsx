import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { useExchange } from '../hooks/useExchange';

export type AnnouncementType = 'onemli' | 'uyari' | 'bilgi' | 'basari' | 'duyuru';

export interface AnnouncementOptions {
    flash?: boolean;
    toast?: boolean;
    bell?: boolean;
}

export interface Announcement {
    id: string;
    title: string;
    message: string | null;
    type: AnnouncementType;
    target_group: string;
    options: AnnouncementOptions;
    created_at: string;
    created_by: string | null;
    is_read?: boolean;
}

interface NotificationContextProps {
    announcements: Announcement[];
    unreadCount: number;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteAnnouncement: (id: string) => Promise<boolean>;
    sendAnnouncement: (data: Omit<Announcement, 'id' | 'created_at'>) => Promise<boolean>;
    activeFlash: Announcement | null;
    hideFlash: () => void;
    activeToasts: Announcement[];
    removeToast: (id: string) => void;
    triggerShake: boolean;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { currentUser } = useExchange();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [activeFlash, setActiveFlash] = useState<Announcement | null>(null);
    const [activeToasts, setActiveToasts] = useState<Announcement[]>([]);
    const [triggerShake, setTriggerShake] = useState(false);

    // Derived state for unread count
    const unreadCount = announcements.filter(a => !a.is_read).length;

    const fetchAnnouncements = useCallback(async () => {
        if (!currentUser) {
            setAnnouncements([]);
            return;
        }

        try {
            // First fetch the raw announcements meant for this user or all users.
            const query = supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false });

            // On frontend we can filter by target_group to be safe, though RLS could handle it 
            // if we built a more complex policy. For now we will fetch all and filter in memory, 
            // or we could use an OR query. Let's use an OR query to save bandwidth.
            const role = currentUser.role;
            let targetFilter = 'target_group.eq.Tüm Üyeler';
            if (role === 'Admin' || role === 'Yönetici') targetFilter += ',target_group.eq.Yöneticiler';
            if (role === 'Üye') targetFilter += ',target_group.eq.Standart Üye';
            // Example for Teknisyen if it existed as a role.

            query.or(targetFilter);

            const { data: annData, error: annError } = await query;

            if (annError) {
                console.error("Error fetching announcements:", annError);
                return;
            }

            if (!annData || annData.length === 0) {
                setAnnouncements([]);
                return;
            }

            // Then fetch read receipts for THIS user
            const { data: readData, error: readError } = await supabase
                .from('user_notifications')
                .select('announcement_id, is_read')
                .eq('user_id', currentUser.id);

            if (readError) {
                console.error("Error fetching read statuses:", readError);
            }

            const readSet = new Set(readData?.filter(r => r.is_read).map(r => r.announcement_id) || []);

            const enriched = annData.map(a => ({
                ...a,
                is_read: readSet.has(a.id)
            })) as Announcement[];

            setAnnouncements(enriched);

        } catch (err) {
            console.error(err);
        }
    }, [currentUser]);

    // Initial load
    useEffect(() => {
        fetchAnnouncements();
    }, [fetchAnnouncements]);

    // Subscription for Realtime
    useEffect(() => {
        if (!currentUser) return;

        const handleNewAnnouncement = (payload: any) => {
            const newObj = payload.new as Announcement;
            // Check if it's targeted to this user
            const tg = newObj.target_group;
            const role = currentUser.role;
            const isTargeted = tg === 'Tüm Üyeler' ||
                (tg === 'Yöneticiler' && (role === 'Admin' || role === 'Yönetici')) ||
                (tg === 'Standart Üye' && role === 'Üye');

            if (isTargeted) {
                newObj.is_read = false; // it's new
                setAnnouncements(prev => [newObj, ...prev]);

                const opts = newObj.options || {};

                if (opts.flash) {
                    setActiveFlash(newObj);
                    // auto dismiss after 7s
                    setTimeout(() => {
                        setActiveFlash(prev => prev?.id === newObj.id ? null : prev);
                    }, 7000);
                }

                if (opts.toast) {
                    setActiveToasts(prev => [newObj, ...prev]);
                    // auto dismiss after 4.5s
                    setTimeout(() => {
                        setActiveToasts(prev => prev.filter(t => t.id !== newObj.id));
                    }, 4500);
                }

                if (opts.bell) {
                    setTriggerShake(prev => !prev);
                }
            }
        };

        const channel = supabase.channel('announcements_changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, handleNewAnnouncement)
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'announcements' }, (payload) => {
                setAnnouncements(prev => prev.filter(a => a.id !== payload.old.id));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser]);

    const markAsRead = async (id: string) => {
        if (!currentUser) return;
        setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));

        await supabase.from('user_notifications').upsert({
            user_id: currentUser.id,
            announcement_id: id,
            is_read: true
        });
    };

    const markAllAsRead = async () => {
        if (!currentUser) return;
        const unreadIds = announcements.filter(a => !a.is_read).map(a => a.id);
        if (unreadIds.length === 0) return;

        setAnnouncements(prev => prev.map(a => ({ ...a, is_read: true })));

        const inserts = unreadIds.map(aid => ({
            user_id: currentUser.id,
            announcement_id: aid,
            is_read: true
        }));

        await supabase.from('user_notifications').upsert(inserts);
    };

    const deleteAnnouncement = async (id: string) => {
        try {
            const { error } = await supabase.from('announcements').delete().eq('id', id);
            if (error) throw error;
            return true;
        } catch (err) {
            console.error("Failed to delete announcement", err);
            return false;
        }
    };

    const sendAnnouncement = async (data: Omit<Announcement, 'id' | 'created_at'>) => {
        try {
            const { error } = await supabase.from('announcements').insert([{
                ...data,
                created_by: currentUser?.id
            }]);
            if (error) throw error;
            return true;
        } catch (err) {
            console.error("Failed to send announcement", err);
            return false;
        }
    };

    const hideFlash = () => setActiveFlash(null);
    const removeToast = (id: string) => setActiveToasts(prev => prev.filter(t => t.id !== id));

    return (
        <NotificationContext.Provider value={{
            announcements,
            unreadCount,
            markAsRead,
            markAllAsRead,
            deleteAnnouncement,
            sendAnnouncement,
            activeFlash,
            hideFlash,
            activeToasts,
            removeToast,
            triggerShake
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
