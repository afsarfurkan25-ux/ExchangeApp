import { supabase } from '../supabaseClient';
import type { Member } from '../context/ExchangeContext';

export const onMemberLogin = async (member: Member) => {
    // Detect device/browser info
    const ua = navigator.userAgent;
    const browser = ua.includes('Edg') ? 'Edge'
        : ua.includes('Chrome') ? 'Chrome'
            : ua.includes('Firefox') ? 'Firefox'
                : 'Safari';
    const os = ua.includes('Windows') ? 'Win'
        : ua.includes('Mac') ? 'Mac'
            : ua.includes('Android') ? 'Android'
                : 'iOS';
    const deviceInfo = `${browser} / ${os}`;

    // Normalize role key for presence table
    let memberRole = 'uye';
    if (member.role === 'Admin') memberRole = 'admin';
    else if (member.role === 'Yönetici') memberRole = 'yonetici';

    // 1. Create traditional user_sessions record
    const { data: sessionData, error: sessionError } = await supabase.from('user_sessions').insert([{
        member_id: member.id,
        ip_address: 'localhost',
        device_info: deviceInfo,
    }]).select('id').single();

    if (sessionError) {
        console.error('Error creating user session', sessionError);
    }

    // 2. Upsert real-time user_presence (includes name/role/device for display)
    const { error: presenceError } = await supabase.from('user_presence').upsert({
        member_id: member.id,
        member_name: member.name,
        member_role: memberRole,
        is_online: true,
        last_seen: new Date().toISOString(),
        login_time: new Date().toISOString(),
        device_info: deviceInfo,
    }, { onConflict: 'member_id' });

    if (presenceError) {
        console.error('Error updating user presence on login', presenceError);
    }

    // 3. Log activity
    await supabase.from('activities').insert([{
        member_id: member.id,
        user_name: member.name,
        type: 'giris',
        icon: '🔑',
        text_content: `<span class="ak-isim">${member.name}</span> sisteme giriş yaptı`
    }]);

    return sessionData;
};

export const onMemberLogout = async (member: Member, sessionId: string | null) => {
    // 1. End user_sessions record
    if (sessionId) {
        await supabase.from('user_sessions')
            .update({ is_active: false, logout_time: new Date().toISOString() })
            .eq('id', sessionId);
    }

    // 2. Update real-time user_presence to offline
    await supabase.from('user_presence').upsert({
        member_id: member.id,
        is_online: false,
        last_seen: new Date().toISOString()
    }, { onConflict: 'member_id' });

    // 3. Log activity
    await supabase.from('activities').insert([{
        member_id: member.id,
        user_name: member.name,
        type: 'cikis',
        icon: '🚪',
        text_content: `<span class="ak-isim">${member.name}</span> oturumu kapattı`
    }]);
};
