// src/components/ClaudeSvgFallback.jsx
// Claude-driven SVG illustration fallback.
//
// Why this exists:
//   * The user explicitly asked for AI-generated images via gpt-image-2 /
//     infistar.ai. That's the primary path.
//   * But infistar.ai is firewalled from mainland China networks (GFW).
//     When the primary path fails permanently (UNREACHABLE, NO_KEY etc.),
//     we fall back to asking Claude (api.ymhss.cn - reachable) to design
//     a small SVG. Claude returns JSON describing colors, an emoji glyph,
//     and decorative shapes; we render an inline SVG data URL as the
//     "image" for the flashcard.
//
// This is NOT an AI image - it's a generated illustration. It's strictly
// better than failing silently and worse than a real AI render. The
// primary path always wins when it works.

import { useState, useEffect } from 'react';

// ---- Scene design system ----
// Claude picks from these palettes and shapes so the SVG looks consistent
// across words. We constrain the design space to keep the result looking
// like a flashcard illustration (not random art).
const PALETTES = [
  { bg: ['#FEF3C7', '#F59E0B'], accent: '#92400E', text: '#78350F' },
  { bg: ['#DBEAFE', '#3B82F6'], accent: '#1E3A8A', text: '#1E40AF' },
  { bg: ['#D1FAE5', '#10B981'], accent: '#064E3B', text: '#065F46' },
  { bg: ['#FCE7F3', '#EC4899'], accent: '#831843', text: '#9D174D' },
  { bg: ['#EDE9FE', '#8B5CF6'], accent: '#4C1D95', text: '#5B21B6' },
  { bg: ['#FFE4E6', '#F43F5E'], accent: '#881337', text: '#9F1239' },
  { bg: ['#CFFAFE', '#06B6D4'], accent: '#164E63', text: '#155E75' },
  { bg: ['#F0FDF4', '#22C55E'], accent: '#14532D', text: '#166534' },
];

const SHAPE_KINDS = ['circle', 'square', 'diamond', 'star', 'wave', 'leaf', 'sun', 'moon'];

// ---- In-memory cache so we don't ask Claude twice for the same word ----
const cache = new Map();

function pickPaletteByIndex(i) {
  return PALETTES[Math.abs(i) % PALETTES.length];
}

function buildSvgFromDesign(design, word, meaning, size) {
  const palette = PALETTES[design.paletteIndex ?? 0] || PALETTES[0];
  const bg = palette.bg;
  const accent = palette.accent;
  const text = palette.text;

  // Decorative shapes — Claude picks 3-5
  const shapes = (design.shapes || []).slice(0, 5).map((s, idx) => {
    const k = s.kind || SHAPE_KINDS[idx % SHAPE_KINDS.length];
    const cx = s.x ?? (15 + idx * 16);
    const cy = s.y ?? (50 + (idx % 2) * 12);
    const r = s.size ?? 10;
    const opacity = s.opacity ?? 0.18;
    if (k === 'circle') return `<circle cx="${cx}%" cy="${cy}%" r="${r}" fill="${accent}" opacity="${opacity}"/>`;
    if (k === 'square') return `<rect x="${cx - r/2}%" y="${cy - r/2}%" width="${r}" height="${r}" fill="${accent}" opacity="${opacity}" transform="rotate(${idx * 23} ${cx} ${cy})"/>`;
    if (k === 'diamond') return `<polygon points="${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}" fill="${accent}" opacity="${opacity}"/>`;
    if (k === 'star') {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const ang = (Math.PI * 2 * i) / 10 - Math.PI / 2;
        const radius = i % 2 === 0 ? r : r * 0.4;
        pts.push(`${cx + Math.cos(ang) * radius * 0.7}%,${cy + Math.sin(ang) * radius * 0.5}%`);
      }
      return `<polygon points="${pts.join(' ')}" fill="${accent}" opacity="${opacity}"/>`;
    }
    if (k === 'wave') return `<path d="M0,${cy} Q${cx},${cy - r * 1.5} 100,${cy}" stroke="${accent}" stroke-width="2" fill="none" opacity="${opacity}"/>`;
    if (k === 'leaf') return `<ellipse cx="${cx}%" cy="${cy}%" rx="${r}" ry="${r * 0.4}" fill="${accent}" opacity="${opacity}" transform="rotate(${idx * 30} ${cx} ${cy})"/>`;
    if (k === 'sun') return `<g><circle cx="${cx}%" cy="${cy}%" r="${r * 0.5}" fill="${accent}" opacity="${opacity}"/>` + Array.from({length: 8}, (_, i) => {
      const ang = (Math.PI * 2 * i) / 8;
      const x1 = cx + Math.cos(ang) * r * 0.7;
      const y1 = cy + Math.sin(ang) * r * 0.5;
      const x2 = cx + Math.cos(ang) * r;
      const y2 = cy + Math.sin(ang) * r * 0.85;
      return `<line x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%" stroke="${accent}" stroke-width="1.5" opacity="${opacity}"/>`;
    }).join('') + `</g>`;
    if (k === 'moon') return `<path d="M${cx}%,${cy - r}% a${r},${r} 0 1,0 0,${r * 2}% a${r * 0.6},${r} 0 1,1 0,${-r * 2}% z" fill="${accent}" opacity="${opacity}"/>`;
    return '';
  }).join('');

  const glyph = design.glyph || '';
  const wordSafe = String(word || '').replace(/[<>&]/g, '');
  const meaningSafe = String(design.label || meaning || '').slice(0, 24).replace(/[<>&]/g, '');

  // Wrap the SVG into a data URL so it works as an <img src> like a real image.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg[0]}"/>
        <stop offset="100%" stop-color="${bg[1]}"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    ${shapes}
    <text x="50%" y="${glyph ? '38%' : '45%'}" text-anchor="middle" font-size="${size * 0.38}" font-family="sans-serif">${glyph}</text>
    <text x="50%" y="${glyph ? '62%' : '60%'}" text-anchor="middle" font-size="${size * 0.13}" font-weight="800" fill="${text}" font-family="sans-serif">${wordSafe}</text>
    ${meaningSafe ? `<text x="50%" y="${glyph ? '80%' : '78%'}" text-anchor="middle" font-size="${size * 0.07}" fill="${text}" opacity="0.75" font-family="sans-serif">${meaningSafe}</text>` : ''}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// ---- Claude call (via /api/ai-relay, which already talks to api.ymhss.cn) ----
