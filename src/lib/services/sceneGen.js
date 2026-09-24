// src/lib/services/sceneGen.js
// 通过代理（→ https://api.ymhss.cn）调用 OpenAI 格式 chat/completions，生成单词的「可视化场景描述」
//
// 中转站：https://api.ymhss.cn（Claude Code 官方 Max 通道，OpenAI 兼容）
// 模型：claude-haiku-4-5-20251001（成本最低）
//
// 路径策略：
//   - dev:  /api/ai/v1/chat/completions         → Vite 代理 → api.ymhss.cn
//   - prod: /api/ai-relay/v1/chat/completions   → Vercel 函数 → api.ymhss.cn
//   原因：api.ymhss.cn 不返回 CORS 头，浏览器必须经代理
//
// 关键升级：
// - 当提供 exampleSentence 时，prompt 以例句场景为中心（更精准、具象）
// - prompt 明确要求把目标单词的具体形象/动作画进场景，而不是只画单词含义
// - 例句的视觉上下文（如 "the cat abandoned its toy"）会被直接编码到 scene 描述里

const SCENE_MODEL = 'claude-haiku-4-5-20251001';
const ENDPOINT = import.meta.env.DEV
  ? '/api/ai/v1/chat/completions'
  : '/api/ai-relay/v1/chat/completions';

/**
 * 调用 Claude/GPT 生成单词的可视化场景描述
 * @param {string} word - 目标单词
 * @param {string} [meaning] - 单词释义
 * @param {string} [exampleSentence] - 例句（用于更精准的配图场景）
 * @returns {Promise<{emoji: string, scene: string, bg: string, fg: string, mood: string}>}
 */
export async function generateScene(word, meaning, exampleSentence = '') {
  // 例句存在时 → 以例句场景为中心
  const useExample = !!(exampleSentence && exampleSentence.trim().length > 4);
  const systemPrompt = useExample
    ? `You are a visual scene designer. Given an English word, its meaning, and an example sentence, you will design a simple illustration that depicts the SPECIFIC SCENE from the example sentence where the target word is being used in context. The target word's exact object/action must be visually prominent. Output ONLY a JSON object, no other text, no markdown.`
    : `You are a visual scene designer. Given an English word and its meaning, output ONLY a JSON object describing a simple illustration. No other text, no markdown.`;

  const userContent = useExample
    ? `Target word: "${word}" (meaning: ${meaning || 'unknown'})
Example sentence: "${exampleSentence}"

Design a SIMPLE CUTE ILLUSTRATION that depicts the scene from the example sentence above.
The TARGET WORD'S specific object / action / concept MUST be the visual focus of the illustration.

For example, if the sentence is "The cat abandoned its toy on the floor":
- Focus: the cat LEAVING BEHIND a toy (the action of abandoning)
- NOT just: a cat, or a toy

Return ONLY a JSON object with this exact structure, no other text:
{
  "emoji": "one representative emoji",
  "scene": "5-10 word English visual scene depicting the example sentence (e.g. 'small cat walking away from a toy on the floor')",
  "bg": "one CSS color hex for background (warm pastel)",
  "fg": "one CSS color hex for foreground character/object (contrast with bg)",
  "mood": "happy|calm|active|warm"
}

Rules:
- bg must be light (warm pastel, e.g. #FEF3C7, #FECACA, #DBEAFE, #D1FAE5)
- fg must contrast well with bg
- scene must be drawn from the example sentence's context, not just the word's dictionary meaning
- scene should be simple, suitable for a kawaii illustration`
    : `For the English word "${word}" (meaning: ${meaning || 'unknown'}),
generate a single short visual scene description for a cute simple illustration.

Return ONLY a JSON object with this exact structure, no other text:
{
  "emoji": "one representative emoji",
  "scene": "5-8 word English visual scene (e.g. 'small cat reading a book on a desk')",
  "bg": "one CSS color hex for background (warm pastel)",
  "fg": "one CSS color hex for foreground character/object (contrast with bg)",
  "mood": "happy|calm|active|warm"
}

Rules:
- bg must be light (warm pastel, e.g. #FEF3C7, #FECACA, #DBEAFE, #D1FAE85)
- fg must contrast well with bg
- scene should be simple, suitable for a kawaii illustration`;

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Key 由服务端从 CLAUDE_API_KEY 环境变量注入，前端无需持有
      },
      body: JSON.stringify({
        model: SCENE_MODEL,
        max_tokens: 400,
        temperature: 0.4,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
      }),
    });

    if (!res.ok) {
      console.warn('sceneGen HTTP', res.status)
      return fallbackScene(word, meaning, exampleSentence)
    }

    const data = await res.json()
    if (data.error) {
      console.warn('sceneGen API error:', data.error.message)
      return fallbackScene(word, meaning, exampleSentence)
    }

    const text = data.choices?.[0]?.message?.content || ''

    // 解析 JSON（容错处理）
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        const parsed = JSON.parse(match[0])
        return {
          emoji: parsed.emoji || '📚',
          scene: parsed.scene || `${word} illustration`,
          bg: parsed.bg || '#FEF3C7',
          fg: parsed.fg || '#F59E0B',
          mood: parsed.mood || 'happy',
        }
      } catch (e) {
        console.warn('sceneGen JSON parse failed:', e.message)
      }
    }
  } catch (err) {
    console.warn('sceneGen 失败，使用本地降级:', err.message)
  }

  // 降级方案：基于 meaning 关键词猜测颜色
  return fallbackScene(word, meaning, exampleSentence)
}

