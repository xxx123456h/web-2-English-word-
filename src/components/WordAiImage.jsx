// src/components/WordAiImage.jsx
// Display a word illustration with the architecture described in the
// previous "两本书" fix:
//
//   1) Instant archetype (<16ms)   emoji + label from curated map
//   2) Image preparing             progress shimmer
//   3) Real AI image ready         <img> crossfades in
//
// Architecture choice (per user's latest decision):
//   * Restore emoji-first paint. This gives every card an instant visual
//     without waiting on infistar.ai (which is unreachable from the
//     user's network due to GFW).
//   * When the AI image eventually arrives via cache/generation, it
//     crossfades over the emoji layer on top of <img>.onLoad.
//   * Unknown words (no curated archetype) fall back to ClaudeSvgFallback
//     rather than defaulting to a misleading 📚 icon.
//
// Sync model:
//   * Single container, opacity crossfade between layers. <img>.onLoad
//     fires only when bytes are decoded and rendered - the exact moment
//     the picture is visible. We fade out the archetype at that instant.

import { useState, useEffect } from 'react';
import { useWordImage } from '../hooks/useWordImage';
import { ClaudeSvgFallback } from './ClaudeSvgFallback';
import { getWordStyle, MOOD_GRADIENTS } from '../lib/data/wordEmojiMap';

function pickArchetype(word) {
  return getWordStyle(word) || null;
}

export function WordAiImage({ word, meaning, exampleSentence, size = 160 }) {
  const { imageUrl, loading } = useWordImage(word, meaning, exampleSentence);
  const archetype = pickArchetype(word);

  // ---- Fork 1: word has no curated archetype ----
  // Delegate fully to ClaudeSvgFallback. Claude (via api.ymhss.cn) is
  // reachable from the user's network and generates a small SVG
  // illustration as a soft fallback. The hook still runs in parallel
  // and overlays a real AI image when it arrives.
  if (!archetype) {
    return (
      <UnknownWordImage
        word={word}
        meaning={meaning}
        exampleSentence={exampleSentence}
        imageUrl={imageUrl}
        size={size}
      />
    );
  }

  // ---- Fork 2: word has a curated archetype ----
  // Tracks whether <img> has actually finished decoding.
  const [imgReady, setImgReady] = useState(false);
  useEffect(() => { setImgReady(false); }, [imageUrl]);

  if (!word) return null;

  const hasImage = !!imageUrl;
  const showImage = hasImage && imgReady;

  return (
    <div
      style={{
        width: size,
        height: size,
        margin: '0 auto 12px',
        borderRadius: 20,
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        position: 'relative',
        background: archetype.gradient,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          opacity: showImage ? 0 : 1,
          transition: 'opacity 0.35s ease-out',
          pointerEvents: showImage ? 'none' : 'auto',
        }}
      >
        <div
          style={{
            fontSize: size * 0.5,
            lineHeight: 1,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
          }}
        >
          {archetype.emoji}
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: '#92400E',
            background: 'rgba(255,255,255,0.85)',
            padding: '2px 8px',
            borderRadius: 8,
            maxWidth: size - 16,
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {word}
        </div>
      </div>

      {hasImage && !imgReady && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0) 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.2s linear infinite',
            pointerEvents: 'none',
          }}
        />
      )}

      {hasImage && (
        <img
          src={imageUrl}
          alt={`${word} illustration`}
          onLoad={() => setImgReady(true)}
          onError={() => setImgReady(false)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: imgReady ? 1 : 0,
            transition: 'opacity 0.4s ease-out',
          }}
        />
      )}
    </div>
  );
}

// UnknownWordImage: used for vocabulary outside the curated archetype map.
// Default visual = ClaudeSvgFallback (Claude-designed SVG illustration).
// Once a real AI image is ready we crossfade to it on top.
function UnknownWordImage({ word, meaning, exampleSentence, imageUrl, size }) {
  if (!word) return null;
  const [imgReady, setImgReady] = useState(false);
  useEffect(() => { setImgReady(false); }, [imageUrl]);

  const hasImage = !!imageUrl;
  const showImage = hasImage && imgReady;

  return (
    <div
      style={{
        width: size,
        height: size,
        margin: '0 auto 12px',
        borderRadius: 20,
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        position: 'relative',
        background: MOOD_GRADIENTS.happy,
      }}
    >
      {/* ClaudeSvgFallback draws its own gradient + glyph internally. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: showImage ? 0 : 1,
          transition: 'opacity 0.35s ease-out',
          pointerEvents: showImage ? 'none' : 'auto',
        }}
      >
        <ClaudeSvgFallback
          word={word}
          meaning={meaning}
          exampleSentence={exampleSentence}
          size={size}
        />
      </div>

      {hasImage && !imgReady && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0) 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.2s linear infinite',
            pointerEvents: 'none',
          }}
        />
      )}

      {hasImage && (
        <img
          src={imageUrl}
          alt={`${word} illustration`}
          onLoad={() => setImgReady(true)}
          onError={() => setImgReady(false)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: imgReady ? 1 : 0,
            transition: 'opacity 0.4s ease-out',
          }}
        />
      )}
    </div>
  );
}