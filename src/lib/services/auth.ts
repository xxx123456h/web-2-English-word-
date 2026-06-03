// =============================================
// src/lib/services/auth.ts
// 认证服务：注册、登录、登出
// =============================================

import { supabase } from '../supabase'
import type { Profile } from '../types'

// ---------- 注册 ----------
export async function signUp(email: string, password: string, nickname?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nickname: nickname || '新同学' },
    },
  })
  if (error) throw error
  return data
}

// ---------- 登录 ----------
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

// ---------- OAuth 登录（Google / GitHub） ----------
export async function signInWithOAuth(provider: 'google' | 'github') {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  if (error) throw error
  return data
}

// ---------- 登出 ----------
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// ---------- 获取当前用户 ----------
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ---------- 获取用户资料 ----------
export async function getProfile(): Promise<Profile | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) throw error
  return data
}

// ---------- 确保 profile 存在（登录后调用） ----------
export async function ensureProfile(): Promise<Profile | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const existing = await getProfile()
  if (existing) return existing

  const nickname = user.user_metadata?.nickname || user.email?.split('@')[0] || '新同学'
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      nickname,
      avatar_url: null,
      grade: '',
      streak_days: 0,
      total_words: 0,
    })
    .select()
    .single()

  if (error) {
    console.error('创建 profile 失败:', error)
    return null
  }
  return data
}

// ---------- 更新用户资料 ----------
export async function updateProfile(updates: {
  nickname?: string
  avatar_url?: string
  grade?: string
}) {
  const user = await getCurrentUser()
  if (!user) throw new Error('未登录')

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .maybeSingle()

  if (error) throw error
  return data
}

// ---------- 监听登录状态变化 ----------
export function onAuthStateChange(
  callback: (event: string, session: any) => void
) {
  return supabase.auth.onAuthStateChange(callback)
}
