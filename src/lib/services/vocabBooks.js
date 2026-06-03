// src/lib/services/vocabBooks.js
// 词书推送功能的所有 Supabase 数据操作
import { supabase } from "../supabase";

// ============ 词书列表 ============

/** 获取所有词书 */
export async function fetchAllBooks() {
  const { data, error } = await supabase
    .from("vocab_books")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data;
}

// ============ 用户设置 ============

/** 获取用户设置（含当前词书信息） */
export async function fetchUserSettings(userId) {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*, current_book:vocab_books(*)")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** 创建或更新用户设置 */
export async function upsertUserSettings(userId, settings) {
  const { data, error } = await supabase
    .from("user_settings")
    .upsert(
      { user_id: userId, ...settings, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============ 每日词汇推送（核心） ============

/**
 * 获取今日推送单词
 * @param {string} userId       用户ID
 * @param {string} bookId       当前词书ID
 * @param {number} dailyGoal    每日目标数量
 * @param {'alpha'|'random'} sortMode 排序模式
 * @returns {Array} 今日学习的单词列表（混合复习词+新词）
 */
export async function fetchDailyWords(userId, bookId, dailyGoal = 20, sortMode = "random") {
  // --- 第一步：获取需要复习的生词（next_review <= 现在） ---
  const now = new Date().toISOString();
  const { data: reviewWords, error: e1 } = await supabase
    .from("user_vocab_progress")
    .select("*, word_detail:vocab_words(*)")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .in("status", ["learning", "reviewing"])
    .lte("next_review", now)
    .order("next_review")
    .limit(dailyGoal);
  if (e1) throw e1;

  const reviewCount = reviewWords?.length || 0;
  const remaining = dailyGoal - reviewCount;

  // --- 第二步：如果复习词不够，补充新词 ---
  let newWords = [];
  if (remaining > 0) {
    // 获取用户已经学过的单词ID列表
    const { data: learnedIds } = await supabase
      .from("user_vocab_progress")
      .select("word_id")
      .eq("user_id", userId)
      .eq("book_id", bookId);

    const excludeIds = (learnedIds || []).map((r) => r.word_id);

    // 查询未学过的新词
    let query = supabase
      .from("vocab_words")
      .select("*")
      .eq("book_id", bookId);

    // 排除已学过的
    if (excludeIds.length > 0) {
      query = query.not("id", "in", `(${excludeIds.join(",")})`);
    }

    // 排序模式
    if (sortMode === "alpha") {
      query = query.order("word");
    } else {
      query = query.order("frequency", { ascending: false });
    }

    const { data, error: e2 } = await query.limit(
      sortMode === "random" ? remaining * 3 : remaining
    );
    if (e2) throw e2;

    newWords = data || [];

    // 随机模式：打乱后取所需数量
    if (sortMode === "random") {
      newWords = shuffleArray(newWords).slice(0, remaining);
    } else {
      newWords = newWords.slice(0, remaining);
    }
  }

  // --- 第三步：合并并标记来源 ---
  const result = [
    ...(reviewWords || []).map((r) => ({
      ...r.word_detail,
      _source: "review",
      _progress: {
        status: r.status,
        familiarity: r.familiarity,
        review_count: r.review_count,
      },
    })),
    ...newWords.map((w) => ({
      ...w,
      _source: "new",
      _progress: null,
    })),
  ];

  return result;
}

// ============ 标记「认识 / 不认识」 ============

/**
 * 用户标记单词
 * @param {string} userId
 * @param {string} bookId
 * @param {string} wordId
 * @param {boolean} known   true=认识, false=不认识
 */
export async function markWordResult(userId, bookId, wordId, known) {
  // 先查是否已有进度记录
  const { data: existing } = await supabase
    .from("user_vocab_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("word_id", wordId)
    .maybeSingle();

  const now = new Date().toISOString();

  if (existing) {
    const newFamiliarity = known
      ? Math.min(existing.familiarity + 1, 7)
      : Math.max(existing.familiarity - 1, 0);
    const newStatus = getStatusByFamiliarity(newFamiliarity);
    const nextReview = calculateNextReview(newFamiliarity);

    const { error } = await supabase
      .from("user_vocab_progress")
      .update({
        familiarity: newFamiliarity,
        status: newStatus,
        next_review: nextReview,
        review_count: existing.review_count + 1,
        correct_count: known ? existing.correct_count + 1 : existing.correct_count,
        last_reviewed: now,
      })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const familiarity = known ? 1 : 0;
    const status = known ? "reviewing" : "learning";
    const nextReview = calculateNextReview(familiarity);

    const { error } = await supabase
      .from("user_vocab_progress")
      .insert({
        user_id: userId,
        book_id: bookId,
        word_id: wordId,
        familiarity,
        status,
        next_review: nextReview,
        review_count: 1,
        correct_count: known ? 1 : 0,
        last_reviewed: now,
      });
    if (error) throw error;
  }
}

/**
 * 通用版：不传入 bookId，适用于任意来源的词书单词
 * 已有进度时直接更新；无进度时跳过（不创建新记录，避免污染数据）
 */
export async function markVocabResult(userId, wordId, known) {
  const { data: existing } = await supabase
    .from("user_vocab_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("word_id", wordId)
    .maybeSingle();

  if (!existing) {
    // 没有学习记录，不创建新记录
    return;
  }

  const newFamiliarity = known
    ? Math.min(existing.familiarity + 1, 7)
    : Math.max(existing.familiarity - 1, 0);
  const newStatus = getStatusByFamiliarity(newFamiliarity);
  const nextReview = calculateNextReview(newFamiliarity);
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("user_vocab_progress")
    .update({
      familiarity: newFamiliarity,
      status: newStatus,
      next_review: nextReview,
      review_count: existing.review_count + 1,
      correct_count: known ? existing.correct_count + 1 : existing.correct_count,
      last_reviewed: now,
    })
    .eq("id", existing.id);
  if (error) throw error;
}

// ============ 生词本（不认识的词） ============

/** 获取用户的生词列表 */
export async function fetchUnknownWords(userId, bookId) {
  const { data, error } = await supabase
    .from("user_vocab_progress")
    .select("*, word_detail:vocab_words(*)")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .in("status", ["new", "learning"])
    .order("last_reviewed", { ascending: false });
  if (error) throw error;
  return (data || []).map((r) => ({
    ...r.word_detail,
    _progress: {
      status: r.status,
      familiarity: r.familiarity,
      review_count: r.review_count,
      correct_count: r.correct_count,
      next_review: r.next_review,
    },
  }));
}

/**
 * 获取用户在所有词书下标记为「不认识」(status=learning) 的单词
 * 转换为 useWords 兼容的格式（含 word/meaning/phonetic/next_review_at/ebbinghaus_stage 等）
 */
export async function fetchAllUnknownVocabWords(userId) {
  const { data, error } = await supabase
    .from("user_vocab_progress")
    .select("*, word_detail:vocab_words(*)")
    .eq("user_id", userId)
    .eq("status", "learning")
    .order("last_reviewed", { ascending: false });
  if (error) {
    console.warn("查询词书生词失败:", error.message);
    return [];
  }
  return (data || [])
    .filter((r) => r.word_detail)
    .map((r) => ({
      id: r.word_detail.id,
      word: r.word_detail.word,
      meaning: r.word_detail.meaning,
      phonetic: r.word_detail.phonetic_us || r.word_detail.phonetic_uk || "",
      ebbinghaus_stage: 0,
      next_review_at: r.next_review || new Date().toISOString(),
      total_reviews: r.review_count || 0,
      correct_count: r.correct_count || 0,
      _source: "vocab_unknown",
      _progress: r,
    }));
}

/** 获取学习统计 */
export async function fetchBookProgress(userId, bookId) {
  const { count: totalWords } = await supabase
    .from("vocab_words")
    .select("*", { count: "exact", head: true })
    .eq("book_id", bookId);

  const { data: progressData } = await supabase
    .from("user_vocab_progress")
    .select("status")
    .eq("user_id", userId)
    .eq("book_id", bookId);

  const stats = { new: 0, learning: 0, reviewing: 0, mastered: 0 };
  (progressData || []).forEach((r) => {
    if (stats[r.status] !== undefined) stats[r.status]++;
  });

  return {
    totalWords: totalWords || 0,
    learned: stats.learning + stats.reviewing + stats.mastered,
    mastered: stats.mastered,
    learning: stats.learning,
    reviewing: stats.reviewing,
    unknown: stats.learning,
  };
}

// ============ 辅助函数 ============

/** 艾宾浩斯间隔计算 */
function calculateNextReview(familiarity) {
  const intervals = {
    0: 5,
    1: 30,
    2: 12 * 60,
    3: 24 * 60,
    4: 2 * 24 * 60,
    5: 4 * 24 * 60,
    6: 7 * 24 * 60,
    7: 15 * 24 * 60,
  };
  const minutes = intervals[Math.min(familiarity, 7)] || 30 * 24 * 60;
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function getStatusByFamiliarity(f) {
  if (f <= 0) return "learning";
  if (f <= 2) return "reviewing";
  if (f <= 5) return "reviewing";
  return "mastered";
}

/** 数组随机打乱 */
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}