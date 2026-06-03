// api/ai-image.js
// Vercel Serverless Function — AI 生成配图（占位实现）

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { word, meaning } = req.body;

  if (!word) return res.status(400).json({ error: '缺少 word 参数' });

  // 占位实现 — 返回 emoji 配图 URL
  // 后续可接入 DALL·E / Stable Diffusion 等图片生成 API
  const emojiMap = {
    'animal': '🐾', 'food': '🍽️', 'nature': '🌿', 'weather': '⛅',
    'body': '🦴', 'emotion': '💫', 'building': '🏛️', 'water': '💧',
  };

  const imageUrl = null; // 暂不生成真实图片

  res.status(200).json({
    imageUrl,
    emoji: '🎨',
    message: 'AI 配图功能待接入，当前为占位实现',
  });
}
