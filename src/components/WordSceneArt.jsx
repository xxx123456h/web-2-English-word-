// src/components/WordSceneArt.jsx
// 根据 Claude 生成的可视化场景描述，渲染为简洁 CSS 插图
// 零成本、零外部依赖，立即可用
//
// 升级：当提供 exampleSentence 时，缓存 key 会纳入例句，生成时也会以例句场景为中心

import { useState, useEffect } from 'react';
import { generateScene } from '../lib/services/sceneGen';

const MOOD_GRADIENTS = {
  happy:  'linear-gradient(135deg, #FEF3C7 0%, #FBBF24 100%)',
  calm:   'linear-gradient(135deg, #DBEAFE 0%, #93C5FD 100%)',
  active: 'linear-gradient(135deg, #FED7AA 0%, #F97316 100%)',
  warm:   'linear-gradient(135deg, #FECACA 0%, #F43F5E 100%)',
};

export function WordSceneArt({ word, meaning, exampleSentence, size = 160 }) {
  const [scene, setScene] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!word) return;

    let cancelled = false;
    // 缓存 key 纳入例句，例句不同时场景描述也不同
    const cacheKey = `scene::${(word || '').toLowerCase()}::${(meaning || '').slice(0, 30)}::${(exampleSentence || '').slice(0, 40)}`;

    if (window.__sceneCache && window.__sceneCache.has(cacheKey)) {
      setScene(window.__sceneCache.get(cacheKey));
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const result = await generateScene(word, meaning, exampleSentence);
        if (cancelled) return;
        if (result) {
          if (!window.__sceneCache) window.__sceneCache = new Map();
          window.__sceneCache.set(cacheKey, result);
          setScene(result);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [word, meaning, exampleSentence]);

  if (error) return null;
  if (!word) return null;

  const moodGradient = scene ? (MOOD_GRADIENTS[scene.mood] || MOOD_GRADIENTS.happy) : MOOD_GRADIENTS.happy;

  return (
    <div
      style={{
        width: size,
        height: size,
        margin: '0 auto 12px',
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0,
        background: loading ? MOOD_GRADIENTS.happy : moodGradient,
        backgroundSize: '200% 100%',
        animation: loading ? 'shimmer 1.5s linear infinite' : 'fadeUp 0.4s ease-out',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      {loading ? (
        <>
          <span style={{ fontSize: 32 }}>{String.fromCodePoint(0x1F3A8)}</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-light)' }}>生成插图中...</span>
        </>
      ) : scene ? (
        <>
          <div
            style={{
              fontSize: size * 0.45,
              lineHeight: 1,
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
              animation: 'bounceIn 0.4s ease-out',
            }}
          >
            {scene.emoji}
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: scene.fg,
              background: 'rgba(255,255,255,0.85)',
              padding: '2px 8px',
              borderRadius: 8,
              maxWidth: size - 16,
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {word}
          </div>
          {exampleSentence && (
            <div
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: scene.fg,
                background: 'rgba(255,255,255,0.7)',
                padding: '1px 6px',
                borderRadius: 6,
                maxWidth: size - 12,
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginTop: -2,
                opacity: 0.8,
              }}
            >
              📖 {exampleSentence}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
