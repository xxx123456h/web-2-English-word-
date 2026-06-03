// =============================================
// src/lib/types.ts
// 数据库类型定义
// =============================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      scan_records: {
        Row: ScanRecord
        Insert: Omit<ScanRecord, 'id' | 'created_at'>
        Update: Partial<Omit<ScanRecord, 'id' | 'created_at'>>
      }
      words: {
        Row: Word
        Insert: Omit<Word, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Word, 'id' | 'created_at'>>
      }
      quiz_records: {
        Row: QuizRecord
        Insert: Omit<QuizRecord, 'id' | 'created_at'>
        Update: never
      }
      checkins: {
        Row: Checkin
        Insert: Omit<Checkin, 'id' | 'created_at'>
        Update: Partial<Omit<Checkin, 'id' | 'created_at'>>
      }
    }
  }
}

// ---------- 数据模型 ----------

export interface Profile {
  id: string
  nickname: string
  avatar_url: string | null
  grade: string
  streak_days: number
  total_words: number
  created_at: string
  updated_at: string
}

export interface ScanRecord {
  id: string
  user_id: string
  image_url: string | null
  ocr_raw_text: string | null
  word_count: number
  created_at: string
}

export interface Word {
  id: string
  user_id: string
  scan_id: string | null
  word: string
  phonetic: string | null
  meaning: string | null
  example_sentence: string | null
  image_url: string | null
  ebbinghaus_stage: number
  next_review_at: string
  created_at: string
  updated_at: string
}

export interface QuizRecord {
  id: string
  user_id: string
  word_id: string
  quiz_type: 'meaning' | 'similar' | 'sound'
  is_correct: boolean
  selected_answer: string | null
  correct_answer: string | null
  answer_time_ms: number | null
  created_at: string
}

export interface Checkin {
  id: string
  user_id: string
  check_date: string
  words_reviewed: number
  words_added: number
  quiz_correct: number
  quiz_total: number
  study_minutes: number
  created_at: string
}

// ---------- 业务类型 ----------

export interface UserStats {
  total_words: number
  mastered_words: number
  review_today: number
  avg_correct_rate: number
  stage_distribution: Record<string, number>
}

export interface LeaderboardEntry {
  user_id: string
  nickname: string
  avatar_url: string | null
  correct_rate: number
  total_words: number
  streak_days: number
}

export interface QuizQuestion {
  word: Word
  options: { text: string; is_correct: boolean }[]
  type: 'meaning' | 'similar'
}

// 艾宾浩斯阶段标签
export const STAGE_LABELS = ['新词', '初识', '熟悉', '巩固', '掌握', '精通', '夯实'] as const
export const STAGE_COLORS = ['#EF4444', '#F97316', '#FBBF24', '#84CC16', '#22C55E', '#14B8A6', '#6366F1'] as const

// 正确率评价等级
export function getGrade(rate: number): { label: string; emoji: string; desc: string } {
  if (rate >= 95) return { label: '夯', emoji: '🏆', desc: '无敌了！单词已刻入DNA' }
  if (rate >= 85) return { label: '稳', emoji: '💪', desc: '非常棒，继续保持！' }
  if (rate >= 70) return { label: '行', emoji: '👍', desc: '还不错，再练练更好' }
  if (rate >= 55) return { label: '飘', emoji: '😅', desc: '有点悬，需要多复习' }
  return { label: '拉', emoji: '😵', desc: '别灰心，重新来过！' }
}
