// src/components/WordAiImage.jsx
// AI 配图展示组件（降级链路）
// 1) 先尝试真实图片（Supabase 缓存 → Edge Function → Vercel API）
// 2) 全部失败时使用 WordSceneArt（Claude 文本生成场景 + CSS 渲染）

import { useWordImage } from '../hooks/useWordImage';
import { WordSceneArt } from './WordSceneArt';

export function WordAiImage({ word, meaning, exampleSentence, size = 160 }) {
  const { imageUrl, loading, error } = useWordImage(word, meaning, exampleSentence);

  if (!word) return null;

  // 加载中、骨架屏
  if (loading) {
    return (
      <div
        style={{
          width: size,
          height: size,
          margin: '0 auto 12px',
          borderRadius: 20,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #FEF3C7, #FFEDD5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, #FEF3C7 25%, #FDE68A 50%, #FEF3C7 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s linear infinite',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 32 }}>🎨</span>
        </div>
      </div>
    );
  }

  // 真实图片加载成功
  if (imageUrl && !error) {
    return (
      <div
        style={{
          width: size,
          height: size,
          margin: '0 auto 12px',
          borderRadius: 20,
          overflow: 'hidden',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        <img
          src={imageUrl}
          alt={`${word} illustration`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            animation: 'fadeUp 0.4s ease-out',
          }}
          loading="lazy"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      </div>
    );
  }

  // 降级到 Claude 文本生成的 CSS 插图
  return <WordSceneArt word={word} meaning={meaning} size={size} />;
}
