// src/hooks/useUserSettings.js
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getUserSettings, updateUserSettings } from '../lib/services/vocabBooks';

export function useUserSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    daily_goal: 20,
    accent: 'us',
    auto_pronounce: true,
    push_time: '08:00',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      try {
        const data = await getUserSettings();
        if (data) setSettings(prev => ({ ...prev, ...data }));
      } catch (err) {
        console.warn('加载设置失败:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const updateSettings = useCallback(async (updates) => {
    try {
      const data = await updateUserSettings(updates);
      setSettings(prev => ({ ...prev, ...data }));
      return data;
    } catch (err) {
      console.error('更新设置失败:', err);
    }
  }, []);

  return { settings, loading, updateSettings };
}
