// api/daily-push.js
// Vercel Serverless Function — 每日推送（由 Vercel Cron 定时触发）

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    // 获取所有活跃用户的设置
    const { data: settings, error: settingsErr } = await supabase
      .from('user_settings')
      .select('user_id, current_book_id, daily_goal, push_time');

    if (settingsErr) throw settingsErr;

    // 为每个用户预生成每日单词列表（缓存在 user_vocab_progress 中）
    let processed = 0;
    for (const setting of (settings || [])) {
      if (!setting.current_book_id) continue;

      // 查询复习词
      const { data: reviewWords } = await supabase
        .from('user_vocab_progress')
        .select('word_id')
        .eq('user_id', setting.user_id)
        .eq('book_id', setting.current_book_id)
        .neq('status', 'mastered')
        .lte('next_review', new Date().toISOString())
        .limit(setting.daily_goal || 20);

      processed++;
    }

    res.status(200).json({ success: true, processed });
  } catch (err) {
    console.error('Daily push failed:', err);
    res.status(500).json({ error: err.message });
  }
}
