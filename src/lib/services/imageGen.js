// src/lib/services/imageGen.js
// AI 图片生成服务：缓存查询 + Edge Function 调用

import { supabase } from '../supabase';

/**
 * Prompt 工程: 将单词 + 释义转换为图片生成 prompt
 * 风格: 简约彩色动漫, 无文字, 白色背景, 适合卡片展示
 */
export function buildImagePrompt(word, meaning, exampleSentence = '') {
  const baseStyle = [
    'simple cute anime illustration',
    'flat colorful style',
    'clean white background',
    'no text no letters no words',
    'chibi character style',
    'kawaii',
    'minimal detail',
    'suitable for vocabulary flashcard',
  ].join(', ');

  // 用释义和例句构造场景描述
  const scene = exampleSentence
    ? `illustrating the meaning: "${meaning}". Scene from: "${exampleSentence}"`
    : `illustrating the meaning: "${meaning}"`;

  return `${baseStyle}, ${scene}`;
}

/**
 * 调用 AI 图片生成 API
 * 优先通过 Supabase Edge Function 代理（key 不暴露）
 * 若 Edge Function 不可用，自动降级到直接调用第三方 API
 */
export async function generateWordImage(word, meaning, exampleSentence) {
  const prompt = buildImagePrompt(word, meaning, exampleSentence);

  // 方案 A: 通过 Supabase Edge Function 代理
  try {
    const { data, error } = await supabase.functions.invoke('generate-word-image', {
      body: { word, meaning, prompt },
    });
    if (!error && data?.imageUrl) {
      return data;
    }
    if (error) {
      console.warn('Edge Function 调用失败，尝试降级方案:', error.message);
    }
  } catch (err) {
    console.warn('Edge Function 不可用，使用降级方案:', err.message);
  }

  // 方案 B: 降级 — 尝试通过 Vercel API Route 代理
  try {
    const resp = await fetch('/api/ai-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, meaning, prompt }),
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data?.imageUrl) return data;
    }
  } catch (err) {
    console.warn('Vercel 降级 API 也失败:', err.message);
  }

  // 最终降级：返回 null，由 UI 静默隐藏
  return null;
}

/**
 * 查询缓存
 */
export async function getCachedImage(word, meaning) {
  if (!word) return null;
  try {
    const { data } = await supabase
      .from('word_images')
      .select('image_url')
      .eq('word', word.toLowerCase())
      .eq('meaning', meaning || '')
      .maybeSingle();

    return data?.image_url || null;
  } catch (err) {
    console.warn('查询 word_images 缓存失败:', err.message);
    return null;
  }
}