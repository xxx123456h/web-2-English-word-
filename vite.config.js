import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// AI 调用通过 Vite 代理转发到 https://api.ymhss.cn
// 原因：api.ymhss.cn 不返回 CORS 头，浏览器直接跨域请求会被拦截
// 代理只在 dev server 生效；生产环境需部署 Vercel/Netlify 函数转发
//
// 注意：代理只匹配旧的真路由路径（/api/ai-relay, /api/ai-memory）。
// /api/ai-image 是 Vercel Serverless Function，本地 dev 由下面这个 tiny
// Vite plugin 直接执行（避免 Vercel CLI 的依赖）。
// 如果用代理拦截了 /api/ai-image，本地永远无法调用到 gpt-image-2.5-flare。

// ---- Local dev middleware: serve /api/* from api/*.js ----
// Each /api/<name> route maps to api/<name>.js exporting a default handler.
// The handler is wrapped with a small shim that adapts Vercel's (req, res)
// to Node's IncomingMessage/ServerResponse (which they already are).
function apiDevPlugin() {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next();
        // Strip query string, normalize trailing slash
        const urlPath = req.url.split('?')[0].replace(/\/$/, '');
        const routeName = urlPath.replace(/^\/api\//, '');
        if (!routeName) return next();

        const handlerPath = path.join(process.cwd(), 'api', `${routeName}.js`);
        if (!fs.existsSync(handlerPath)) return next();

        try {
          // Use a cache-busting query so Vite re-imports the handler on edits
          const mod = await import(`${handlerPath}?t=${Date.now()}`);
          if (typeof mod.default !== 'function') return next();

          // Express middleware -> Node handler adapter (Vercel signature)
          // Strip the /api/<name> prefix so handlers see req.url starting with /
          req.url = '/' + (req.url.replace(/^\/api\/[^?]+/, '') || '');
          await mod.default(req, res);
        } catch (err) {
          console.error(`[api-dev] ${routeName} crashed:`, err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'dev middleware failure', detail: err?.message }));
          }
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), apiDevPlugin()],
  server: {
    proxy: {
      // 旧 Claude 中转站转发
      '/api/ai-relay': {
        target: 'https://api.ymhss.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ai-relay/, ''),
        secure: true,
      },
      // 兼容老路径 /api/ai (camera.js 等老代码用过的别名)
      // dev 下走代理到中转站,生产环境走 Vercel Serverless (api/ai.js)
      '/api/ai': {
        target: 'https://api.ymhss.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ai/, ''),
        secure: true,
      },
      // 旧的 AI memory 路由（如果存在）
      '/api/ai-memory': {
        target: 'https://api.ymhss.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ai-memory/, ''),
        secure: true,
      }
    }
  }
})
