// api/ai-memory.js
// Vercel Serverless Function — AI 生成联想记忆

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { word, meaning } = req.body;

  if (!word) return res.status(400).json({ error: '缺少 word 参数' });

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `为英语单词"${word}"（${meaning || ''}）生成学习辅助，仅返回JSON：
        {
          "rootAffix": "词根词缀拆解，无则为空字符串",
          "memoryTip": "有趣的联想/谐音记忆法，2句以内",
          "example": "一个英文例句",
          "exampleCN": "例句中文翻译"
        }`
      }],
    });

    const text = message.content[0].text;
    const json = JSON.parse(text.replace(/```json|```/g, '').trim());
    res.status(200).json(json);
  } catch (err) {
    console.error('AI memory generation failed:', err);
    res.status(500).json({ error: 'AI 生成失败', details: err.message });
  }
}
