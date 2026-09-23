// src/hooks/useProfile.js
// 用户资料管理

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      setProfile(data);
    } catch (err) {
      console.warn('profile 查询失败（可能表不存在）:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates) => {
    if (!user) return { error: '未登录' };
    // 自动过滤不存在的列（如 avatar_id 尚未迁移）
    let attemptUpdates = { ...updates, updated_at: new Date().toISOString() };
    let attempt = 1;
    let lastError = null;
    while (attempt <= 3) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update(attemptUpdates)
          .eq('id', user.id)
          .select()
          .single();
        if (!error) {
          setProfile(data)
          return { data, error: null }
        }
        // 缺字段时自动剔除该字段再试
        if (error.code === 'PGRST204') {
          const match = (error.message || '').match(/Could not find the '([^']+)' column/)
          if (match) {
            const missing = match[1]
            console.warn(`profiles 表缺少字段 ${missing}，已自动剔除并重试`)
            delete attemptUpdates[missing]
            attempt += 1
            lastError = error
            continue
          }
        }
        return { data: null, error }
      } catch (err) {
        lastError = err
        attempt += 1
      }
    }
    // 重试 3 次仍然失败 → 抛出友好错误（带修复 SQL）
    const missing = lastError?.missing || 'avatar_id'
    const fixSql = generateFixSql(missing)
    return {
      data: null,
      error: lastError,
      fixSql,
      fixInstruction: `请在 Supabase SQL Editor 中执行以下 SQL 添加缺失字段：\n\n${fixSql}\n\n执行后刷新页面即可。`,
    }
  };

  return { profile, loading, updateProfile, refetch: fetchProfile };
}

function generateFixSql(column) {
  if (column === 'avatar_id') {
    return `-- 一键修复：添加 avatar_id 字段到 profiles 表
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_id INT DEFAULT NULL;
COMMENT ON COLUMN public.profiles.avatar_id IS '5 选 1 动漫头像 ID (1-5)';`
  }
  return `-- 添加缺失字段
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ${column} TEXT DEFAULT '';`
}
