// api/ai-image.js
// Vercel Serverless Function — AI word illustration generator.
//
// Pipeline (parallel, not serial):
//   Planner and image generation now run concurrently. The planner has a
//   hard 1500ms timeout: if Claude responds fast we use the refined prompt;
//   if it doesn't, we ship the original prompt to the image model right
//   away. Net effect: first-word latency is roughly image-model latency
//   instead of planner + image-model latency.
//
// Soft failures everywhere so the frontend can keep the flashcard feeling
// alive -- the user always sees an emoji archetype in <16ms.
//
// Env vars (set in Vercel dashboard -> Settings -> Environment Variables):
//   INFISTAR_API_KEY       required. The user's infistar.ai key
//                          (sk-trKHZKtoCyJYbqk2V5S7ZFlE1xbQUbZra12ab8cXh3zjRWgj)
//   INFISTAR_BASE_URL      optional, defaults to https://infistar.ai/v1
//                          (per the user's infistar dashboard screenshot)
//   INFISTAR_IMAGE_MODEL   optional, defaults to "gpt-image-2.5-flare"
//   AI_IMAGE_PROVIDER      optional, defaults to "infistar"
//   CLAUDE_API_KEY         optional, enables direct Anthropic planner
//   VITE_CLAUDE_API_KEY    optional, enables planner via api.ymhss.cn
//   CLAUDE_RELAY_URL       optional, defaults to https://api.ymhss.cn
//   PLANNER_TIMEOUT_MS     optional, default 1500
//

import { resolveProvider } from './_lib/aiImageProvider.js';
import { planWordVisual, composeImagePrompt } from './_lib/claudePlanner.js';
import { loadEnvFile } from './_lib/loadEnvFile.js';

// Pick up .env.local in local dev. No-op on Vercel (env vars come from the
// dashboard). Must run BEFORE resolveProvider() so it sees INFISTAR_API_KEY.
loadEnvFile();

export const config = {
  maxDuration: 60,
};

const DEFAULT_PLANNER_TIMEOUT_MS = 1500;

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('planner timeout')), ms);
    promise.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const { word, meaning, prompt: clientPrompt, exampleSentence } = req.body || {};
  if (!word || typeof word !== 'string') {
    return res.status(400).json({ error: 'missing word' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  const safeWord = String(word).slice(0, 60);
  const safeMeaning = typeof meaning === 'string' ? meaning.slice(0, 200) : '';
  const safeExample = typeof exampleSentence === 'string' ? exampleSentence.slice(0, 240) : '';

  // Build a minimal fallback prompt so the image model always has input,
// even if both planner and client prompt are missing. Photorealistic
// style matches gpt-image-2's strengths; kawaii was wrong for this model.
// Skip the meaning parens if it contains Chinese characters - some image
// models choke on raw Chinese text in English-language prompts.
const isAscii = (s) => /^[\x20-\x7E]*$/.test(s);
  const fallbackPrompt = safeMeaning && isAscii(safeMeaning)
    ? `${safeWord} (${safeMeaning}), photorealistic illustration, painterly vivid colors, single iconic subject centered, simple background, no text no letters no words no watermarks, square 1:1`
    : `${safeWord}, photorealistic illustration, painterly vivid colors, single iconic subject centered, simple background, no text no letters no words no watermarks, square 1:1`;

  // ---- Kick off planner in parallel, capped by hard timeout ----
  const plannerTimeoutMs = parseInt(
    process.env.PLANNER_TIMEOUT_MS || String(DEFAULT_PLANNER_TIMEOUT_MS), 10,
  );

  const plannerPromise = planWordVisual({
    word: safeWord, meaning: safeMeaning, example: safeExample,
  }).catch((e) => {
    console.warn('[ai-image] planner failed:', e?.message);
    return null;
  });

  let plannerP;
  try {
    plannerP = await withTimeout(plannerPromise, plannerTimeoutMs);
  } catch (_) {
    // Timeout: let the planner finish in the background; we'll ignore its
    // result for THIS request but it may populate caches for next time.
    plannerP = null;
  }

  const plan = plannerP;
  let finalPrompt =
    (plan && composeImagePrompt(plan)) ||
    (typeof clientPrompt === 'string' && clientPrompt) ||
    fallbackPrompt;

  // ---- Call image provider ----
  let providerName = 'unknown';
  try {
    const provider = resolveProvider();
    providerName = provider.name;
    const result = await provider.generate({
      prompt: finalPrompt,
      word: safeWord,
      meaning: safeMeaning,
      example: safeExample,
    });
    return res.status(200).json({
      imageUrl: result.imageUrl,
      source: result.source,
      provider: providerName,
      revisedPrompt: result.revisedPrompt || null,
      planner: plan ? {
        subject: plan.subject,
        action: plan.action,
        setting: plan.setting,
        style: plan.style,
      } : null,
    });
  } catch (e) {
    console.error('[ai-image] provider failed:', e?.message, 'code=', e?.code);
    return res.status(200).json({
      imageUrl: null,
      source: null,
      provider: providerName,
      reason: e?.message || 'provider failed',
      code: e?.code || 'PROVIDER_ERROR',
      transient: !!e?.transient,
      planner: plan ? {
        subject: plan.subject,
        action: plan.action,
        setting: plan.setting,
        style: plan.style,
      } : null,
    });
  }
}