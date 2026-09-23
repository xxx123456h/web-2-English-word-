// src/lib/utils/rating.js
// 五级评价体系
// 根据当日学习数据计算等级
//
// 评级维度：
//   - 学习量得分（新学 + 复习单词数）  权重 40%
//   - 正确率得分（测验正确率）         权重 40%
//   - 坚持度加分（连续打卡天数）       权重 20%

export const RATING_LEVELS = [
  {
    level: 5,
    label: '夯爆了',
    emoji: '💥',
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #EF4444, #F97316)',
    description: '今日王者，无人能挡！',
    threshold: 90,
    owlMood: 'celebrate',
    feedback: [
      '你今天简直是词汇杀手！🔥',
      '大佬带带我！这也太强了吧！',
      '不是吧不是吧，你是背单词机器人吗？'
    ]
  },
  {
    level: 4,
    label: '顶级',
    emoji: '🔥',
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
    description: '实力超群，令人敬佩',
    threshold: 70,
    owlMood: 'happy',
    feedback: [
      '很强很强，今天状态不错嘛！',
      '继续保持，离夯爆了就差一步！',
      '学霸就是学霸，没得说~'
    ]
  },
  {
    level: 3,
    label: '人上人',
    emoji: '⭐',
    color: '#22C55E',
    gradient: 'linear-gradient(135deg, #22C55E, #4ADE80)',
    description: '稳扎稳打，超过大多数人',
    threshold: 50,
    owlMood: 'happy',
    feedback: [
      '不错不错，中规中矩的一天~',
      '你已经超过一半的学习者啦！',
      '再加把劲就是顶级了哦~'
    ]
  },
  {
    level: 2,
    label: 'NPC',
    emoji: '😐',
    color: '#94A3B8',
    gradient: 'linear-gradient(135deg, #94A3B8, #CBD5E1)',
    description: '平平无奇，需要更多努力',
    threshold: 25,
    owlMood: 'thinking',
    feedback: [
      '今天有点摸鱼哦，明天加油！',
      '别当NPC啦，来做主角吧！',
      '学一个词也是进步，但可以更多~'
    ]
  },
  {
    level: 1,
    label: '拉完了',
    emoji: '💀',
    color: '#64748B',
    gradient: 'linear-gradient(135deg, #64748B, #475569)',
    description: '今天几乎没有学习哦',
    threshold: 0,
    owlMood: 'sad',
    feedback: [
      '你的单词本在哭泣…',
      '猫头鹰都比你学得多了😭',
      '明天一定要振作起来！'
    ]
  },
];

/**
 * 计算综合得分
 */
export function calcDailyScore({ wordsLearned, wordsReviewed, quizTotal, quizCorrect, streakDays }) {
  // 学习量得分 (0~100)：每30个词为满分
  const learnCount = (wordsLearned || 0) + (wordsReviewed || 0);
  const learnScore = Math.min(100, (learnCount / 30) * 100);

  // 正确率得分 (0~100)
  const accuracy = quizTotal > 0 ? (quizCorrect / quizTotal) * 100 : 0;
  // 如果没做测验，不计入此项（加权平摊到其他维度）
  const hasQuiz = quizTotal > 0;

  // 坚持度加分 (0~100)：连续7天为满分
  const streakScore = Math.min(100, ((streakDays || 0) / 7) * 100);

  // 加权计算
  let totalScore;
  if (hasQuiz) {
    totalScore = learnScore * 0.4 + accuracy * 0.4 + streakScore * 0.2;
  } else {
    // 没做测验时：学习量 60% + 坚持度 40%
    totalScore = learnScore * 0.6 + streakScore * 0.4;
  }

  return Math.round(totalScore);
}

/**
 * 根据得分获取评级
 */
export function getRating(score) {
  for (const level of RATING_LEVELS) {
    if (score >= level.threshold) return level;
  }
  return RATING_LEVELS[RATING_LEVELS.length - 1];
}

/**
 * 随机获取一条反馈语
 */
export function getRandomFeedback(rating) {
  const feedbacks = rating.feedback;
  return feedbacks[Math.floor(Math.random() * feedbacks.length)];
}
