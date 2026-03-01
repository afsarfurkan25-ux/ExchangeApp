import { createClient } from '@supabase/supabase-js';

const url = 'https://sptmzqontngwkdqyhvdg.supabase.co';
const key = 'sb_publishable_oCgFRkEYm91EGrGSGu6lDg_37jS2TZl';

const supabase = createClient(url, key);

async function testHistoryLogs() {
    console.log('Testing getting history_logs...');
    const { data: logs, error: getError } = await supabase.from('history_logs').select('*');

    if (getError) {
        console.error('Get Error:', JSON.stringify(getError, null, 2));
    } else {
        console.log('Get Success:', logs);
    }
}

testHistoryLogs();
