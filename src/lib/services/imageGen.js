// src/lib/services/imageGen.js
// AI image generation service: cache lookup + Edge Function call.
//
// Upgrades vs. the previous version:
// - buildImagePrompt() locks onto the PRIMARY meaning of a word and
//   explicitly tells the model to depict a single iconic subject.
// - preloadWordImages() warms the shared in-memory cache in the background.
// - makeCacheKey() is exported so the hook and the preloader agree on the
//   exact key formula (same word -> same image, regardless of meaning).

import { supabase } from '../supabase';

// ---- Cache plumbing ----
// Both the hook (useWordImage) and the preloader (preloadWordImages) write
// into the same Map so a warm-up pass on entering the flashcard page is
// visible to every card flip.
const _moduleCache = new Map();
export function getSharedCache() {
  if (typeof window === 'undefined') return _moduleCache;
  if (!window.__wordImageCache) window.__wordImageCache = new Map();
  return window.__wordImageCache;
}

// FNV-1a 32-bit hash, returns base36 string. Deterministic, dependency-free.
function hashStr(str) {
  let h = 2166136261 >>> 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

// Cache key: word + example hash. We drop `meaning` so the same word shares
// one canonical image across senses, which dramatically raises hit rate.
export function makeCacheKey(word, _meaning, example) {
  const w = String(word || '').toLowerCase().trim();
  if (!w) return '';
  return `${w}::${hashStr(String(example || '').slice(0, 120))}`;
}

// ---- Prompt engineering ----
// The prompt locks onto the primary meaning and asks for a single subject,
// but stays flexible enough for abstract adjectives (ancient, calm, freedom).
// Abstract words get a small framing hint ("represent the concept visually")
// so gpt-image-2 doesn't refuse or produce a literal word-art image.
//
// CRITICAL: never put raw Chinese in the prompt. Some image models see
// Chinese characters as content to render (result: cards full of garbled
// Chinese text instead of the requested illustration). We strip the Chinese
// meaning from focusLock/sceneSource and let the English word + planner
// output carry the semantic load.
export function buildImagePrompt(word, meaning, exampleSentence = '') {
  const w = String(word || '').trim();
  const rawMeaning = String(meaning || '').trim();

  // Pick the most common meaning. Chinese dictionaries usually use ; / / ,
  // as sense separators.
  const primaryMeaning = rawMeaning
    .split(/[;/／,，、]|\s+/)
    .map(s => s.trim())
    .filter(Boolean)[0] || rawMeaning;

  // Detect Chinese characters in the meaning - we don't want to leak them
  // into the image prompt. If we do, gpt-image-2 may render them as text.
  const hasChinese = /[一-鿿]/.test(primaryMeaning);
  const meaningHint = hasChinese ? '' : ` (meaning: ${primaryMeaning})`;

  const hasExample = exampleSentence && exampleSentence.trim().length > 4;
  const exampleSnippet = String(exampleSentence || '').slice(0, 120).trim();
  // Don't leak Chinese example sentences into the prompt either.
  const exampleHasChinese = /[一-鿿]/.test(exampleSnippet);

  const style = [
    'photorealistic illustration',
    'painterly, vivid colors, soft natural lighting',
    '1:1 square aspect ratio',
    'no text, no letters, no words, no watermarks anywhere',
  ].join(', ');

  // For concrete nouns / verbs we demand a single subject. For adjectives
  // and abstract nouns we relax that and invite a metaphorical scene.
  const isLikelyAbstract = hasChinese
    || /^(形容|副|adj|adv|abstract|adj\.|adv\.)/i.test(primaryMeaning)
    || /的$/.test(primaryMeaning);

  const subjectDirective = isLikelyAbstract
    ? 'Create a vivid metaphorical scene that visually represents the concept. ' +
      'Use symbolic objects (e.g. an ancient stone temple for "ancient", a dove for "peace"). ' +
      'Avoid depicting literal text or people explaining the meaning.'
    : 'Center ONE single iconic subject in the frame. ' +
      'Avoid showing multiple competing objects.';

  const focusLock =
    `Visualize the English word "${w}"${meaningHint}. ` +
    subjectDirective + ' ' +
    `Do NOT include any people speaking or text that explains the meaning.`;

  const sceneSource = hasExample && !exampleHasChinese
    ? `Use this example as visual context only: "${exampleSnippet}". ` +
      `The concept "${w}" must be the visual focus.`
    : `Visualize the concept "${w}". ` +
      `Use the most iconic object or scene associated with this English word.`;

  return `${style}. ${focusLock} ${sceneSource}`;
}

// ---- Generation entry ----
//
// The Vercel route is now the primary path. It runs the planner and image
// model in PARALLEL with a 1500ms planner cap, so the bottleneck is the
// image model's wall time (typically 5-15s for gpt-image-2). We use a
// 20s client-side timeout as a safety net.

// 30s: user explicitly chose to keep waiting for infistar rather than
// silently fall back. gpt-image-2 wall time is typically 5-15s; 30s covers
// the slow tail and avoids Vercel 60s hard cut.
const GEN_TIMEOUT_MS = 30000;

async function callVercelRoute({ word, meaning, prompt, exampleSentence, signal }) {
  const resp = await fetch('/api/ai-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word, meaning, prompt, exampleSentence }),
    signal,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`HTTP ${resp.status}: ${text.slice(0, 200)}`);
  }
  const data = await resp.json();
  return data;
}

