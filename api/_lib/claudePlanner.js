// api/_lib/claudePlanner.js
// Step 1 of the two-step pipeline: ask Claude to design the SINGLE most
// iconic visual for a word. The output is then fed to the image model
// as a refined prompt. This dramatically improves accuracy for abstract
// words, polysemous words, and words where literal translation produces
// the wrong image (e.g. abandon -> "abandon factory" vs "person leaving").
//
// Provider strategy (in priority order):
//   1) CLAUDE_API_KEY env var  -> call Anthropic API directly
//   2) VITE_CLAUDE_API_KEY env -> call api.ymhss.cn via /v1/chat/completions
//      (same model family, served by the user's existing relay pattern)
//
// If neither is configured we return null and the caller falls back to
// the frontend's prompt-only path.

const SYSTEM = `You are a visual scene designer for a vocabulary flashcard app.
Your job is to translate an English word (with optional Chinese meaning and
example sentence) into ONE concrete, instantly-recognizable visual.

Hard rules:
- Output ONLY a JSON object, no prose, no markdown fences.
- Pick the SINGLE most common visual representation of the word.
- For polysemous words, lock onto the PRIMARY (most common) sense.
- Avoid literal translation of Chinese meanings when the English word has
  a stronger iconic visual (e.g. "abandon" -> a person walking away from
  a toy, NOT an abandoned factory).
- The visual should be drawn with a single subject.
- Subject must be unambiguous so that a 5-year-old could name it.

Style diversification (IMPORTANT):
- The visual style MUST match the word's nature. Choose a "style" value
  from this list based on what fits best, NOT all words get the same style:
    * kawaii_cute      - concrete nouns (apple, cat, rocket, heart)
    * dynamic_scene    - action verbs (run, abandon, accelerate, chase)
    * atmospheric      - adjectives and adverbs (calm, ancient, warm, fast)
    * symbolic         - abstract concepts (freedom, justice, wisdom, time)
    * minimal_icon     - functional items (key, clock, phone, lock)
- For each style the "style_notes" should describe ONE clear visual mood.
  Do NOT include text, letters, words, or watermarks anywhere in the image.`;

function buildUserPrompt({ word, meaning, example }) {
  const lines = [
    `Word: "${word}"`,
  ];
  if (meaning) lines.push(`Meaning (Chinese, may include multiple senses): ${meaning}`);
  if (example && example.trim().length > 4) lines.push(`Example sentence: "${example}"`);

  lines.push(
    '',
    'Return ONLY this JSON (no other text):',
    '{',
    '  "subject": "5-12 word English phrase naming the ONE main thing to draw",',
    '  "action": "optional 3-8 word English phrase for what the subject is doing (empty string if static)",',
    '  "setting": "optional 3-8 word phrase for the minimal environment (empty string if plain white)",',
    '  "style": "kawaii_cute | dynamic_scene | atmospheric | symbolic | minimal_icon (choose the best fit)",',
    '  "style_notes": "1-2 short style hints matching the chosen style, e.g. \"kawaii, flat color, no text\""',
    '}',
    '',
    'Example for word "abandon" with example "the cat abandoned its toy":',
    '{',
    '  "subject": "small kitten",',
    '  "action": "walking away from a toy mouse on the floor",',
    '  "setting": "cozy living room floor",',
    '  "style": "dynamic_scene",',
    '  "style_notes": "soft pastel colors, gentle motion, no text"',
    '}',
    '',
    'Example for word "freedom":',
    '{',
    '  "subject": "white dove in flight",',
    '  "action": "spreading wings toward bright sky",',
    '  "setting": "open blue sky with soft clouds",',
    '  "style": "symbolic",',
    '  "style_notes": "uplifting, ethereal lighting, no text"',
    '}',
  );
  return lines.join('\n');
}

