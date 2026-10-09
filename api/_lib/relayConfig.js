// api/_lib/relayConfig.js
// 统一读取 infistar.ai 中转配置（仅服务端使用，不要加 VITE_ 前缀）
//
// 识词 / 查词 / 配图 / 配图 planner 共用同一个中转站和 Key：
//   INFISTAR_BASE_URL  可写 https://infistar.ai 或 https://infistar.ai/v1
//   INFISTAR_API_KEY   中转站 Key
//
// 这里统一去掉末尾的 /v1，调用方再拼 /v1/...，避免出现 /v1/v1 或缺 /v1。

const DEFAULT_BASE_URL = 'https://infistar.ai/v1';

export function relayOrigin() {
  const raw = (process.env.INFISTAR_BASE_URL || DEFAULT_BASE_URL).trim();
  return raw.replace(/\/+$/, '').replace(/\/v1$/, '');
}

// subPath 形如 '/v1/chat/completions'
export function relayUrl(subPath) {
  const p = subPath.startsWith('/') ? subPath : `/${subPath}`;
  return relayOrigin() + p;
}

export function relayKey() {
  return (process.env.INFISTAR_API_KEY || '').trim();
}
