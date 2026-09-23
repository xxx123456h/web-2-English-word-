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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          // 先尝试 service 拉取（兼容 RLS 不开放的场景）
          try {
            await authService.ensureProfile()
          } catch {}
          await loadProfile(session.user.id)
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
