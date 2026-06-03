// src/lib/services/pronunciation.js
// 发音服务：浏览器原生 Web Speech API + 有道降级方案

// 方案一：浏览器原生 Web Speech API（推荐，免费）
export function speak(word, accent = 'us') {
  if (!window.speechSynthesis) return fallbackSpeak(word, accent);

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US';
  utterance.rate = 0.85;  // 稍慢，方便学习
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

// 方案二：降级方案 — 有道词典免费发音接口
function fallbackSpeak(word, accent) {
  const type = accent === 'uk' ? 1 : 2;
  const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${type}`;
  const audio = new Audio(url);
  audio.play().catch(() => console.warn('发音播放失败'));
}

// 预加载发音（用于列表场景批量准备）
export function preloadAudio(word, accent = 'us') {
  const type = accent === 'uk' ? 1 : 2;
  const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${type}`;
  const audio = new Audio();
  audio.preload = 'auto';
  audio.src = url;
  return audio;
}
