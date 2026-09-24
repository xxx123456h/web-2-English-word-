// api/ai-relay.js
// Vercel Serverless Function — AI 中转站代理（解决 api.ymhss.cn 不支持浏览器跨域的问题）
//
// 用法（前端）：
//   fetch('/api/ai-relay/v1/chat/completions', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json', Authorization: 'Bearer <VITE_CLAUDE_API_KEY>' },
//     body: JSON.stringify({ model, messages, ... })
//   })
//
// 后端转发到：https://api.ymhss.cn/v1/chat/completions
// Key 从请求头透传（前端持有），避免在前端代码里硬编码中转站 Key
//
// 生产环境路径：/api/ai-relay/*
//
// 注意：此函数不做鉴权，仅做转发。Key 安全靠浏览器侧 import.meta.env。

const TARGET_BASE = 'https://api.ymhss.cn';

export default async function handler(req, res) {
  // 早期诊断日志：记录入口请求,便于排查 "Vercel 404 没命中函数 vs 中转站出错"
  // 看到这行 = 路由已命中 ai-relay 函数;看不到 = 请求根本没到这里(Vercel 在路由层 404)
  console.log('[ai-relay] hit', { method: req.method, url: req.url, hasAuth: !!req.headers.authorization });

  // 处理 CORS 预检（部署后浏览器仍会问）
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST' });
  }

  // 从 req.url 去掉 /api/ai-relay 前缀，拼接到中转站
  // 例：/api/ai-relay/v1/chat/completions → /v1/chat/completions
  const subPath = (req.url || '').replace(/^\/api\/ai-relay/, '') || '/';
  const targetUrl = TARGET_BASE + subPath;

  // 透传 Authorization 头（由前端从 import.meta.env.VITE_CLAUDE_API_KEY 注入）
  const authHeader = req.headers.authorization || req.headers.Authorization || '';

  try {
    const upstream = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(req.body),
    });

    // 透传上游响应（包括流式 SSE）
    res.setHeader('Access-Control-Allow-Origin', '*');
    const contentType = upstream.headers.get('content-type') || 'application/json';
    res.setHeader('Content-Type', contentType);

    const text = await upstream.text();

    // 防御性处理：上游返回空 body 时,直接返回结构化错误而不是传一个空字符串
    // 给前端 (否则前端 res.json() 会抛 "unexpected end of data")
    if (!text || text.trim().length === 0) {
      console.warn('[ai-relay] upstream returned empty body, status=', upstream.status);
      return res.status(upstream.status || 502).json({
        error: '中转站返回空响应',
        upstreamStatus: upstream.status,
        details: `api.ymhss.cn 在调用 ${subPath} 时返回了空 body (HTTP ${upstream.status}). 通常由 key 失效/限额/服务端超时引起.`,
      });
    }

    // 上游返回 HTML (例如错误页面) 时,不要按 JSON 透传 — 包成 JSON 错误
    if (!contentType.includes('json') && !contentType.includes('text/event-stream')) {
      console.warn('[ai-relay] upstream returned non-JSON content-type:', contentType, 'preview:', text.slice(0, 120));
      return res.status(upstream.status || 502).json({
        error: '中转站返回了非 JSON 响应',
        upstreamStatus: upstream.status,
        contentType,
        preview: text.slice(0, 200),
      });
    }

    return res.status(upstream.status).send(text);
  } catch (err) {
    console.error('[ai-relay] 转发失败:', err);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(502).json({ error: '中转站连接失败', details: err.message });
  }
}