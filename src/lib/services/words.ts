// =============================================
// src/lib/services/words.ts
// 单词服务：CRUD + 艾宾浩斯引擎 + 批量导入
// =============================================

import { supabase } from '../supabase'
import type { Word, UserStats } from '../types'

// ---------- 获取所有单词 ----------
export async function getAllWords(options?: {
  filter?: 'all' | 'today' | 'mastered'
  orderBy?: 'created_at' | 'next_review_at' | 'word'
  limit?: number
}): Promise<Word[]> {
  const { filter = 'all', orderBy = 'created_at', limit = 200 } = options || {}

  let query = supabase
    .from('words')
    .select('*')
    .order(orderBy, { ascending: orderBy === 'word' })
    .limit(limit)

  if (filter === 'today') {
    query = query
      .lte('next_review_at', new Date().toISOString())
      .lt('ebbinghaus_stage', 5)
  } else if (filter === 'mastered') {
    query = query.gte('ebbinghaus_stage', 5)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

// ---------- 获取今日待复习单词 ----------
export async function getTodayReviewWords(): Promise<Word[]> {
  const { data, error } = await supabase.rpc('get_today_review_words', {
    p_limit: 50,
  })
  if (error) throw error
  return data || []
}

// ---------- 批量添加单词（拍照识别后） ----------
export async function batchAddWords(
  words: { word: string; meaning?: string; phonetic?: string }[]
): Promise<Word[]> {
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('未登录')

  // 确保 profile 存在（外键约束要求）
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    const { error: profileErr } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        nickname: user.user_metadata?.nickname || user.email?.split('@')[0] || '新同学',
        grade: '',
        streak_days: 0,
        total_words: 0,
      }, { onConflict: 'id' })
    if (profileErr) throw new Error('创建用户档案失败: ' + profileErr.message)
  }

  const seen = new Set<string>()
  const unique = words.filter(w => {
    const key = w.word.toLowerCase().trim()
    if (!key) return false
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  if (unique.length === 0) return []

  const rows = unique.map(w => ({
    user_id: user.id,
    word: w.word.toLowerCase().trim(),
    meaning: w.meaning || null,
    phonetic: w.phonetic || null,
    ebbinghaus_stage: 0,
    next_review_at: new Date().toISOString(),
  }))

  // 尝试 upsert 批量写入
  const { data, error } = await supabase
    .from('words')
    .upsert(rows, {
      onConflict: 'user_id,word',
      ignoreDuplicates: false,
    })
    .select()

  if (!error && data) return data

  // 如果 upsert 失败（可能缺少唯一约束），回退逐个 insert
  console.warn('upsert 失败，回退逐个插入:', error?.message)
  const results: Word[] = []
  for (const row of rows) {
    const { data: d, error: e } = await supabase
      .from('words')
      .insert(row)
      .select()
      .single()
    if (d) results.push(d)
    else if (e && e.code !== '23505') console.error('插入失败:', row.word, e)
  }
  if (results.length === 0 && unique.length > 0) {
    throw new Error('所有单词保存失败，请检查网络或重新登录')
  }
  return results
}

// ---------- 更新复习状态（答对/答错） ----------
export async function reviewWord(
  wordId: string,
  isCorrect: boolean
): Promise<Word> {
  const { data, error } = await supabase.rpc('update_word_review', {
    p_word_id: wordId,
    p_is_correct: isCorrect,
  })
  if (error) throw error
  return data
}

// ---------- 删除单词 ----------
export async function deleteWord(wordId: string) {
  const { error } = await supabase
    .from('words')
    .delete()
    .eq('id', wordId)
  if (error) throw error
}

// ---------- 获取用户统计（前端计算，不依赖 RPC） ----------
export async function getUserStats(): Promise<UserStats> {
  const { data, error } = await supabase
    .from('words')
    .select('ebbinghaus_stage, next_review_at')

  if (error) throw error
  const words = data || []
  const now = new Date()
  const total_words = words.length
  const mastered_words = words.filter(w => w.ebbinghaus_stage >= 5).length
  const review_today = words.filter(w => new Date(w.next_review_at) <= now && w.ebbinghaus_stage < 5).length
  const avg_correct_rate = total_words > 0 ? Math.round((mastered_words / total_words) * 100) : 0

  const stage_distribution: Record<string, number> = {}
  words.forEach(w => {
    const key = String(w.ebbinghaus_stage)
    stage_distribution[key] = (stage_distribution[key] || 0) + 1
  })

  return { total_words, mastered_words, review_today, avg_correct_rate, stage_distribution }
}

// ---------- 搜索单词（本地词库查释义） ----------
// 这里用一个免费的词典 API 替代
// 实际项目中可以用本地 JSON 词库或有道 API
export async function lookupWord(word: string): Promise<{
  word: string
  phonetic: string
  meaning: string
  example: string
} | null> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
    )
    if (!res.ok) return null

    const data = await res.json()
    const entry = data[0]

    return {
      word: entry.word,
      phonetic: entry.phonetic || entry.phonetics?.[0]?.text || '',
      meaning:
        entry.meanings?.[0]?.definitions?.[0]?.definition || '',
      example:
        entry.meanings?.[0]?.definitions?.[0]?.example || '',
    }
  } catch {
    return null
  }
}
