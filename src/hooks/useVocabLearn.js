// src/hooks/useVocabLearn.js
// 词书学习功能的核心 Hook
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import {
  fetchAllBooks,
  fetchUserSettings,
  upsertUserSettings,
  fetchDailyWords,
  markWordResult,
  markVocabResult,
  fetchUnknownWords,
  fetchBookProgress,
} from "../lib/services/vocabBooks";

export function useVocabLearn() {
  const { user } = useAuth();

  const [books, setBooks] = useState([]);
  const [settings, setSettings] = useState(null);
  const [currentBook, setCurrentBook] = useState(null);
  const [dailyWords, setDailyWords] = useState([]);
  const [unknownWords, setUnknownWords] = useState([]);
  const [progress, setProgress] = useState(null);
  const [sortMode, setSortMode] = useState("random"); // 'random' | 'alpha'
  const [loading, setLoading] = useState(true);
  const [loadingWords, setLoadingWords] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [allBooks, userSettings] = await Promise.all([
          fetchAllBooks(),
          fetchUserSettings(user.id),
        ]);
        setBooks(allBooks);
        setSettings(userSettings);
        if (userSettings?.current_book) {
          setCurrentBook(userSettings.current_book);
        }
      } catch (err) {
        console.error("加载词书失败:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!user || !currentBook) return;
    loadDailyWords();
    loadProgress();
    loadUnknownWords();
  }, [user, currentBook, sortMode]);

  const loadDailyWords = useCallback(async () => {
    if (!user || !currentBook) return;
    setLoadingWords(true);
    try {
      const goal = settings?.daily_goal || 20;
      const words = await fetchDailyWords(user.id, currentBook.id, goal, sortMode);
      setDailyWords(words);
    } catch (err) {
      console.error("加载每日单词失败:", err);
    } finally {
      setLoadingWords(false);
    }
  }, [user, currentBook, sortMode, settings]);

  const loadProgress = useCallback(async () => {
    if (!user || !currentBook) return;
    try {
      const p = await fetchBookProgress(user.id, currentBook.id);
      setProgress(p);
    } catch (err) {
      console.error("加载进度失败:", err);
    }
  }, [user, currentBook]);

  const loadUnknownWords = useCallback(async () => {
    if (!user || !currentBook) return;
    try {
      const words = await fetchUnknownWords(user.id, currentBook.id);
      setUnknownWords(words);
    } catch (err) {
      console.error("加载生词本失败:", err);
    }
  }, [user, currentBook]);

  const selectBook = useCallback(
    async (bookId) => {
      if (!user) return;
      const book = books.find((b) => b.id === bookId);
      if (!book) return;
      setCurrentBook(book);
      await upsertUserSettings(user.id, { current_book_id: bookId });
    },
    [user, books]
  );

  const markWord = useCallback(
    async (wordId, known) => {
      if (!user || !currentBook) return;
      await markWordResult(user.id, currentBook.id, wordId, known);
      setDailyWords((prev) => prev.filter((w) => w.id !== wordId));
      if (!known) {
        loadUnknownWords();
      }
      loadProgress();
    },
    [user, currentBook, loadUnknownWords, loadProgress]
  );

  const updateDailyGoal = useCallback(
    async (goal) => {
      if (!user) return;
      await upsertUserSettings(user.id, { daily_goal: goal });
      setSettings((prev) => ({ ...prev, daily_goal: goal }));
    },
    [user]
  );

  const toggleSortMode = useCallback(() => {
    setSortMode((prev) => (prev === "random" ? "alpha" : "random"));
  }, []);

  // 不依赖 currentBook 的通用标记方法（用于复习页）
  const markVocabWord = useCallback(
    async (wordId, known) => {
      if (!user) return;
      try {
        await markVocabResult(user.id, wordId, known);
      } catch (err) {
        console.error("标记词书单词失败:", err);
      }
    },
    [user]
  );

  return {
    books, currentBook, settings, dailyWords, unknownWords, progress, sortMode, loading, loadingWords, selectBook, markWord, markVocabWord, toggleSortMode, updateDailyGoal, refresh: loadDailyWords,
  };
}