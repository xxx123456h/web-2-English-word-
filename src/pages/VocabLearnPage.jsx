// src/pages/VocabLearnPage.jsx
// 词书推送学习页 — 嵌入 App.jsx 的 pages 对象即可
//
// 使用方式（在 App.jsx 中）：
//   import VocabLearnPage from "./pages/VocabLearnPage"
//   const vocabLearn = useVocabLearn()
//   pages = { ..., vocablearn: <VocabLearnPage {...vocabLearn} /> }

import { useState } from "react";
import { WordAiImage } from "../components/WordAiImage";

// ============ 子组件：发音按钮 ============
const speak = (word, accent = "us") => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = accent === "uk" ? "en-GB" : "en-US";
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  } else {
    const type = accent === "uk" ? 1 : 2;
    new Audio(
      `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${type}`
    ).play().catch(() => {});
  }
};

const SpeakerIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
);

// ============ 子组件：词书选择弹窗 ============
const BookSelectorModal = ({ books, currentBook, onSelect, onClose }) => (
  <div style={{
    position: "fixed", inset: 0, zIndex: 200,
    background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 20, animation: "fadeUp 0.25s ease-out",
  }} onClick={onClose}>
    <div style={{
      background: "var(--bg-card)", borderRadius: "var(--radius-xl)",
      padding: 24, width: "100%", maxWidth: 380,
      boxShadow: "var(--shadow-lg)", maxHeight: "80vh", overflowY: "auto",
    }} onClick={e => e.stopPropagation()}>
      <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 20, textAlign: "center", color: "var(--warm-700)" }}>
        📚 选择你的词书
      </div>
      {books.map(book => {
        const isActive = currentBook?.id === book.id;
        return (
          <div key={book.id} onClick={() => onSelect(book.id)} style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "14px 16px", borderRadius: "var(--radius-md)",
            border: isActive ? "2px solid var(--warm-400)" : "2px solid var(--warm-100)",
            background: isActive ? "linear-gradient(135deg, var(--warm-50), var(--orange-50))" : "white",
            boxShadow: isActive ? "0 2px 12px rgba(249,115,22,0.15)" : "none",
            marginBottom: 10, cursor: "pointer", transition: "all 0.2s",
          }}>
            <span style={{ fontSize: 32 }}>{book.cover_emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>{book.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600, marginTop: 2 }}>{book.description}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--warm-600)" }}>{book.word_count}</div>
              <div style={{ fontSize: 11, color: "var(--text-light)" }}>词</div>
            </div>
            {isActive && <span style={{ fontSize: 18 }}>✓</span>}
          </div>
        );
      })}
    </div>
  </div>
);

// ============ 子组件：生词本弹窗 ============
const UnknownWordsModal = ({ words, onClose }) => (
  <div style={{
    position: "fixed", inset: 0, zIndex: 200,
    background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)",
    display: "flex", alignItems: "flex-end", justifyContent: "center",
    animation: "fadeUp 0.3s ease-out",
  }} onClick={onClose}>
    <div style={{
      background: "var(--bg-card)",
      borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
      padding: "24px 20px 40px", width: "100%", maxWidth: 420,
      maxHeight: "75vh", overflowY: "auto",
      animation: "fadeUp 0.35s ease-out",
    }} onClick={e => e.stopPropagation()}>
      <div style={{
        width: 40, height: 4, borderRadius: 2, background: "var(--warm-200)",
        margin: "0 auto 16px",
      }} />
      <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 4, color: "var(--warm-700)" }}>
        📕 我的生词本
      </div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600, marginBottom: 16 }}>
        这些词会被反复推送，直到你掌握为止
      </div>

      {words.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-light)" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
          <div style={{ fontWeight: 700 }}>暂无生词，继续加油！</div>
        </div>
      ) : (
        words.map((w, i) => (
          <div key={w.id} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 0",
            borderBottom: i < words.length - 1 ? "1px solid rgba(251,191,36,0.1)" : "none",
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 800 }}>{w.word}</span>
                <span style={{ fontSize: 12, color: "var(--text-light)" }}>
                  {w.phonetic_us || w.phonetic_uk || ""}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600, marginTop: 2 }}>
                {w.pos ? `${w.pos} ` : ""}{w.meaning}
              </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); speak(w.word); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--warm-500)", padding: 6 }}>
              <SpeakerIcon size={18} />
            </button>
            <div style={{
              fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 10,
              background: "var(--coral-50)", color: "#E11D48",
            }}>
              ×{w._progress?.review_count || 0}
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

