// src/lib/services/aiMemory.js
// AI 联想记忆 + 配图服务

// 调用 AI 生成记忆助记（通过 Vercel API Route）
export async function generateMemoryTip(word, meaning) {
  try {
    const response = await fetch('/api/ai-memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, meaning }),
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// 调用 AI 生成配图（通过 Vercel API Route）
export async function generateWordImage(word, meaning) {
  try {
    const response = await fetch('/api/ai-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        word,
        meaning,
        style: 'cute illustration, educational, warm colors',
      }),
    });

    if (!response.ok) return null;
    const { imageUrl } = await response.json();
    return imageUrl;
  } catch {
    return null;
  }
}

// 本地降级：当 API 不可用时生成简单记忆提示
export function getLocalMemoryTip(word, meaning) {
  return {
    rootAffix: '',
    memoryTip: `记住 "${word}" 的意思是 "${meaning}"，多读多练！`,
    example: '',
    exampleCN: '',
  };
}
