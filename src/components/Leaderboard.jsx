// src/components/Leaderboard.jsx
// 好友排行榜组件
// type: 'accuracy' | 'words' | 'streak'

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Leaderboard({ friends, currentUserId, type = 'accuracy' }) {
  const [rankings, setRankings] = useState([]);

  useEffect(() => {
    if (!friends.length) {
      setRankings([]);
      return;
    }
    fetchRankings();
  }, [friends, type]);

  const fetchRankings = async () => {
    const allIds = [...friends.map(f => f.id), currentUserId];

    if (type === 'streak') {
      const { data } = await supabase
        .from('checkins')
        .select('user_id, streak_days')
        .in('user_id', allIds)
        .order('checkin_date', { ascending: false });
      const latestMap = {};
      (data || []).forEach(row => {
        if (!latestMap[row.user_id]) latestMap[row.user_id] = row.streak_days;
      });
      const list = allIds.map(uid => ({
        user_id: uid,
        value: latestMap[uid] || 0,
        label: `${latestMap[uid] || 0} 天`
      }));
      list.sort((a, b) => b.value - a.value);
      setRankings(list);
    } else {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
        .toISOString().split('T')[0];
      const { data } = await supabase
        .from('daily_stats')
        .select('user_id, words_learned, words_reviewed, quiz_total, quiz_correct')
        .in('user_id', allIds)
        .gte('stat_date', sevenDaysAgo);

      const agg = {};
      allIds.forEach(uid => agg[uid] = { words: 0, total: 0, correct: 0 });
      (data || []).forEach(r => {
        if (!agg[r.user_id]) agg[r.user_id] = { words: 0, total: 0, correct: 0 };
        agg[r.user_id].words += (r.words_learned + r.words_reviewed);
        agg[r.user_id].total += r.quiz_total;
        agg[r.user_id].correct += r.quiz_correct;
      });

      const list = allIds.map(uid => {
        const a = agg[uid];
        if (type === 'accuracy') {
          const rate = a.total > 0 ? Math.round((a.correct / a.total) * 100) : 0;
          return { user_id: uid, value: rate, label: `${rate}%` };
        }
        return { user_id: uid, value: a.words, label: `${a.words} 词` };
      });
      list.sort((a, b) => b.value - a.value);
      setRankings(list);
    }
  };

  const medals = ['🥇', '🥈', '🥉'];
  const allUsers = [...friends, { id: currentUserId, nickname: '我' }];
  const getName = (uid) => allUsers.find(u => u.id === uid)?.nickname || '未知';

  return (
    <div>
      {rankings.map((r, i) => (
        <div key={r.user_id} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', borderRadius: 14,
          background: r.user_id === currentUserId
            ? 'linear-gradient(135deg, var(--warm-50), var(--orange-50))'
            : 'white',
          border: r.user_id === currentUserId ? '2px solid var(--warm-300)' : '1px solid #f0f0f0',
          marginBottom: 8
        }}>
          <span style={{ fontSize: 20, width: 32, textAlign: 'center' }}>
            {i < 3 ? medals[i] : `${i + 1}`}
          </span>
          <span style={{ flex: 1, fontWeight: 700, fontSize: 15 }}>
            {getName(r.user_id)}
            {r.user_id === currentUserId && ' (我)'}
          </span>
          <span style={{ fontWeight: 800, color: 'var(--warm-600)', fontSize: 15 }}>
            {r.label}
          </span>
        </div>
      ))}
    </div>
  );
}
