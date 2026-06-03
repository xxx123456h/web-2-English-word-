// =============================================
// src/lib/services/quiz.ts
// 测验服务：出题、答题、排行榜
// =============================================

import { supabase } from '../supabase'
import type { Word, QuizQuestion, QuizRecord, LeaderboardEntry } from '../types'

// ---------- 生成测验题目 ----------
export async function generateQuiz(wordCount: number = 10): Promise<QuizQuestion[]> {
  // 1. 获取待复习单词作为题目
  const { data: words, error: wordErr } = await supabase
    .from('words')
    .select('*')
    .lte('next_review_at', new Date().toISOString())
    .lt('ebbinghaus_stage', 5)
    .not('meaning', 'is', null)
    .order('next_review_at', { ascending: true })
    .limit(wordCount)

  if (wordErr) throw wordErr
  if (!words || words.length === 0) {
    // 没有待复习的，从全部单词中随机出题
    const { data: allWords, error } = await supabase
      .from('words')
      .select('*')
      .not('meaning', 'is', null)
      .limit(wordCount)
    if (error) throw error
    if (!allWords?.length) return []
    return buildQuestions(allWords)
  }

  return buildQuestions(words)
}

// 构建选择题
async function buildQuestions(words: Word[]): Promise<QuizQuestion[]> {
  const questions: QuizQuestion[] = []

  for (const word of words) {
    // 从数据库获取干扰项
    const { data: distractors } = await supabase.rpc('get_quiz_distractors', {
      p_word_id: word.id,
      p_count: 3,
    })

    const wrongOptions = (distractors || []).map((d: any) => ({
      text: d.meaning,
      is_correct: false,
    }))

    // 如果干扰项不够3个，用预设的填充
    const fallbacks = ['快乐的', '安静的', '重要的', '困难的', '美丽的', '危险的']
    while (wrongOptions.length < 3) {
      const fb = fallbacks[Math.floor(Math.random() * fallbacks.length)]
      if (!wrongOptions.some((o: any) => o.text === fb) && fb !== word.meaning) {
        wrongOptions.push({ text: fb, is_correct: false })
      }
    }

    // 正确选项
    const correctOption = { text: word.meaning!, is_correct: true }

    // 随机打乱选项顺序
    const options = shuffle([correctOption, ...wrongOptions.slice(0, 3)])

    questions.push({
      word,
      options,
      type: Math.random() > 0.5 ? 'meaning' : 'similar',
    })
  }

  return questions
}

// 洗牌算法
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ---------- 提交答题结果 ----------
export async function submitAnswer(params: {
  wordId: string
  quizType: 'meaning' | 'similar' | 'sound'
  isCorrect: boolean
  selectedAnswer: string
  correctAnswer: string
  answerTimeMs: number
}): Promise<void> {
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('未登录')

  // 1. 记录答题
  const { error: quizErr } = await supabase.from('quiz_records').insert({
    user_id: user.id,
    word_id: params.wordId,
    quiz_type: params.quizType,
    is_correct: params.isCorrect,
    selected_answer: params.selectedAnswer,
    correct_answer: params.correctAnswer,
    answer_time_ms: params.answerTimeMs,
  })
  if (quizErr) throw quizErr

  // 2. 更新单词复习状态
  await supabase.rpc('update_word_review', {
    p_word_id: params.wordId,
    p_is_correct: params.isCorrect,
  })

  // 3. 更新今日打卡数据
  await supabase.rpc('daily_checkin', {
    p_quiz_correct: params.isCorrect ? 1 : 0,
    p_quiz_total: 1,
  })
}

// ---------- 获取排行榜 ----------
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('get_leaderboard', {
    p_limit: 20,
  })
  if (error) throw error
  return data || []
}

// ---------- 获取个人答题历史 ----------
export async function getQuizHistory(days: number = 7): Promise<{
  date: string
  correct: number
  total: number
}[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('quiz_records')
    .select('is_correct, created_at')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true })

  if (error) throw error

  // 按天分组统计
  const grouped: Record<string, { correct: number; total: number }> = {}
  for (const r of data || []) {
    const date = r.created_at.slice(0, 10)
    if (!grouped[date]) grouped[date] = { correct: 0, total: 0 }
    grouped[date].total++
    if (r.is_correct) grouped[date].correct++
  }

  return Object.entries(grouped).map(([date, stats]) => ({
    date,
    ...stats,
  }))
}
