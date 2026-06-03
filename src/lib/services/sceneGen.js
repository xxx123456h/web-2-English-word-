// src/lib/services/sceneGen.js
// 通过 Claude API 生成单词的「可视化场景描述」
// 输出结构化数据，前端用 CSS/SVG 渲染成简洁插图

const ENDPOINT = '/api/claude/v1/messages';

/**
 * 调用 Claude 生成单词的可视化场景描述
 * @returns {Promise<{emoji: string, scene: string, bg: string, fg: string}>}
 */
export async function generateScene(word, meaning) {
  const prompt = `For the English word "${word}" (meaning: ${meaning || 'unknown'}),
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
        'Authorization': `Bearer ${import.meta.env.VITE_CLAUDE_API_KEY}`,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const text = data.content?.[0]?.text || '';

    // 解析 JSON（容错处理）
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        emoji: parsed.emoji || '📚',
        scene: parsed.scene || `${word} illustration`,
        bg: parsed.bg || '#FEF3C7',
        fg: parsed.fg || '#F59E0B',
        mood: parsed.mood || 'happy',
      };
    }
  } catch (err) {
    console.warn('sceneGen 失败，使用本地降级:', err.message);
  }

  // 降级方案：基于 meaning 关键词猜测颜色
  return fallbackScene(word, meaning);
}

function fallbackScene(word, meaning) {
  const m = (meaning || '').toLowerCase();
  let bg = '#FEF3C7', fg = '#F59E0B', emoji = '📚', mood = 'happy';
  if (m.includes('放弃') || m.includes('离开') || m.includes('抛弃') || m.includes('abandon')) {
    bg = '#FECACA'; fg = '#EF4444'; emoji = '👋'; mood = 'calm';
  } else if (m.includes('恶化') || m.includes('坏') || m.includes('负')) {
    bg = '#FED7AA'; fg = '#EA580C'; emoji = '⚠️'; mood = 'active';
  } else if (m.includes('放弃') || m.includes('打击') || m.includes('困难')) {
    bg = '#E0E7FF'; fg = '#4F46E5'; emoji = '💪'; mood = 'active';
  } else if (m.includes('快') || m.includes('速') || m.includes('加速') || m.includes('accelerate')) {
    bg = '#FEF3C7'; fg = '#F59E0B'; emoji = '⚡'; mood = 'active';
  } else if (m.includes('认') || m.includes('知道') || m.includes('承')) {
    bg = '#D1FAE5'; fg = '#10B981'; emoji = '✅'; mood = 'happy';
  } else if (m.includes('废') || m.includes('除') || m.includes('abolish')) {
    bg = '#FEE2E2'; fg = '#DC2626'; emoji = '🚫'; mood = 'active';
  } else if (m.includes('美') || m.includes('好') || m.includes('优')) {
    bg = '#FEF3C7'; fg = '#D97706'; emoji = '✨'; mood = 'warm';
  }
  return { emoji, scene: `${word} (${meaning || ''})`, bg, fg, mood };
}
