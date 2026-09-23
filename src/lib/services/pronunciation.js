// src/lib/services/pronunciation.js
// 发音服务：单词级 Web Speech / 句子级有道 MP3 流式播放
//
// === 设计原则 ===
// 1. 单词级：使用 Web Speech API（免费，零延迟），降级有道 MP3
// 2. 句子级：使用有道 dictvoice 整句 MP3，单个 <audio> 元素流式播放
//    - 关键：不拆分 utterance（拆分是导致"断断续续"的根因）
//    - LRU 内存缓存 <HTMLAudioElement>，二次点击 < 50ms 出声
//    - 显式 preload + .load()，避免 iOS Safari 跨域不预加载的问题
//    - 任何错误降级到 Web Speech 单段朗读
// 3. 预加载：UI 端 hover/focus/touchstart 时调用 preloadSentence()

// ============================================================
// 单词级（Web Speech API + 有道降级）
// ============================================================
export function speak(word, accent = 'us') {
  if (!word) return;
  if (!window.speechSynthesis) return fallbackSpeak(word, accent);

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US';
    utterance.rate = 0.85;  // 稍慢，方便学习
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Web Speech 失败，降级到有道:', err);
    fallbackSpeak(word, accent);
  }
}

function fallbackSpeak(word, accent) {
  const type = accent === 'uk' ? 1 : 2;
  const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${type}`;
  const audio = new Audio();
  audio.crossOrigin = 'anonymous';
  audio.src = url;
  audio.play().catch(() => console.warn('单词发音失败:', word));
}

// ============================================================
// 句子级（有道 MP3 流式 + LRU 缓存 + 预加载）
// ============================================================

// 缓存 key → HTMLAudioElement
// LRU 上限 20，超过则淘汰最久未使用的
const audioCache = new Map();
const MAX_CACHE_SIZE = 20;

function makeKey(sentence, accent) {
  return `${accent}::${(sentence || '').toLowerCase().trim()}`;
}

/**
 * 获取（或创建并缓存）句子的 HTMLAudioElement
 * - 幂等：同一 sentence 多次调用返回同一元素
 * - 自动设置 crossOrigin、preload、调用 .load() 触发预加载
 */
function getSentenceAudio(sentence, accent) {
  const key = makeKey(sentence, accent);
  if (audioCache.has(key)) {
    // 命中缓存，刷新 LRU 顺序
    const el = audioCache.get(key);
    audioCache.delete(key);
    audioCache.set(key, el);
    return el;
  }

  const type = accent === 'uk' ? 1 : 2;
  const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(sentence)}&type=${type}`;

  const audio = new Audio();
  audio.crossOrigin = 'anonymous';
  audio.preload = 'auto';
  audio.src = url;
  // iOS Safari 对 crossOrigin 的 audio 必须显式 load()
  try { audio.load(); } catch (_) { /* ignore */ }

  audioCache.set(key, audio);

  // LRU 淘汰
  if (audioCache.size > MAX_CACHE_SIZE) {
    const firstKey = audioCache.keys().next().value;
    if (firstKey) {
      const old = audioCache.get(firstKey);
      try { old.pause(); old.src = ''; } catch (_) {}
      audioCache.delete(firstKey);
    }
  }

  return audio;
}

/**
 * 预加载例句音频（幂等）
 * - UI 端在 hover/focus/touchstart/IntersectionObserver 触发时调用
 * - 用户点击播放时，MP3 已在浏览器缓存中
 */
export function preloadSentence(sentence, accent = 'us') {
  if (!sentence) return;
  try {
    getSentenceAudio(sentence, accent);
  } catch (err) {
    console.warn('预加载例句失败:', err?.message);
  }
}

/**
 * 朗读整句例句
 * - 主路径：缓存的 <audio> 元素，pause + currentTime=0 + play
 * - 降级：Web Speech 单段 utterance（不再拆分）
 *
 * @returns {Promise<{audio: HTMLAudioElement|null}>} audio 可供订阅 ended/timeupdate
 */
export function speakSentence(sentence, options = {}) {
  const { accent = 'us' } = options;
  return new Promise((resolve) => {
    if (!sentence) { resolve({ audio: null }); return; }

    let audio;
    try {
      audio = getSentenceAudio(sentence, accent);
    } catch (err) {
      console.warn('getSentenceAudio 失败，降级到 Web Speech:', err);
      fallbackSpeakSentenceSingle(sentence, accent);
      resolve({ audio: null });
      return;
    }

    // 监听结束和错误，两个都 resolve（防止 UI 卡死）
    const onEnd = () => cleanupAndResolve();
    const onError = () => {
      console.warn('有道 MP3 播放失败，降级到 Web Speech');
      cleanupAndResolve();
      fallbackSpeakSentenceSingle(sentence, accent);
    };
    function cleanupAndResolve() {
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('error', onError);
      resolve({ audio });
    }

    audio.addEventListener('ended', onEnd, { once: true });
    audio.addEventListener('error', onError, { once: true });

    // 重新从头播放
    try {
      audio.pause();
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch((err) => {
          console.warn('audio.play() rejected，降级到 Web Speech:', err?.message);
          cleanupAndResolve();
          fallbackSpeakSentenceSingle(sentence, accent);
        });
      }
    } catch (err) {
      console.warn('播放异常，降级到 Web Speech:', err?.message);
      cleanupAndResolve();
      fallbackSpeakSentenceSingle(sentence, accent);
    }
  });
}

/**
 * 单段 Web Speech 降级（不再拆分句子）
 * - 整句一次 speak()，rate 0.9
 */
function fallbackSpeakSentenceSingle(sentence, accent) {
  if (!window.speechSynthesis) {
    // 最终兜底：有道 URL 直接 new Audio 播放
    const type = accent === 'uk' ? 1 : 2;
    const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(sentence)}&type=${type}`;
    const a = new Audio();
    a.src = url;
    a.play().catch(() => {});
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(sentence);
    u.lang = accent === 'uk' ? 'en-GB' : 'en-US';
    u.rate = 0.9;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch (err) {
    console.warn('Web Speech 降级也失败:', err?.message);
  }
}

// ============================================================
// 预加载（单词级，备用）
// ============================================================
export function preloadAudio(word, accent = 'us') {
  const type = accent === 'uk' ? 1 : 2;
  const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${type}`;
  const audio = new Audio();
  audio.preload = 'auto';
  audio.src = url;
  return audio;
}
