// src/components/WordDetailModal.jsx
import { useState, useEffect } from 'react';
import { PronounceButton } from './PronounceButton';
import { WordAiImage } from './WordAiImage';
import { ExampleSentence } from './ExampleSentence';
import { speak } from '../lib/services/pronunciation';
import { generateMemoryTip, getLocalMemoryTip } from '../lib/services/aiMemory';

export const WordDetailModal = ({ word, onClose, onMarkWord, accent = 'us' }) => {
  const [memoryData, setMemoryData] = useState(null);
  const [loadingMemory, setLoadingMemory] = useState(false);

  useEffect(() => {
    if (!word) return;
    // 先显示本地降级提示
    setMemoryData(getLocalMemoryTip(word.word, word.meaning));
    // 异步请求 AI 记忆提示
    setLoadingMemory(true);
    generateMemoryTip(word.word, word.meaning).then(data => {
      if (data) setMemoryData(data);
    }).catch(() => {}).finally(() => setLoadingMemory(false));
  }, [word]);

  if (!word) return null;

  const handleMark = (familiarity) => {
    onMarkWord?.(word.id, familiarity);
    onClose();
  };

  return (
    <div className="word-modal" onClick={onClose}>
      <div className="word-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-light)' }}>✕</button>
          <PronounceButton word={word.word} accent={accent} size={22} />
        </div>

        {/* Word */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--warm-700)' }}>{word.word}</div>
          <div style={{ fontSize: 15, color: 'var(--text-secondary)', fontWeight: 600, marginTop: 4 }}>
            {word.phonetic_us || word.phonetic || ''}
          </div>
        </div>

        {/* AI Image */}
        {word.ai_image_url && (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <img src={word.ai_image_url} alt={word.word} style={{
              width: '100%', maxHeight: 160, objectFit: 'cover',
              borderRadius: 'var(--radius-md)', border: '2px solid var(--warm-200)',
            }} />
          </div>
        )}

        {/* 🆕 AI 配图 — 单词详情弹窗 */}
        <WordAiImage
          word={word.word}
          meaning={word.meaning}
          exampleSentence={word.example}
          size={180}
        />

        {/* Meaning */}
        <div className="memory-section">
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--warm-600)', marginBottom: 4 }}>📝 释义</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            {word.pos && <span style={{ color: 'var(--blue-400)', marginRight: 6 }}>{word.pos}</span>}
            {word.meaning}
          </div>
        </div>

        {/* Root Affix */}
        {memoryData?.rootAffix && (
          <div className="memory-section root-affix">
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--blue-400)', marginBottom: 4 }}>🧩 词根拆解</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{memoryData.rootAffix}</div>
          </div>
        )}

        {/* Memory Tip */}
        <div className="memory-section memory-tip">
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--green-500)', marginBottom: 4 }}>💡 联想记忆</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {loadingMemory ? '✨ AI 正在生成记忆法...' : memoryData?.memoryTip || '暂无'}
          </div>
        </div>

        {/* Example — 使用新组件：点击整句朗读 + 目标词高亮 + 句意配图 */}
        {(word.example || memoryData?.example) && (
          <ExampleSentence
            sentence={word.example || memoryData?.example}
            translation={word.example_cn || memoryData?.exampleCN}
            word={word.word}
            meaning={word.meaning}
            accent={accent}
            size={180}
            showImage={true}
          />
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button
            className="btn-outline"
            style={{ flex: 1, borderColor: '#FECACA', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            onClick={() => handleMark(0)}
          >
            😕 不认识
          </button>
          <button
            className="btn-primary"
            style={{ flex: 1, background: 'linear-gradient(135deg, #4ADE80, #22C55E)', boxShadow: '0 4px 14px rgba(34,197,94,0.3)' }}
            onClick={() => handleMark(5)}
          >
            ✅ 已掌握
          </button>
        </div>
      </div>
    </div>
  );
};
