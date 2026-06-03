// src/hooks/useWordImage.js
// 获取单词 AI 配图的 Hook
// 策略: 内存缓存 → Supabase 缓存 → AI 生成

import { useState, useEffect } from 'react';
import { getCachedImage, generateWordImage } from '../lib/services/imageGen';

// 模块级内存缓存，避免同一会话内重复查库/重复生成
const imageCache = new Map();

export function useWordImage(word, meaning, exampleSentence) {
  const cacheKey = `${word?.toLowerCase() || ''}::${meaning || ''}`;

  const [imageUrl, setImageUrl] = useState(() => imageCache.get(cacheKey) || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!word) {
      setImageUrl(null);
      return;
    }

    // 命中内存缓存 → 直接使用
    if (imageCache.has(cacheKey)) {
      setImageUrl(imageCache.get(cacheKey));
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchImage = async () => {
      setLoading(true);
      setError(null);

      try {
        // Step 1: 查 Supabase 缓存
        const cached = await getCachedImage(word, meaning);
        if (cached && !cancelled) {
          imageCache.set(cacheKey, cached);
          setImageUrl(cached);
          setLoading(false);
          return;
        }

        // Step 2: 触发生成
        const result = await generateWordImage(word, meaning, exampleSentence);
        if (!cancelled) {
          if (result?.imageUrl) {
            imageCache.set(cacheKey, result.imageUrl);
            setImageUrl(result.imageUrl);
          } else {
            setImageUrl(null);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('useWordImage 失败:', err);
          setError(err.message || '加载失败');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchImage();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word, meaning, exampleSentence]);

  return { imageUrl, loading, error };
}
