// 各阶段对应的复习间隔（小时）
const INTERVALS = [0, 1, 8, 24, 48, 168, 720]

/**
 * 根据答题结果计算新的阶段和下次复习时间
 * @param {number} currentStage - 当前阶段 (0-6)
 * @param {boolean} isCorrect - 是否答对
 * @returns {{ stage: number, next_review: string }}
 */
export function calcNextReview(currentStage, isCorrect) {
  let newStage

  if (isCorrect) {
    newStage = Math.min(currentStage + 1, 6)
  } else {
    newStage = Math.max(currentStage - 1, 0)
  }

  const hoursToAdd = INTERVALS[newStage] || 0
  const nextReview = new Date()
  nextReview.setHours(nextReview.getHours() + hoursToAdd)

  return {
    stage: newStage,
    next_review: nextReview.toISOString(),
  }
}
