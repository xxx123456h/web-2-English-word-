// src/hooks/useDailyRating.js
// 每日评级状态管理

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { calcDailyScore, getRating, getRandomFeedback } from '../lib/utils/rating';

export function useDailyRating() {
  const { user } = useAuth();
  const [todayStats, setTodayStats] = useState(null);
  const [rating, setRating] = useState(null);
  const [feedback, setFeedback] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const fetchToday = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('user_id', user.id)
        .eq('stat_date', today)
        .maybeSingle();

      if (data) {
        setTodayStats(data);
        const score = calcDailyScore({
          wordsLearned: data.words_learned,
          wordsReviewed: data.words_reviewed,
          quizTotal: data.quiz_total,
          quizCorrect: data.quiz_correct,
          streakDays: data.streak_days || 0,
        });
        const r = getRating(score);
        setRating(r);
        setFeedback(getRandomFeedback(r));
      } else {
        // 当日暂无统计，默认 0 分（最差）
        const r = getRating(0);
        setRating(r);
        setFeedback(getRandomFeedback(r));
      }
    } catch (err) {
      console.warn('daily_stats 查询失败（可能表不存在）:', err.message);
      const r = getRating(0);
      setRating(r);
      setFeedback(getRandomFeedback(r));
    }
  }, [user, today]);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  // 学习/复习单词后调用
  const recordLearn = async (count, isReview = false) => {
    if (!user) return;
    const field = isReview ? 'words_reviewed' : 'words_learned';
    try {
      await supabase.rpc('increment_daily_stat', {
        p_user_id: user.id,
        p_date: today,
        p_field: field,
        p_value: count,
      });
    } catch (err) {
      console.warn('recordLearn RPC 失败:', err.message);
    }
    fetchToday();
  };

  // 测验结束后调用
  const recordQuiz = async (total, correct) => {
    if (!user) return;
    try {
      await supabase.rpc('increment_daily_stat', {
        p_user_id: user.id,
        p_date: today,
        p_field: 'quiz_total',
        p_value: total,
      });
      await supabase.rpc('increment_daily_stat', {
        p_user_id: user.id,
        p_date: today,
        p_field: 'quiz_correct',
        p_value: correct,
      });
    } catch (err) {
      console.warn('recordQuiz RPC 失败:', err.message);
    }
    fetchToday();
  };

  return { todayStats, rating, feedback, recordLearn, recordQuiz, refetch: fetchToday };
}
