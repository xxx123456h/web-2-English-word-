# 单词学习应用 (English Word Learning App)

基于 React 19 + Vite 8 的交互式英语单词学习网站，集成 AI 配图（emoji 兜底架构）、拍照 OCR 圈词识别、Claude 释义查询。

## 主要功能

- 📚 **多本词库** — 切换不同词书，按日推送复习计划
- 🎨 **AI 配图** — 单词 emoji 即时显示 + gpt-image-2 后台生成真实配图叠加
- 📸 **拍照圈词** — 上传图片，AI 自动识别被圈/划线的英文单词并给出释义
- 🔊 **单词配音** — 真人发音 + IPA 音标
- 📈 **进度追踪** — 每日目标 / 复习算法 / 学习曲线
- 🌙 **暗色模式** — 跟随系统或手动切换

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | React 19.2 + Vite 8 |
| 状态 | React Hooks + 自研轻量 store |
| 数据库 | Supabase (auth + postgres + storage) |
| AI 配图 | infistar.ai → `gpt-image-2.5-flare` |
| AI OCR / 释义 | Claude Sonnet 4.6 (via api.ymhss.cn 中转) |
| 部署 | Vercel (Serverless Functions + Cron) |

## 本地开发

```bash
npm install
cp .env.local.example .env.local   # 填入你的 key
npm run dev
```

打开 http://localhost:5173

## 部署到 Vercel

### 1. 推送代码到 GitHub

```bash
git add .
git commit -m "deploy: 准备 Vercel 部署"
git push origin main
```

### 2. 在 Vercel 创建项目

1. 打开 https://vercel.com/new
2. 选择你的 GitHub 仓库
3. Framework Preset 选择 **Vite**
4. **不要**先点 Deploy — 先去配置环境变量（见下）

### 3. 配置环境变量

Vercel Dashboard → Project → Settings → Environment Variables，逐项添加：

| 变量名 | 说明 | 必填 |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase 项目 URL（如 `https://xxx.supabase.co`） | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名 key（前端可见，安全） | ✅ |
| `VITE_CLAUDE_API_KEY` | api.ymhss.cn 中转站 key，用于拍照 OCR 和 Claude 释义 | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务端 key（**只在服务端**，用于 daily-push cron） | ✅ |
| `INFISTAR_API_KEY` | infistar.ai key，用于 AI 单词配图 | ⚠️ 强烈建议 |
| `INFISTAR_BASE_URL` | infistar.ai 端点，默认 `https://infistar.ai/v1` | ❌ 可选 |
| `INFISTAR_IMAGE_MODEL` | 模型名，默认 `gpt-image-2.5-flare` | ❌ 可选 |
| `AI_IMAGE_PROVIDER` | 固定 `infistar` | ❌ 可选 |

> ⚠️ 所有 `VITE_*` 变量会**被打包进前端 JS**，所以这些 key 必须是可以公开暴露的（Supabase anon key / 中转站 key 设计上就是给浏览器用的）。
>
> ⚠️ `INFISTAR_API_KEY` / `SUPABASE_SERVICE_ROLE_KEY` **绝对不要**加 `VITE_` 前缀，否则会被打包到前端泄露。

### 4. 点击 Deploy

环境变量配好后点 Deploy，1-2 分钟后会得到一个 `https://your-project.vercel.app` 链接。

### 5. 域名 / 子域名

免费 `.vercel.app` 子域名会自动分配。如需自定义域名：
- Project → Settings → Domains → 添加你的域名
- 在域名服务商加 CNAME 记录指向 `cname.vercel-dns.com`

## 架构说明

```
├── api/                  Vercel Serverless Functions
│   ├── ai-image.js       AI 单词配图（Claude planner + gpt-image-2 并行）
│   ├── ai-relay.js       Claude 中转（CORS 代理）
│   ├── ai-memory.js      AI 记忆助手
│   ├── daily-push.js     每日推送 (Cron)
│   └── _lib/             服务端公共逻辑
├── src/
│   ├── components/       UI 组件（WordAiImage, ClaudeSvgFallback, ...）
│   ├── hooks/            React Hooks（useWordImage, useAuth, ...）
│   ├── lib/services/     AI 服务（camera.js, imageGen.js, ...）
│   ├── pages/            页面
│   └── App.jsx           主应用
└── vercel.json           Vercel 部署配置
```

### AI 配图的双层架构

| 层 | 触发时机 | 显示 |
|---|---|---|
| Emoji 兜底层 | 首屏 <16ms | 词书里的 emoji + 单词标签（`wordEmojiMap.js`）|
| AI 真实配图层 | 后台 5-15s 后 | 真实生成的图叠加在 emoji 上，交叉淡入 |

这样即使 infistar.ai 在 GFW 后不可达，每张卡片也**永远**有图显示。

## 常见问题

### 部署后图片加载失败？

检查：
1. Vercel 环境变量里 `INFISTAR_API_KEY` 是否配置（Production 环境，不是 Preview）
2. Vercel Function Logs 里有没有 `UNREACHABLE` / `NO_KEY` 错误
3. 国内网络访问 infistar.ai 受 GFW 影响 — emoji 兜底会自动顶上

### 拍照识别显示 "中转站返回空响应"？

1. 检查 `VITE_CLAUDE_API_KEY` 是否完整（不是被截断的）
2. Vercel 函数日志里看 `api/ai-relay.js` 上游响应状态码
3. 中转站额度是否用尽