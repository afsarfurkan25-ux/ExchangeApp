import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error(
        'Supabase yapılandırması eksik. Proje kökündeki .env dosyasına VITE_SUPABASE_URL ve ' +
        'VITE_SUPABASE_ANON_KEY değerlerini ekleyip dev sunucusunu yeniden başlatın. ' +
        '(.env yalnızca açılışta okunur, kaydetmek tek başına yetmez.)'
    );
}

// Sondaki eğik çizgi supabase-js'in ürettiği adresleri bozar (".../co//rest/v1")
const normalizedUrl = supabaseUrl.replace(/\/+$/, '');

export const supabase = createClient(normalizedUrl, supabaseKey);