export async function generateWordImage(word, meaning, exampleSentence) {
  const prompt = buildImagePrompt(word, meaning, exampleSentence);

  // Primary path: Vercel route (Claude planner + image provider)
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), GEN_TIMEOUT_MS);
    try {
      const data = await callVercelRoute({
        word, meaning, prompt, exampleSentence, signal: ctrl.signal,
      });
      if (data?.imageUrl) {
        return {
          imageUrl: data.imageUrl,
          source: data.source || 'vercel',
          provider: data.provider,
          revisedPrompt: data.revisedPrompt || null,
          planner: data.planner || null,
        };
      }
      // Soft failure - provider returned null. Surface code + transient
      // flag so the hook can auto-retry when appropriate and so the UI
      // can show a meaningful reason ("API key missing", "timeout", etc.).
      console.warn('[imageGen] provider soft-fail:', data?.reason, 'code=', data?.code);
      return {
        imageUrl: null,
        reason: data?.reason || 'no image available',
        code: data?.code || 'PROVIDER_ERROR',
        transient: !!data?.transient,
      };
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    // Network/timeout errors before reaching the server. These ARE transient.
    const isAbort = err?.name === 'AbortError';
    console.warn('[imageGen] vercel route failed:', err?.message);
    return {
      imageUrl: null,
      reason: isAbort ? `请求超时（${GEN_TIMEOUT_MS / 1000}s）` : (err?.message || 'request failed'),
      code: isAbort ? 'TIMEOUT' : 'NETWORK',
      transient: true,
    };
  }
}

// ---- Cache lookup ----
export async function getCachedImage(word, meaning, exampleSentence) {
  if (!word) return null;
  const w = String(word).toLowerCase();
  try {
    if (exampleSentence && exampleSentence.length > 4) {
      const { data } = await supabase
        .from('word_images')
        .select('image_url')
        .eq('word', w)
        .eq('example_sentence', String(exampleSentence).slice(0, 200))
        .maybeSingle();
      if (data?.image_url) return data.image_url;
    }
    if (meaning) {
      const primary = String(meaning).split(/[;/／,，、]|\s+/)[0]?.trim();
      if (primary) {
        const { data } = await supabase
          .from('word_images')
          .select('image_url')
          .eq('word', w)
          .eq('meaning', primary)
          .maybeSingle();
        if (data?.image_url) return data.image_url;
      }
    }
    const { data } = await supabase
      .from('word_images')
      .select('image_url')
      .eq('word', w)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.image_url || null;
  } catch (err) {
    console.warn('[imageGen] cache lookup failed:', err?.message);
    return null;
  }
}

// ---- Preloader ----
// Walk the queue, check cache first, only generate missing entries.
// Writes results into the shared cache so useWordImage hits immediately
// when the user actually flips a card.
//
// Network-aware: once we see an UNREACHABLE / NO_KEY error from
// generateWordImage, we set a session flag and skip ALL further infistar
// attempts until the next page load. This prevents 19+ silent 30-second
// timeouts when running in a network where infistar.ai is firewalled.
export async function preloadWordImages(words, { concurrency = 2 } = {}) {
  if (!Array.isArray(words) || !words.length) return;

  const cache = getSharedCache();
  const queue = words.filter(w => w && w.word).slice();
  if (!queue.length) return;

  // Session-wide flag - once set, all subsequent generate calls return null
  // immediately without hitting the network.
  if (typeof window !== 'undefined') {
    if (window.__imageGenDisabled) return;
  }

  async function worker() {
    while (queue.length) {
      const w = queue.shift();
      if (!w?.word) continue;

      const key = makeCacheKey(w.word, w.meaning, w.example_sentence || w.example);
      if (cache.has(key)) continue;

      try {
        let url = await getCachedImage(w.word, w.meaning, w.example_sentence || w.example);
        if (!url) {
          const r = await generateWordImage(w.word, w.meaning, w.example_sentence || w.example);
          // Bail for the rest of the session if we hit a structurally
          // unreachable provider - infistar.ai blocked by GFW, NO_KEY, etc.
          if (r && !r.imageUrl && (r.code === 'UNREACHABLE' || r.code === 'NO_KEY' || r.code === 'UNKNOWN_PROVIDER')) {
            if (typeof window !== 'undefined') window.__imageGenDisabled = true;
            console.warn('[preloadWordImages] image gen disabled for this session:', r.code);
            return;
          }
          url = r?.imageUrl || null;
        }
        if (url) cache.set(key, url);
      } catch (e) {
        console.warn('[preloadWordImages]', w.word, e?.message);
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, concurrency) }, () => worker());
  await Promise.all(workers);
}
