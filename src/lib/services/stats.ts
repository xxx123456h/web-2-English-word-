import { supabase } from '../supabase'

export const getUserStats = async (userId: string) => {
  const { data, error } = await supabase
    .from('quiz_records')
    .select('correct')
    .eq('user_id', userId)
  if (error) throw error

  const total = data.length
  const correct = data.filter(r => r.correct).length
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

  return { total, correct, accuracy }
}

export const getWordCount = async (userId: string) => {
  const { count, error } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (error) throw error
  return count ?? 0
}