function fallbackScene(word, meaning, exampleSentence) {
  const m = (meaning || '').toLowerCase();
  const e = (exampleSentence || '').toLowerCase();
  const text = `${m} ${e}`;
  let bg = '#FEF3C7', fg = '#F59E0B', emoji = '📚', mood = 'happy';
  if (text.includes('放弃') || text.includes('离开') || text.includes('抛弃') || text.includes('abandon')) {
    bg = '#FECACA'; fg = '#EF4444'; emoji = '👋'; mood = 'calm';
  } else if (text.includes('恶化') || text.includes('坏') || text.includes('负')) {
    bg = '#FED7AA'; fg = '#EA580C'; emoji = '⚠️'; mood = 'active';
  } else if (text.includes('打击') || text.includes('困难')) {
    bg = '#E0E7FF'; fg = '#4F46E5'; emoji = '💪'; mood = 'active';
  } else if (text.includes('快') || text.includes('速') || text.includes('加速') || text.includes('accelerate')) {
    bg = '#FEF3C7'; fg = '#F59E0B'; emoji = '⚡'; mood = 'active';
  } else if (text.includes('认') || text.includes('知道') || text.includes('承')) {
    bg = '#D1FAE5'; fg = '#10B981'; emoji = '✅'; mood = 'happy';
  } else if (text.includes('废') || text.includes('除') || text.includes('abolish')) {
    bg = '#FEE2E2'; fg = '#DC2626'; emoji = '🚫'; mood = 'active';
  } else if (text.includes('美') || text.includes('好') || text.includes('优')) {
    bg = '#FEF3C7'; fg = '#D97706'; emoji = '✨'; mood = 'warm';
  } else if (text.includes('学') || text.includes('书') || text.includes('learn') || text.includes('study')) {
    bg = '#DBEAFE'; fg = '#2563EB'; emoji = '📚'; mood = 'calm';
  } else if (text.includes('吃') || text.includes('食物') || text.includes('eat') || text.includes('food')) {
    bg = '#FED7AA'; fg = '#EA580C'; emoji = '🍽️'; mood = 'warm';
  } else if (text.includes('家') || text.includes('home') || text.includes('house')) {
    bg = '#D1FAE5'; fg = '#10B981'; emoji = '🏠'; mood = 'warm';
  } else if (text.includes('爱') || text.includes('喜欢') || text.includes('love')) {
    bg = '#FECACA'; fg = '#EF4444'; emoji = '❤️'; mood = 'warm';
  }
  // 用例句前 30 个字符做场景描述，让降级也贴近例句
  const sceneFromExample = exampleSentence
    ? exampleSentence.slice(0, 60).trim()
    : `${word} (${meaning || ''})`;
  return { emoji, scene: sceneFromExample, bg, fg, mood };
}
