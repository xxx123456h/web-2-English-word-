// src/components/DailyWordsCard.jsx
import { PronounceButton } from './PronounceButton';

const MiniWordCard = ({ word, onClick }) => (
  <div className="mini-word-card" onClick={() => onClick?.(word)}>
    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--warm-700)', marginBottom: 2 }}>{word.word}</div>
    <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>{word.meaning?.slice(0, 8)}</div>
    <div style={{ marginTop: 4 }}>
      <PronounceButton word={word.word} size={14} />
    </div>
  </div>
);

export const DailyWordsCard = ({ dailyWords, currentBook, onStartLearn, onChangeBook, onWordClick }) => {
  const newWords = dailyWords.filter(w => w.status === 'new');
  const reviewWords = dailyWords.filter(w => w.status === 'reviewing');

  if (!currentBook) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 20 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>📖</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--warm-700)', marginBottom: 4 }}>选择一本词书开始学习</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 12 }}>
          初中、高中、四六级、雅思任你选
        </div>
        <button className="btn-primary" onClick={onChangeBook}>选择词书</button>
      </div>
    );
  }

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="section-title">
        📖 今日新词
        <span className="badge badge-warm" style={{ marginLeft: 'auto' }}>
          {currentBook.cover_emoji} {currentBook.name}
        </span>
      </div>

      {/* 横向滚动预览 */}
      {dailyWords.length > 0 ? (
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '8px 0' }}>
          {dailyWords.slice(0, 8).map(w => (
            <MiniWordCard key={w.id} word={w} onClick={onWordClick} />
          ))}
          {dailyWords.length > 8 && (
            <div className="mini-word-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)' }}>
              +{dailyWords.length - 8}
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)', fontWeight: 600 }}>
          今天没有新词了，明天再来 🎉
        </div>
      )}

      {/* 统计 */}
      <div style={{ display: 'flex', gap: 16, margin: '12px 0' }}>
        <span className="badge badge-blue">🆕 新词 {newWords.length}</span>
        <span className="badge badge-warm">🔄 复习 {reviewWords.length}</span>
      </div>

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn-primary" style={{ flex: 2 }} onClick={onStartLearn}>
          开始学习 →
        </button>
        <button className="btn-outline" style={{ flex: 1 }} onClick={onChangeBook}>
          换词书
        </button>
      </div>
    </div>
  );
};
