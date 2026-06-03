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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          try {
            const p = await authService.ensureProfile()
            setProfile(p)
          } catch (err) {
            console.error('getProfile 失败:', err)
          }
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

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

  return {
    user,
    profile,
    loading,
    isLoggedIn: !!user,
    signIn,
    signUp,
    signOut,
  }
}