// ============ 主组件：VocabLearnPage ============
export default function VocabLearnPage({
  books, currentBook, settings, dailyWords, unknownWords, progress,
  sortMode, loading, loadingWords,
  selectBook, markWord, toggleSortMode, setSortMode, refresh,
}) {
  const [showBookSelector, setShowBookSelector] = useState(false);
  const [showUnknownList, setShowUnknownList] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideDir, setSlideDir] = useState(null);    // 'left' | 'right' | null
  const [showMeaning, setShowMeaning] = useState(false);

  const currentWord = dailyWords[currentIndex] || null;
  const isFinished = currentIndex >= dailyWords.length && dailyWords.length > 0;
  const isEmpty = !loading && !loadingWords && dailyWords.length === 0;

  const handleMark = async (known) => {
    if (!currentWord) return;
    setSlideDir(known ? "right" : "left");
    setTimeout(async () => {
      await markWord(currentWord.id, known);
      setSlideDir(null);
      setShowMeaning(false);
      setCurrentIndex(prev => prev + 1);
    }, 300);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setShowMeaning(false);
    setSlideDir(null);
    refresh();
  };

  // ---- 未选择词书 ----
  if (!loading && !currentBook) {
    return (
      <div className="page-content" style={{ paddingTop: 8 }}>
        <div className="page-label">词书学习</div>
        <div className="page-heading">选一本词书开始吧 📚</div>
        <div className="card card-warm" style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 60, marginBottom: 12 }}>📖</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--warm-700)", marginBottom: 16 }}>
            请先选择你要学习的词书
          </div>
          <button className="btn-primary" onClick={() => setShowBookSelector(true)}>
            选择词书 →
          </button>
        </div>
        {showBookSelector && (
          <BookSelectorModal
            books={books} currentBook={currentBook}
            onSelect={(id) => { selectBook(id); setShowBookSelector(false); }}
            onClose={() => setShowBookSelector(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="page-content" style={{ paddingTop: 8 }}>
      <div className="page-label">词书学习</div>

      {/* ---- 顶部：词书信息 + 操作栏 ---- */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div className="page-heading" style={{ marginBottom: 0, fontSize: 22 }}>
          {currentBook?.cover_emoji} {currentBook?.name}
        </div>
        <button onClick={() => setShowBookSelector(true)} style={{
          background: "var(--warm-50)", border: "2px solid var(--warm-200)",
          borderRadius: 20, padding: "6px 12px", fontSize: 12, fontWeight: 700,
          color: "var(--warm-600)", cursor: "pointer", fontFamily: "inherit",
        }}>
          切换 ↻
        </button>
      </div>

      {/* ---- 进度条 ---- */}
      {progress && (
        <div className="card" style={{ padding: 14, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>
            <span>学习进度</span>
            <span>{progress.learned} / {progress.totalWords} 词</span>
          </div>
          <div className="progress-track" style={{ height: 8 }}>
            <div className="progress-fill" style={{
              width: `${progress.totalWords > 0 ? (progress.learned / progress.totalWords * 100) : 0}%`,
            }} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 10,
              background: "var(--green-50)", color: "#15803D",
            }}>✅ 已掌握 {progress.mastered}</span>
            <span style={{
              fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 10,
              background: "var(--warm-100)", color: "var(--warm-700)",
            }}>🔄 复习中 {progress.reviewing}</span>
            <span style={{
              fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 10,
              background: "var(--coral-50)", color: "#E11D48",
            }}>📕 生词 {progress.learning}</span>
          </div>
        </div>
      )}

      {/* ---- 控制栏：排序 + 生词本 ---- */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={toggleSortMode} style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "10px 14px", borderRadius: "var(--radius-md)",
          border: "2px solid var(--warm-200)", background: "white",
          fontSize: 13, fontWeight: 700, color: "var(--warm-600)",
          cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
        }}>
          {sortMode === "alpha" ? "🔤 首字母排序" : "🎲 随机高频"}
        </button>
        <button onClick={() => setShowUnknownList(true)} style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "10px 14px", borderRadius: "var(--radius-md)",
          border: "2px solid var(--coral-100)", background: "var(--coral-50)",
          fontSize: 13, fontWeight: 700, color: "#E11D48",
          cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
        }}>
          📕 生词本 {unknownWords.length > 0 ? `(${unknownWords.length})` : ""}
        </button>
      </div>

      {/* ---- 加载中 ---- */}
      {(loading || loadingWords) && (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 36, marginBottom: 12, animation: "float 2s ease-in-out infinite" }}>🦉</div>
          <div style={{ fontWeight: 700, color: "var(--warm-600)" }}>正在准备今日单词...</div>
        </div>
      )}

      {/* ---- 词书为空 ---- */}
      {isEmpty && !loading && (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: "var(--warm-700)", marginBottom: 8 }}>
            今日没有需要学习的单词
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600, marginBottom: 16 }}>
            你已经完成了今日的学习目标，明天再来吧！
          </div>
          <button className="btn-outline" onClick={handleRestart}>刷新一下 🔄</button>
        </div>
      )}

      {/* ---- 学习完毕 ---- */}
      {isFinished && (
        <div className="card" style={{ textAlign: "center", padding: 32, animation: "bounceIn 0.5s ease-out" }}>
          <div style={{ fontSize: 60, marginBottom: 8 }}>🎉</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "var(--warm-700)", marginBottom: 8 }}>
            今日学习完成！
          </div>
          <div style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 600, marginBottom: 20 }}>
            你今天学习了 {dailyWords.length} 个单词
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "var(--green-500)" }}>
                {dailyWords.filter(w => w._source === "new").length}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>新学</div>
            </div>
            <div style={{ width: 1, background: "var(--warm-200)" }} />
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "var(--warm-600)" }}>
                {dailyWords.filter(w => w._source === "review").length}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>复习</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-outline" style={{ flex: 1 }} onClick={() => setShowUnknownList(true)}>
              查看生词本
            </button>
            <button className="btn-primary" style={{ flex: 1 }} onClick={handleRestart}>
              再来一轮 🔄
            </button>
          </div>
        </div>
      )}

      {/* ---- 核心：单词推送卡片 ---- */}
      {!loading && !loadingWords && !isFinished && !isEmpty && currentWord && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>
              {currentWord._source === "review" ? "🔄 复习" : "🆕 新词"}
            </span>
            <span style={{
              fontSize: 12, fontWeight: 800, padding: "3px 10px", borderRadius: 10,
              background: "var(--warm-100)", color: "var(--warm-600)",
            }}>
              {currentIndex + 1} / {dailyWords.length}
            </span>
          </div>

          <div className="progress-track" style={{ marginBottom: 16, height: 4 }}>
            <div className="progress-fill" style={{
              width: `${((currentIndex + 1) / dailyWords.length) * 100}%`,
            }} />
          </div>

          <div style={{
            animation: slideDir === "right"
              ? "slideOutRight 0.3s ease-out forwards"
              : slideDir === "left"
                ? "slideOutLeft 0.3s ease-out forwards"
                : "flipIn 0.35s ease-out",
          }}>
            <div className="card" style={{
              textAlign: "center", padding: 32,
              background: "linear-gradient(145deg, #FFF7ED, #FFEDD5)",
              border: "2px solid var(--warm-200)",
              minHeight: 260,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: "var(--warm-700)", letterSpacing: -1 }}>
                {currentWord.word}
              </div>

              <div style={{ fontSize: 15, color: "var(--text-secondary)", fontWeight: 600, marginTop: 6 }}>
                {currentWord.phonetic_us || currentWord.phonetic_uk || ""}
              </div>

              <button onClick={() => speak(currentWord.word)} style={{
                background: "none", border: "2px solid var(--warm-300)", borderRadius: "50%",
                width: 44, height: 44, cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", marginTop: 12,
                color: "var(--warm-500)", transition: "all 0.2s", fontFamily: "inherit",
              }}>
                <SpeakerIcon size={22} />
              </button>

              {currentWord.pos && (
                <span style={{
                  marginTop: 12, fontSize: 12, fontWeight: 700,
                  padding: "3px 10px", borderRadius: 10,
                  background: "var(--blue-50)", color: "#2563EB",
                }}>
                  {currentWord.pos}
                </span>
              )}

              {!showMeaning ? (
                <button onClick={() => setShowMeaning(true)} style={{
                  marginTop: 20, padding: "10px 24px",
                  borderRadius: "var(--radius-md)",
                  border: "2px dashed var(--warm-300)",
                  background: "rgba(255,255,255,0.6)",
                  fontSize: 14, fontWeight: 700, color: "var(--warm-500)",
                  cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.2s",
                }}>
                  👆 点击查看释义
                </button>
              ) : (
                <div style={{ marginTop: 20, animation: "fadeUp 0.3s ease-out" }}>
                  {/* 🆕 AI 配图 — 词书学习卡释义区 */}
                  <WordAiImage
                    word={currentWord.word}
                    meaning={currentWord.meaning}
                    size={140}
                  />
                  <div style={{
                    fontSize: 22, fontWeight: 800, color: "var(--warm-700)",
                    padding: "12px 20px",
                    borderRadius: "var(--radius-md)",
                    background: "rgba(255,255,255,0.7)",
                  }}>
                    {currentWord.meaning}
                  </div>
                  {currentWord.example && (
                    <div style={{
                      marginTop: 12, fontSize: 13, fontWeight: 600,
                      color: "var(--text-secondary)", fontStyle: "italic",
                      lineHeight: 1.5,
                    }}>
                      "{currentWord.example}"
                      {currentWord.example_cn && (
                        <div style={{ fontStyle: "normal", marginTop: 4, color: "var(--text-light)" }}>
                          {currentWord.example_cn}
                        </div>
                      )}
                    </div>
                  )}
                  {currentWord.memory_tip && (
                    <div style={{
                      marginTop: 12, padding: "10px 14px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--green-50)",
                      borderLeft: "4px solid var(--green-400)",
                      fontSize: 13, fontWeight: 600, color: "#15803D",
                      textAlign: "left",
                    }}>
                      💡 {currentWord.memory_tip}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <button onClick={() => handleMark(false)} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "16px 20px", borderRadius: "var(--radius-md)",
              border: "2px solid #FECACA", background: "var(--coral-50)",
              fontSize: 16, fontWeight: 800, color: "#EF4444",
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              不认识
            </button>
            <button onClick={() => handleMark(true)} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "16px 20px", borderRadius: "var(--radius-md)",
              border: "none",
              background: "linear-gradient(135deg, #4ADE80, #22C55E)",
              boxShadow: "0 4px 14px rgba(34,197,94,0.3)",
              fontSize: 16, fontWeight: 800, color: "white",
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              认识
            </button>
          </div>

          <div style={{
            textAlign: "center", fontSize: 12, color: "var(--text-light)",
            fontWeight: 600, marginTop: 12,
          }}>
            不认识的词会被收入生词本，后续反复推送直到掌握
          </div>
        </>
      )}

      {/* ---- 弹窗层 ---- */}
      {showBookSelector && (
        <BookSelectorModal
          books={books} currentBook={currentBook}
          onSelect={(id) => {
            selectBook(id);
            setShowBookSelector(false);
            setCurrentIndex(0);
            setShowMeaning(false);
          }}
          onClose={() => setShowBookSelector(false)}
        />
      )}
      {showUnknownList && (
        <UnknownWordsModal
          words={unknownWords}
          onClose={() => setShowUnknownList(false)}
        />
      )}
    </div>
  );
}