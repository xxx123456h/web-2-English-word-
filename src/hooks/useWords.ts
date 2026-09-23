import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import * as wordService from '../lib/services/words'
import type { Word, UserStats } from '../lib/types'

export function useWords() {
  const { user } = useAuth()
  const [words, setWords] = useState<Word[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) {
      setWords([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await wordService.getAllWords()
      setWords(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  const loadStats = useCallback(async () => {
    if (!user) return
    try {
      const data = await wordService.getUserStats()
      setStats(data)
    } catch (err: any) {
      console.error('加载统计失败:', err)
    }
  }, [user])

  useEffect(() => {
    load()
    loadStats()
  }, [load, loadStats])

  // 注：原实时订阅 (Realtime channel) 已移除，避免 React 19 StrictMode 双调用
  // 引发的 channel subscribe 竞态。业务逻辑中已通过 await load() 即时同步。

  const addWords = useCallback(async (
    newWords: { word: string; meaning?: string; phonetic?: string; example_sentence?: string | null }[]
  ) => {
    const saved = await wordService.batchAddWords(newWords)
    await load()
    await loadStats()
    return saved
  }, [load, loadStats])

  const deleteWord = useCallback(async (wordId: string) => {
    await wordService.deleteWord(wordId)
    setWords(prev => prev.filter(w => w.id !== wordId))
    await loadStats()
  }, [loadStats])

  const updateWord = useCallback(async (wordId: string, isCorrect: boolean) => {
    const updated = await wordService.reviewWord(wordId, isCorrect)
    setWords(prev => prev.map(w => w.id === wordId ? updated : w))
    return updated
  }, [])

  return { words, stats, loading, error, addWords, deleteWord, updateWord, reload: load }
}
