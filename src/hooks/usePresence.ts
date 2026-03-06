import { useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import type { Member } from '../context/ExchangeContext';

export function usePresence(currentUser: Member | null) {
    const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        // If no user is logged in, do not ping
        if (!currentUser) return;

        // The function to execute the ping logic
        const pingPresence = async () => {
            // Memory Leak Önlemi: Eğer internet yoksa boş yere arkada hata üretmeyi engelle
            if (!navigator.onLine) return;

            try {
                const { error } = await supabase.from('user_presence').upsert({
                    member_id: currentUser.id,
                    is_online: true,
                    last_seen: new Date().toISOString()
                }, { onConflict: 'member_id' });

                if (error) throw error;
            } catch (err) {
                // Spamlari engellemek için sadece bağlantı varsa hata at
                if (navigator.onLine) {
                    console.error("Ping error:", err);
                }
            }
        };

        // Immediate ping when user first logs in or app loads
        pingPresence();

        // Set interval exactly like a heartbeat (every 30 seconds to stay safely within the 60 second cron window limits)
        pingIntervalRef.current = setInterval(pingPresence, 30000);

        return () => {
            // Cleanup when unmounting or user changes
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
            }
        };
    }, [currentUser]);
}
