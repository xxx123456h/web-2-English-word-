// src/hooks/useWordImage.js
// Get AI image for a word. The image is OPTIONAL - WordAiImage renders
// an emoji/Claude-SVG fallback if imageUrl is null, so failures here
// don't block the UI.
//
// Strategy:
//   1) shared in-memory cache (instant, <16ms)
//   2) Supabase word_images table
//   3) generateWordImage() -> Vercel API (gpt-image-2 via infistar.ai)
//   4) on transient error (network, 5xx, 429, timeout) -> automatic one-shot
//      retry after a short delay. User sees a longer skeleton instead of
//      an instant error.
//   5) on UNREACHABLE error (host blocked by GFW etc.) -> give up
//      immediately. Don't waste 30s × retry budget on a known-broken
//      destination; WordAiImage will just show emoji / Claude SVG.
//   6) on permanent error or after retry exhausted -> record error for
//      any consumer that wants to surface it.
//
// retry() bumps a token so the effect re-runs even if the word is the
// same - useful when the user clicks "重试" after a network blip.

import { useState, useEffect, useCallback } from 'react';
import {
  getCachedImage,
  generateWordImage,
  makeCacheKey,
  getSharedCache,
} from '../lib/services/imageGen';

const MAX_AUTO_RETRIES = 1; // 1 automatic retry on transient errors
const AUTO_RETRY_DELAY_MS = 1500;

// Errors that mean "destination unreachable from this environment" - retrying
// is pointless and just wastes time. We surface them immediately.
const UNREACHABLE_CODES = new Set(['UNREACHABLE', 'NO_KEY', 'UNKNOWN_PROVIDER']);

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export function useWordImage(word, meaning, exampleSentence) {
  const cacheKey = makeCacheKey(word, meaning, exampleSentence);
  const cache = getSharedCache();

  const [imageUrl, setImageUrl] = useState(() => cache.get(cacheKey) || null);
  const [loading, setLoading] = useState(!cache.has(cacheKey) && !!word);
  const [error, setError] = useState(null);
  const [errorCode, setErrorCode] = useState(null);
  const [retryToken, setRetryToken] = useState(0);

  const retry = useCallback(() => {
    setError(null);
    setErrorCode(null);
    setImageUrl(null);
    setLoading(true);
    setRetryToken(t => t + 1);
  }, []);

  useEffect(() => {
    if (!word) {
      setImageUrl(null);
      setLoading(false);
      return;
    }

    const cached = cache.get(cacheKey);
    if (cached) {
      setImageUrl(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;

    async function fetchOnce() {
      try {
        // Step 1: Supabase cache lookup
        const fromDb = await getCachedImage(word, meaning, exampleSentence);
        if (cancelled) return null;
        if (fromDb) {
          cache.set(cacheKey, fromDb);
          setImageUrl(fromDb);
          return fromDb;
        }

        // Step 2: Generate via Vercel API (gpt-image-2). imageGen.js sets
        // the 30s AbortController timeout.
        const result = await generateWordImage(word, meaning, exampleSentence);
        if (cancelled) return null;
        if (result?.imageUrl) {
          cache.set(cacheKey, result.imageUrl);
          setImageUrl(result.imageUrl);
          return result.imageUrl;
        }
        // Soft failure - provider returned null. result carries reason + code.
        return { softFail: true, reason: result?.reason, code: result?.code, transient: !!result?.transient };
      } catch (err) {
        if (cancelled) return null;
        return { softFail: true, reason: err?.message || 'load failed', code: 'CLIENT', transient: true };
      }
    }

    (async () => {
      while (attempts <= MAX_AUTO_RETRIES) {
        const r = await fetchOnce();
        if (cancelled) return;
        if (r === null) return; // cancelled mid-flight
        if (!r?.softFail) {
          // success (URL string) - done
          setLoading(false);
          return;
        }
        // Soft fail: decide what to do.
        const isUnreachable = UNREACHABLE_CODES.has(r.code);
        const canRetry = r.transient && !isUnreachable && attempts < MAX_AUTO_RETRIES;
        if (canRetry) {
          attempts++;
          console.warn(`[useWordImage] ${word} attempt ${attempts} failed (${r.code}), retrying...`);
          await sleep(AUTO_RETRY_DELAY_MS);
          if (cancelled) return;
          continue;
        }
        // Either we've exhausted retries OR the error is structurally
        // unrecoverable (UNREACHABLE). Record and bail.
        if (isUnreachable) {
          console.warn(`[useWordImage] ${word} unreachable (${r.code}); falling back to emoji/SVG.`);
        }
        setError(r.reason || '生成失败');
        setErrorCode(r.code || 'UNKNOWN');
        setLoading(false);
        return;
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word, exampleSentence, retryToken]);

  return { imageUrl, loading, error, errorCode, retry };
}