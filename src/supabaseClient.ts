import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sptmzqontngwkdqyhvdg.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_oCgFRkEYm91EGrGSGu6lDg_37jS2TZl';

if (!supabaseUrl || !supabaseKey) {
    throw new Error(
        'Supabase yapılandırması eksik. Proje kökündeki .env dosyasına veya ortam değişkenlerine ' +
        'VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY değerlerini ekleyin.'
    );
}

// Sondaki eğik çizgi supabase-js'in ürettiği adresleri bozar (".../co//rest/v1")
const normalizedUrl = supabaseUrl.replace(/\/+$/, '');

export const supabase = createClient(normalizedUrl, supabaseKey);