function parsePlannerJson(text) {
  if (!text) return null;
  // Strip optional ``` fences
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const objMatch = candidate.match(/\{[\s\S]*\}/);
  if (!objMatch) return null;
  try {
    const parsed = JSON.parse(objMatch[0]);
    if (typeof parsed?.subject === 'string' && parsed.subject.trim()) {
      return {
        subject: parsed.subject.trim(),
        action: typeof parsed.action === 'string' ? parsed.action.trim() : '',
        setting: typeof parsed.setting === 'string' ? parsed.setting.trim() : '',
        style: typeof parsed.style === 'string' ? parsed.style.trim() : 'kawaii_cute',
        style_notes: typeof parsed.style_notes === 'string' ? parsed.style_notes.trim() : '',
      };
    }
  } catch (_) {
    // fallthrough
  }
  return null;
}

// Per-style directives appended to the prompt so the image model varies
// its output even when given similar subject/action lines. Default bias
// is toward photorealistic since gpt-image-2 excels there; kawaii/minimal
// remain as opt-in styles for words where they actually fit.
const STYLE_DIRECTIVES = {
  kawaii_cute:  'kawaii style, cute chibi character, pastel palette, simple flat illustration, single subject centered',
  dynamic_scene: 'photorealistic dynamic composition with motion blur, vibrant saturated colors, action pose, single subject centered',
  atmospheric:   'photorealistic moody atmospheric lighting, soft depth-of-field, painterly illustration, single subject centered',
  symbolic:      'photorealistic metaphorical symbolic illustration, dreamlike quality, elegant minimal background, single subject centered',
  minimal_icon:  'flat icon illustration, clean geometric shapes, bold solid colors, single subject centered',
};

// Compose a final image-model prompt from a planner result.
export function composeImagePrompt(plan) {
  if (!plan) return '';
  const directive = STYLE_DIRECTIVES[plan.style] || STYLE_DIRECTIVES.kawaii_cute;
  // style_notes from Claude describes mood; directive describes style.
  // Combine so neither overpowers the other.
  const mood = plan.style_notes && plan.style_notes.length > 0
    ? plan.style_notes
    : 'no text, no letters, no words, no watermarks';

  const parts = [
    plan.subject,
    plan.action,
    plan.setting,
    directive,
    mood,
  ].filter(Boolean);
  return parts.join(', ');
}

// ---- Provider 1: direct Anthropic API ----
async function callDirectAnthropic({ word, meaning, example, signal }) {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) return null;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 350,
        system: SYSTEM,
        messages: [{ role: 'user', content: buildUserPrompt({ word, meaning, example }) }],
      }),
      signal,
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const text = data?.content?.[0]?.text || '';
    return parsePlannerJson(text);
  } catch (_) {
    return null;
  }
}

// ---- Provider 2: existing OpenAI-compatible relay ----
// Reuses the same pattern as the user's ai-relay.js. The VITE_CLAUDE_API_KEY
// is the user's bearer token for api.ymhss.cn.
async function callViaRelay({ word, meaning, example, signal }) {
  const bearer = process.env.VITE_CLAUDE_API_KEY;
  if (!bearer) return null;

  const base = process.env.CLAUDE_RELAY_URL || 'https://api.ymhss.cn';

  try {
    const resp = await fetch(`${base.replace(/\/$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearer}`,
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 350,
        temperature: 0.3,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: buildUserPrompt({ word, meaning, example }) },
        ],
      }),
      signal,
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content || '';
    return parsePlannerJson(text);
  } catch (_) {
    return null;
  }
}

/**
 * Plan a visual for a word. Returns the plan object or null if no planner
 * is available / all providers fail.
 */
export async function planWordVisual({ word, meaning, example }, opts = {}) {
  if (!word) return null;
  const signal = opts.signal;

  // Try direct Anthropic first (cheaper, faster).
  let plan = await callDirectAnthropic({ word, meaning, example, signal });
  if (plan) return plan;

  // Fall back to the user's existing relay.
  plan = await callViaRelay({ word, meaning, example, signal });
  return plan;
}