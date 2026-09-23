// src/hooks/useCheckin.js
// 打卡系统数据管理

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useCheckin() {
  const { user } = useAuth();
  const [checkinMap, setCheckinMap] = useState({});
  const [currentStreak, setCurrentStreak] = useState(0);
  const [todayChecked, setTodayChecked] = useState(false);
  const [totalDays, setTotalDays] = useState(0);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  const fetchCheckins = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000)
        .toISOString().split('T')[0];

      const { data } = await supabase
        .from('checkins')
        .select('checkin_date, streak_days, words_count')
        .eq('user_id', user.id)
        .gte('checkin_date', ninetyDaysAgo)
        .order('checkin_date', { ascending: false });

      const map = {};
      (data || []).forEach(r => { map[r.checkin_date] = true; });
      setCheckinMap(map);
      setTodayChecked(!!map[today]);
      setTotalDays((data || []).length);
      setCurrentStreak(data?.[0]?.streak_days || 0);
    } catch (err) {
      console.warn('checkins 查询失败（可能表不存在）:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user, today]);

  useEffect(() => { fetchCheckins(); }, [fetchCheckins]);

  const doCheckin = async (wordsCount = 0) => {
    if (!user || todayChecked) return { error: '已打卡或未登录' };

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const newStreak = checkinMap[yesterday] ? currentStreak + 1 : 1;

    try {
      const { error } = await supabase.from('checkins').upsert({
        user_id: user.id,
        checkin_date: today,
        words_count: wordsCount,
        streak_days: newStreak,
      }, { onConflict: 'user_id,checkin_date' });

      if (!error) {
        setTodayChecked(true);
        setCurrentStreak(newStreak);
        fetchCheckins();
      }
      return { error, streak: newStreak };
    } catch (err) {
      console.warn('doCheckin 失败:', err.message);
      return { error: err, streak: 0 };
    }
  };

  return {
    checkinMap, currentStreak, todayChecked, totalDays, loading,
    doCheckin, refetch: fetchCheckins
  };
}