// We ask Claude to design the SVG scene; it returns JSON we parse.
async function askClaudeForDesign(word, meaning) {
  const system = `You are a flashcard illustrator. Output ONLY a JSON object describing a small, flat illustration for an English vocabulary word. The illustration will be rendered as inline SVG.

Hard rules:
- Output ONLY the JSON object, no prose, no markdown fences.
- Pick paletteIndex 0-5 based on the word's mood (warm/cool/calm/active).
- Pick 3-5 shapes from: circle, square, diamond, star, wave, leaf, sun, moon.
- Shapes are decorative background elements (low opacity). Place them via x,y in 0-100% range, size 5-15.
- Pick a SINGLE emoji glyph that strongly represents the word (e.g. apple -> "🍎", challenge -> "🏔️").
- Provide a label: the primary Chinese meaning (max 8 chars).

Example for "ancient" meaning "古代的":
{"paletteIndex":2,"glyph":"🏛️","label":"古代","shapes":[{"kind":"circle","x":20,"y":30,"size":10},{"kind":"star","x":70,"y":20,"size":8},{"kind":"wave","x":50,"y":75,"size":14,"opacity":0.12}]}`;

  const user = `Word: "${word}"\nMeaning: ${meaning || ''}\nReturn JSON.`;

  // Use the existing ai-relay route so we don't duplicate the relay logic.
  // Key 由服务端 ai-relay 从 CLAUDE_API_KEY 环境变量注入，前端不再持有
  const resp = await fetch('/api/ai-relay/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 350,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!resp.ok) throw new Error(`relay HTTP ${resp.status}`);
  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content || '';
  // Parse JSON
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch (_) {
    return null;
  }
}

// ---- Hash-based palette/shape selection when Claude is also unreachable ----
// This guarantees the card has *some* visual even with zero network.
function localDesign(word) {
  let h = 0;
  const s = String(word || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const paletteIndex = h % PALETTES.length;
  const glyphs = ['📘', '🌟', '✨', '🎯', '🌱', '🔥', '💡', '🎨', '🌈', '⚡'];
  const glyph = glyphs[h % glyphs.length];
  const shapes = [
    { kind: 'circle', x: 20, y: 30, size: 12 },
    { kind: 'star', x: 70, y: 25, size: 10 },
    { kind: 'wave', x: 50, y: 75, size: 14, opacity: 0.15 },
  ];
  return { paletteIndex, glyph, shapes, label: '' };
}

// ---- React component ----
export function ClaudeSvgFallback({ word, meaning, exampleSentence, size = 160 }) {
  const [design, setDesign] = useState(() => cache.get(`design::${word}`) || null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!word) return;
    const cached = cache.get(`design::${word}`);
    if (cached) { setDesign(cached); return; }

    let cancelled = false;
    (async () => {
      try {
        const d = await askClaudeForDesign(word, meaning);
        if (cancelled) return;
        const final = d || localDesign(word);
        cache.set(`design::${word}`, final);
        setDesign(final);
      } catch (err) {
        if (!cancelled) {
          // Claude also failed - fall back to local hash-based design.
          const local = localDesign(word);
          cache.set(`design::${word}`, local);
          setDesign(local);
          setError(err?.message || 'design failed');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [word, meaning]);

  // Loading state - same skeleton look as the AI image layer
  if (!design) {
    return (
      <div style={{
        width: size, height: size, margin: '0 auto 12px', borderRadius: 20,
        background: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)',
          backgroundSize: '200% 100%', animation: 'shimmer 1.4s linear infinite',
        }} />
      </div>
    );
  }

  const url = buildSvgFromDesign(design, word, meaning, size);

  return (
    <div style={{
      width: size, height: size, margin: '0 auto 12px', borderRadius: 20,
      position: 'relative', overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    }}>
      <img
        src={url}
        alt={`${word} illustration`}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </div>
  );
}