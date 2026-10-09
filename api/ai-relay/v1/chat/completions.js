// api/ai-relay/v1/chat/completions.js
// Vercel 上 /api/ai-relay/v1/chat/completions 命中的是这个文件（而不是 api/ai-relay.js），
// 这里直接复用 api/ai-relay.js 的 handler，保证两条路径行为一致、只维护一处。
// （原先此文件里的「转发失败自动重试」逻辑已迁移到 api/ai-relay.js）
export { default } from '../../../ai-relay.js';
