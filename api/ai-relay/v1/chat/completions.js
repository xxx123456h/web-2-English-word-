async function forwardWithRetry(url, options, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      console.warn(`第 ${i + 1} 次转发失败：`, err.cause?.code || err.message);
      if (i === retries) throw err;
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  if (!baseUrl || !apiKey) {
    return res.status(500).json({ error: '服务器未配置 AI_BASE_URL 或 AI_API_KEY' });
  }

  try {
    const upstream = await forwardWithRetry(`${baseUrl.replace(/\/$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(req.body),
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.send(text);
  } catch (err) {
    const cause = err.cause?.code || err.cause?.message || '';
    console.error('转发失败', err, err.cause);
    res.status(500).json({ error: `转发失败：${err.message} ${cause}` });
  }
}
