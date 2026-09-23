// src/components/ExampleSentence.jsx
// 例句展示组件 — 整句点击发音 + 目标单词视觉脉冲高亮 + 句意 AI 配图
//
// 设计目标：
// 1. 点击整句 → 流畅朗读（无断句），使用有道 MP3 + 内存缓存
// 2. 鼠标悬停/聚焦时预加载 MP3（用户点击前音频已在浏览器缓存）
// 3. 句中目标单词视觉脉冲高亮（用 timeupdate 驱动 CSS 动画）
// 4. 配图基于例句场景生成（更精准、具象）
//
// 入参：
//   sentence: 英文例句
//   translation: 中文翻译（可选）
//   word: 目标单词（用于高亮 + 配图场景）
//   meaning: 目标单词释义（用于配图场景）
//   accent: 'us' | 'uk'
//   size: 配图尺寸
//   showImage: 是否显示 AI 配图（默认 true）

import { useState, useEffect, useRef, useCallback } from 'react';
import { speak, speakSentence, preloadSentence } from '../lib/services/pronunciation';
import { WordAiImage } from './WordAiImage';

const SpeakerIcon = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
);

/**
 * 在句子中查找目标单词的字符位置范围 [start, end)
 * - 优先单词边界匹配
 * - 找不到则 fallback 字符串匹配
 */
function findWordRange(sentence, word) {
  if (!sentence || !word) return null;
  const escaped = String(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\b${escaped}\\b`, 'i');
  const m = sentence.match(re);
  if (m) return { start: m.index, end: m.index + m[0].length };
  const lower = sentence.toLowerCase();
  const i = lower.indexOf(String(word).toLowerCase());
  if (i >= 0) return { start: i, end: i + String(word).length };
  return null;
}

/**
 * 高亮句子中的目标单词。
 * - 不区分大小写匹配
 * - 保留原句标点和大小写
 * - 返回 React nodes 数组
 */
function highlightWordInSentence(sentence, word, isPlayingThisWord = false) {
  if (!sentence || !word) return [sentence];
  const escaped = String(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\b(${escaped})\\b`, 'gi');
  const parts = [];
  let lastIdx = 0;
  let m;
  while ((m = re.exec(sentence)) !== null) {
    if (m.index > lastIdx) parts.push(sentence.slice(lastIdx, m.index));
    parts.push(
      <mark
        key={`hl-${m.index}`}
        className={`example-word-highlight ${isPlayingThisWord ? 'is-playing' : ''}`}
        onClick={(e) => { e.stopPropagation(); speak(m[0]); }}
        title={`点击发音: ${m[0]}`}
        style={{
          background: isPlayingThisWord
            ? 'linear-gradient(180deg, transparent 35%, rgba(251,191,36,0.7) 35%)'
            : 'linear-gradient(180deg, transparent 55%, rgba(251,191,36,0.35) 55%)',
          color: 'var(--warm-700)',
          fontWeight: 900,
          padding: '0 2px',
          borderRadius: 3,
          cursor: 'pointer',
          transform: isPlayingThisWord ? 'scale(1.12)' : 'scale(1)',
          display: 'inline-block',
          transition: 'transform 0.15s ease-out, background 0.2s',
          textShadow: isPlayingThisWord ? '0 0 8px rgba(251,191,36,0.4)' : 'none',
        }}
      >{m[0]}</mark>
    );
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < sentence.length) parts.push(sentence.slice(lastIdx));
  return parts;
}

