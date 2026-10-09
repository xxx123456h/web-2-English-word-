// =============================================
// src/hooks/useAuth.ts
// =============================================

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import * as authService from '../lib/services/auth'
import type { Profile } from '../lib/types'

export function useAuth() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)

  // 加载 profile
  const loadProfile = useCallback(async (uid) => {
    if (!uid) {
      setProfile(null)
      return null
    }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle()
      setProfile(data)
      return data
    } catch (err) {
      console.warn('profile 加载失败（可能表不存在）:', err?.message)
      return null
    }
  }, [])

  useEffect(() => {
    // 回调必须同步返回：supabase-js 在持有内部 auth 锁时 await 这个回调
    // （切回标签页 / token 刷新时都会触发）。如果在回调里 await 任何
    // supabase 调用（ensureProfile 内部的 getUser()、from().select() 都要
    // 抢同一把锁），就会死锁，之后所有查询都卡住、不发请求。
    // 所以这里只同步 setUser，其余工作用 setTimeout 推到锁释放之后。
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          const uid = session.user.id
          setTimeout(async () => {
            // 先尝试 service 拉取（兼容 RLS 不开放的场景）
            try {
              await authService.ensureProfile()
            } catch {}
            await loadProfile(uid)
          }, 0)
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [loadProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true)
    try {
      await authService.signIn(email, password)
    } finally {
      setLoading(false)
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string, nickname?: string) => {
    setLoading(true)
    try {
      await authService.signUp(email, password, nickname)
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    await authService.signOut()
    setUser(null)
    setProfile(null)
  }, [])

  const refetchProfile = useCallback(() => {
    if (user) return loadProfile(user.id)
  }, [user, loadProfile])

  return {
    user,
    profile,
    loading,
    isLoggedIn: !!user,
    signIn,
    signUp,
    signOut,
    refetchProfile,
  };
}
