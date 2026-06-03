// src/hooks/useReviewWords.js
// 合并「个人词库到期复习词」+「词书标记不认识的词」
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { fetchAllUnknownVocabWords } from "../lib/services/vocabBooks";

/**
 * 返回给 FlashcardPage 复习用的合并单词列表
 * 包含两类来源：
 *   1. 个人词库（useWords）到期复习词 — 由 props.words 提供
 *   2. 词书标记为 learning 的不认识单词 — 通过 Supabase 查询
 */
export function useReviewWords(externalWords = []) {
  const { user } = useAuth();
  const [vocabUnknownWords, setVocabUnknownWords] = useState([]);

  const load = useCallback(async () => {
    if (!user) { setVocabUnknownWords([]); return; }
    try {
      const data = await fetchAllUnknownVocabWords(user.id);
      setVocabUnknownWords(data);
    } catch (err) {
      console.warn("加载词书生词失败:", err);
      setVocabUnknownWords([]);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // 合并去重 — 同 id 优先保留外部（个人词库）
  const merged = (() => {
    const map = new Map();
    for (const w of externalWords) map.set(w.id, w);
    for (const w of vocabUnknownWords) {
      if (!map.has(w.id)) map.set(w.id, w);
    }
    return Array.from(map.values());
  })();

  return { reviewWords: merged, vocabUnknownWords, refresh: load };
}