export function ExampleSentence({
  sentence,
  translation,
  word,
  meaning,
  accent = 'us',
  size = 160,
  showImage = true,
  borderColor = 'var(--warm-400)',
  labelColor = 'var(--warm-600)',
}) {
  const [playing, setPlaying] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);
  const [pulseActive, setPulseActive] = useState(false);
  const audioRef = useRef(null);

  // 目标单词在句中的字符范围
  const wordRange = findWordRange(sentence, word);

  const handlePreload = useCallback(() => {
    preloadSentence(sentence, accent);
  }, [sentence, accent]);

  const handlePlay = async (e) => {
    e?.stopPropagation();
    if (playing) return;
    setPlaying(true);
    setPulseActive(true);
    try {
      const { audio } = await speakSentence(sentence, { accent });
      audioRef.current = audio;
      if (audio) {
        // 基于句中字符位置比例驱动视觉脉冲
        if (wordRange && sentence) {
          const total = sentence.length;
          const startRatio = wordRange.start / total;
          const endRatio = wordRange.end / total;
          let duration = 0;
          const onMeta = () => {
            duration = audio.duration || 0;
            audio.removeEventListener('loadedmetadata', onMeta);
          };
          audio.addEventListener('loadedmetadata', onMeta);

          const onTimeUpdate = () => {
            if (!duration || !isFinite(duration)) return;
            const t = audio.currentTime / duration;
            if (t >= startRatio && t <= endRatio + 0.02) {
              setPulseActive(true);
            } else {
              setPulseActive(false);
            }
          };
          audio.addEventListener('timeupdate', onTimeUpdate);
          audio.addEventListener('ended', () => {
            setPulseActive(false);
            audio.removeEventListener('timeupdate', onTimeUpdate);
          }, { once: true });
        }
      }
    } catch (err) {
      console.warn('例句朗读失败:', err);
    } finally {
      // 用真实 ended 事件来关闭 playing 状态更准，但为保险加 timeout 兜底
      setTimeout(() => {
        setPlaying(false);
        setPulseActive(false);
      }, 15000);
    }
  };

  // 卸载时清理
  useEffect(() => {
    return () => {
      setPulseActive(false);
    };
  }, [sentence]);

  if (!sentence && !translation) return null;

  const highlighted = highlightWordInSentence(sentence, word, pulseActive);

  return (
    <div className="memory-section" style={{ borderLeftColor: borderColor }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
        flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: labelColor }}>📖 例句</div>

        {/* 整句朗读按钮 — hover/focus/touch 预加载 */}
        <button
          onClick={handlePlay}
          onMouseEnter={handlePreload}
          onFocus={handlePreload}
          onTouchStart={handlePreload}
          disabled={!sentence}
          title="点击朗读整句例句（悬停即开始预加载）"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 10px',
            border: '1.5px solid var(--warm-300)',
            borderRadius: 14,
            background: playing ? 'var(--warm-100)' : 'white',
            color: playing ? 'var(--orange-500)' : 'var(--warm-600)',
            fontSize: 11, fontWeight: 800,
            cursor: 'pointer', fontFamily: 'inherit',
            transform: playing ? 'scale(1.05)' : 'scale(1)',
            transition: 'all 0.2s',
          }}
        >
          <SpeakerIcon size={12} />
          {playing ? '播放中…' : '点击朗读整句'}
        </button>

        {/* 配图展开/收起 */}
        {showImage && word && (
          <button
            onClick={() => setImageExpanded(v => !v)}
            title="切换句意配图"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 10px',
              border: '1.5px dashed var(--blue-400)',
              borderRadius: 14,
              background: imageExpanded ? 'var(--blue-50)' : 'transparent',
              color: 'var(--blue-400)',
              fontSize: 11, fontWeight: 800,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
          >
            🎨 {imageExpanded ? '隐藏句意配图' : '查看句意配图'}
          </button>
        )}
      </div>

      {/* 句意配图 — 基于例句场景生成（更精准） */}
      {showImage && imageExpanded && word && (
        <div style={{
          margin: '8px 0 12px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          animation: 'fadeUp 0.35s ease-out',
        }}>
          <WordAiImage
            word={word}
            meaning={meaning}
            exampleSentence={sentence}
            size={size}
          />
          <div style={{
            fontSize: 10, fontWeight: 700, color: 'var(--text-light)',
            marginTop: 2, textAlign: 'center',
          }}>
            🎯 基于「{word}」的例句场景生成
          </div>
        </div>
      )}

      {/* 例句正文 - 整句可点击播放 + hover 预加载 */}
      {sentence && (
        <div
          onClick={handlePlay}
          onMouseEnter={handlePreload}
          onTouchStart={handlePreload}
          title="点击朗读整句"
          style={{
            fontSize: 14, fontWeight: 600,
            fontStyle: 'italic',
            lineHeight: 1.6,
            color: 'var(--text-primary)',
            cursor: 'pointer',
            userSelect: 'text',
            padding: '6px 8px',
            borderRadius: 8,
            transition: 'background 0.2s',
            background: playing ? 'var(--warm-50)' : 'transparent',
          }}
          onMouseEnterCapture={(e) => { if (!playing) e.currentTarget.style.background = 'rgba(251,191,36,0.06)'; }}
          onMouseLeave={(e) => { if (!playing) e.currentTarget.style.background = 'transparent'; }}
        >
          "{highlighted}"
        </div>
      )}

      {/* 中文翻译 */}
      {translation && (
        <div style={{
          fontSize: 13, color: 'var(--text-secondary)',
          fontWeight: 600, marginTop: 6, lineHeight: 1.5,
        }}>
          {translation}
        </div>
      )}
    </div>
  );
}

export default ExampleSentence;
