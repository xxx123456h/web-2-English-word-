// src/hooks/useVocabBook.js
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  fetchBooks,
  fetchDailyWords,
  markWordProgress,
  fetchUserProgress,
  getUserSettings,
  updateUserSettings,
} from '../lib/services/vocabBooks';

export function useVocabBook() {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [currentBook, setCurrentBook] = useState(null);
  const [dailyWords, setDailyWords] = useState([]);
  const [progress, setProgress] = useState({ total: 0, learned: 0, mastered: 0 });
  const [loading, setLoading] = useState(true);

  // 加载所有词书（不依赖用户登录状态）
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchBooks();
        setBooks(data || []);
      } catch (err) {
        console.error('加载词书失败:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 用户登录后加载当前词书设置
  useEffect(() => {
    if (!user || books.length === 0) return;
    (async () => {
      try {
        const settings = await getUserSettings();
        if (settings?.current_book_id) {
          const book = books.find(b => b.id === settings.current_book_id);
          if (book) {
            setCurrentBook(book);
            return;
          }
        }
      } catch (err) {
        console.warn('加载设置失败:', err);
      }
      // 没有设置或设置无效，默认选择第一本
      setCurrentBook(books[0]);
    })();
  }, [user, books]);

  // 切换词书时加载每日单词和进度
  useEffect(() => {
    if (currentBook && user) {
      fetchDailyData();
    }
  }, [currentBook, user]);

  const fetchDailyData = useCallback(async () => {
    if (!currentBook) return;
    try {
      const words = await fetchDailyWords(currentBook.id);
      setDailyWords(words || []);
      const p = await fetchUserProgress(currentBook.id);
      setProgress(p || { total: 0, learned: 0, mastered: 0 });
    } catch (err) {
      console.error('加载每日单词失败:', err);
      setDailyWords([]);
    }
  }, [currentBook]);

  const selectBook = useCallback(async (bookId) => {
    const book = books.find(b => b.id === bookId);
    if (book) {
      setCurrentBook(book);
      if (user) {
        try {
          await updateUserSettings({ current_book_id: bookId });
        } catch (err) {
          console.warn('保存词书设置失败:', err);
        }
      }
    }
  }, [books, user]);

  const markWord = useCallback(async (wordId, familiarity) => {
    if (!currentBook) return;
    try {
      await markWordProgress(wordId, currentBook.id, familiarity);
      await fetchDailyData();
    } catch (err) {
      console.error('标记单词失败:', err);
    }
  }, [currentBook, fetchDailyData]);

  return {
    books, currentBook, dailyWords, progress, loading,
    selectBook, markWord, fetchDailyWords: fetchDailyData,
  };
}
