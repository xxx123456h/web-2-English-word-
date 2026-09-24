// src/lib/services/camera.js
// 图片转 base64 + AI 视觉识别圈划单词 + 批量释义查询
//
// 中转站：https://api.ymhss.cn（Claude Code 官方 Max 通道，OpenAI 兼容）
// 视觉模型：claude-sonnet-4-6（速度 + 精度均衡，OCR 比 Haiku 强）
// 备选：claude-haiku-4-5-20251001（如果 sonnet 不可用降级）
//
// 路径策略（统一走 /api/ai-relay）：
//   - dev (npm run dev): Vite 代理 /api/ai-relay/* → https://api.ymhss.cn/*
//   - prod (Vercel):     Vercel 函数 api/ai-relay.js → https://api.ymhss.cn/*
// 原因：api.ymhss.cn 不返回 CORS 头,浏览器直连跨域会被拦截,所以无论 dev 还是 prod
// 都必须走中转. dev 下用 Vite 代理,prod 下用 Vercel 函数,两者都最终转发到同一中转站.

const VISION_MODEL = 'claude-sonnet-4-6'
const ENDPOINT = '/api/ai-relay/v1/chat/completions'

// 图片转 base64
export const toBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result.split(",")[1])
  reader.onerror = reject
  reader.readAsDataURL(file)
})

/**
 * 图片预处理：平衡压缩（保证 OCR 精度的同时控制请求体 < 100KB）
 *
 * 关键参数：
 * - api.ymhss.cn 中转站请求体上限 100KB（实测验证）
 * - OCR 文本识别需要清晰度：长边 1536px（短语/句子比单词更小需要更多像素）
 * - 目标 base64 ≤ 50KB（中转站 100KB - prompt 约 50KB）
 * - 策略：长边 1536px，质量 0.7，递归降到 ≤ 50KB
 */
const MAX_DIM = 1536
const TARGET_BASE64_CHARS = 50 * 1024  // 50KB base64（最大化余量给 prompt）

async function preprocessImage(dataUrl) {
  const loadedImg = await loadImage(dataUrl)
  if (!loadedImg) return dataUrl

  // 关键：使用 naturalWidth/naturalHeight（图像原始像素），不是 width/height
  let width = loadedImg.naturalWidth || loadedImg.width
  let height = loadedImg.naturalHeight || loadedImg.height

  // 第一步：限制长边
  if (width > MAX_DIM || height > MAX_DIM) {
    const ratio = Math.min(MAX_DIM / width, MAX_DIM / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  let quality = 0.5
  let curW = width
  let curH = height
  // 创建唯一 canvas，重用避免重复加载 dataURL
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  let result = renderToCanvas(loadedImg, canvas, ctx, curW, curH, quality)

  // 第二步：递归压缩 — 降质量到 0.3，再缩尺寸
  let attempts = 0
  while (result.length > TARGET_BASE64_CHARS && attempts < 12) {
    attempts++
    if (quality > 0.3) {
      quality -= 0.05
    } else {
      // 质量已达下限，缩小尺寸
      curW = Math.round(curW * 0.8)
      curH = Math.round(curH * 0.8)
      quality = 0.4
    }
    result = renderToCanvas(loadedImg, canvas, ctx, curW, curH, quality)
    if (curW < 320 || curH < 320) break
  }

  console.log(`[OCR] 压缩结果: ${(result.length / 1024).toFixed(1)}KB, 尺寸 ${curW}x${curH}, 质量 ${quality.toFixed(2)}, 尝试${attempts}次`)
  if (result.length > 90 * 1024) {
    console.warn(`[OCR] 仍可能超 100KB 限制（base64 ${result.length} chars）`)
  }
  return result
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/**
 * 重用 Image + Canvas 直接重绘并输出 JPEG dataURL
 * 不重新加载 dataURL（避免每次 parse 100KB+ 字符串）
 */
function renderToCanvas(img, canvas, ctx, width, height, quality) {
  canvas.width = width
  canvas.height = height
  // 白底（防止透明 PNG 转 JPEG 出黑底）
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', quality)
}

/**
 * 带 429 自动重试的 fetch 包装
 */
const fetchWithRetry = async (url, options, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, options)
      if (res.status === 429) {
        const wait = 2000 * (i + 1)
        console.warn(`[OCR] 429 限流，${wait}ms 后重试...`)
        await new Promise(r => setTimeout(r, wait))
        continue
      }
      return res
    } catch (e) {
      if (i === maxRetries - 1) throw e
      await new Promise(r => setTimeout(r, 1000))
    }
  }
  throw new Error('超过最大重试次数（429 限流持续）')
}

/**
 * 核心 OCR 识别函数：识别图片中被人工标注的英文内容
 * 支持三类标注内容：单词、短语、句子
 *
 * 返回结构化数组，每项包含：
 * - text: 原文（单词 / 短语 / 句子）
 * - type: "word" | "phrase" | "sentence"
 */
export const recognizeWords = async (base64, mediaType = "image/jpeg") => {
  try {
    const originalUrl = `data:${mediaType};base64,${base64}`
    const processedUrl = await preprocessImage(originalUrl)

    // 关键 prompt 设计：明确支持三类内容，用 type 字段区分
    // 优化点：明确要求宁可"宁可多识别"以提高召回率
    const systemPrompt = `You are a precise OCR assistant that identifies ALL manually annotated English content in images.

ANNOTATION TYPES TO DETECT (any of these marks count):
- Circled (oval/circle around the text)
- Boxed (rectangle around the text)
- Underlined (line drawn under)
- Highlighted (marker pen over)
- Struck-through (line through)

CONTENT TYPES TO RETURN:
- "word"     : a single English word (e.g. "borrow", "knowledge")
- "phrase"   : 2-4 word phrase (e.g. "go sightseeing", "department store")
- "sentence" : a complete English sentence (e.g. "How are you today?")

BE INCLUSIVE: When in doubt whether a mark is annotation, INCLUDE it. Better to return one extra item than miss a real one.

STRICT RULES:
1. Return the EXACT text as it appears in the image — NEVER translate, paraphrase, or correct spelling
2. Preserve original capitalization (lowercase the FIRST letter only)
3. Only include text with visible annotation marks; IGNORE unmarked text, page numbers, headings
4. Preserve left-to-right, top-to-bottom reading order
5. Remove exact duplicates
6. Output ONLY a JSON array, NO markdown, NO explanation

Output format (strict):
[{"text":"borrow","type":"word"},{"text":"go sightseeing","type":"phrase"},{"text":"How are you?","type":"sentence"}]`

    const userContent = `List all annotated English content. JSON array only.`

    const res = await fetchWithRetry(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 不再发 Authorization：Key 由服务端 ai-relay 从 CLAUDE_API_KEY 环境变量读取，避免前端泄露
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        // 提高 max_tokens 以容纳句子（一句话 50+ 字符 × 5-10 项 ≈ 600-1000 字符）
        max_tokens: 800,
        temperature: 0,
        messages: [{
          role: 'system',
          content: systemPrompt,
        }, {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: processedUrl } },
            { type: 'text', text: userContent },
          ],
        }],
      }),
    }, 3)

    // 先拿 text 再解析 — 如果上游返回空 body / HTML 错误页,res.json() 会抛
    // "unexpected end of data",我们用 text() 先读 raw 然后给出可读错误.
    const rawText = await res.text();
    if (!rawText || rawText.trim().length === 0) {
      throw new Error(`中转站返回空响应 (HTTP ${res.status}). 通常是 key 失效/限额/服务端超时,请检查 VITE_CLAUDE_API_KEY 配置`);
    }
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      // 不是 JSON: relay 已经把它包成 {error,...} 了,但保险起见再次检查
      if (rawText.includes('中转站') || rawText.includes('非 JSON')) {
        // 直接抓 relay 返回的 error.details 字段
        try {
          const wrapped = JSON.parse(rawText);
          throw new Error(wrapped.details || wrapped.error || '中转站错误');
        } catch (_) {
          throw new Error(`中转站错误: ${rawText.slice(0, 200)}`);
        }
      }
      throw new Error(`中转站返回了非 JSON 响应 (HTTP ${res.status}): ${rawText.slice(0, 200)}`);
    }
    if (data.error) {
      throw new Error(`AI 识别错误: ${data.error.message || data.error.details || JSON.stringify(data.error)}`);
    }

    const text = data.choices?.[0]?.message?.content || ''
    console.log('[OCR] AI 响应:', text.slice(0, 300))

    // 解析结构化 JSON 数组（容错：可能含 markdown 代码块）
    const result = parseOcrResult(text)
    return result
  } catch (err) {
    console.error('[OCR] 识别失败:', err)
    throw err
  }
}

/**
 * 解析 Claude 返回的 OCR 结果
 * 期望格式：[{"text":"...", "type":"word|phrase|sentence"}, ...]
 * 降级 1：如果 Claude 返回纯字符串数组 ["borrow","knowledge"] → 当作 word
 * 降级 2：完全解析失败 → 从文本提取所有英文单词（忽略短语/句子）
 */
function parseOcrResult(text) {
  const match = text.match(/\[[\s\S]*?\]/)
  if (!match) return []

  let parsed
  try {
    parsed = JSON.parse(match[0])
  } catch (e) {
    console.warn('[OCR] JSON 解析失败，二次提取:', e.message)
    // 降级 2：把整段文本当作 fallback
    const fallback = text.match(/[a-zA-Z]+(?:[ '\-][a-zA-Z]+)*/g) || []
    return dedupe(fallback.map(t => normalizeText(t, inferType(t))))
  }

  if (!Array.isArray(parsed)) return []

  const seen = new Set()
  const items = []
  for (const item of parsed) {
    let text, type
    if (typeof item === 'string') {
      text = item
      type = inferType(text)
    } else if (item && typeof item === 'object') {
      text = item.text || item.word || item.phrase || ''
      type = item.type || inferType(text)
    } else {
      continue
    }
    text = normalizeText(text, type)
    if (!text || !isValidOcrItem(text, type)) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    items.push({ text, type })
  }
  return items
}

/**
 * 文本规范化：
 * - 去首尾空格
 * - 首字母小写（统一风格）
 * - 压缩中间多余空格为单个空格
 */
function normalizeText(text, type) {
  if (!text || typeof text !== 'string') return ''
  return text.trim().replace(/\s+/g, ' ').replace(/^./, c => c.toLowerCase())
}

/**
 * 根据文本内容推断类型
 * - 1 个词、无空格 → word
 * - 2-4 词、有空格 → phrase
 * - 5+ 词 或以 .?! 结尾 → sentence
 */
function inferType(text) {
  const t = (text || '').trim()
  if (!t) return 'word'
  const wordCount = t.split(/\s+/).length
  if (/[.?!]$/.test(t)) return 'sentence'
  if (wordCount >= 5) return 'sentence'
  if (wordCount >= 2) return 'phrase'
  return 'word'
}

/**
 * 校验 OCR 项是否合法：
 * - 至少含一个英文字母
 * - 总长度 ≤ 200（防止异常长文本污染）
 * - 仅允许英文字母、空格、撇号、中横线、句末标点
 */
function isValidOcrItem(text, type) {
  if (!text) return false
  if (text.length > 200) return false
  if (!/[a-zA-Z]/.test(text)) return false
  // 允许的字符：a-z A-Z 空格 ' - . , ? !
  if (!/^[a-zA-Z '\-.,?!]+$/.test(text)) return false
  // word 类型必须 2+ 字母（避免 'I' / 'a' 这种虚词占位）
  if (type === 'word' && text.replace(/[^a-zA-Z]/g, '').length < 2) return false
  return true
}

/**
 * 旧 API 兼容：返回纯文本数组（仅 word 类型）
 */
function dedupe(arr) {
  const seen = new Set()
  return arr.filter(item => {
    const key = item.text.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * 保留旧 API 接口以便兼容
 * 旧接口期望：string[]（单词数组）
 * 新接口返回：[{text, type}] 数组
 * 这里把新结构转成旧接口的纯文本数组
 * === 注意：调用方应直接使用 recognizeWords 的新结构 ===
 */
export const recognizeWordsWithBoxes = async (base64, mediaType = "image/jpeg") => {
  const items = await recognizeWords(base64, mediaType)
  return items.map(({ text, type }) => ({
    text,
    type,
    bbox: { x0: 0, y0: 0, x1: 0, y1: 0 },
    confidence: 1
  }))
}

// 批量查询单词/短语/句子释义（Claude 文本 API）
// 输入：[{text: string, type: 'word'|'phrase'|'sentence'}]
// 输出：[{text, phonetic, definition, type}]
export const batchLookup = async (items) => {
  // 兼容旧 API 调用：如果传入 string[]，自动转成 {text, type}
  if (!items || items.length === 0) return []
  const normalized = items.map(it => {
    if (typeof it === 'string') {
      return { text: it, type: inferType(it) }
    }
    return { text: it.text || it.word || '', type: it.type || inferType(it.text || it.word || '') }
  })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Key 由服务端从 CLAUDE_API_KEY 环境变量注入，前端无需持有
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: VISION_MODEL,
        max_tokens: 1500,
        temperature: 0,
        messages: [{
          role: "user",
          content: `For each English text, provide IPA phonetic (if applicable) and concise Chinese definition.

Rules:
- For single words: give full IPA + Chinese meaning
- For phrases: give IPA for the whole phrase + Chinese meaning
- For sentences: skip phonetic, just give Chinese translation
- Each entry keeps the same "type" as input

Output ONLY a JSON array. Format:
[{"text":"borrow","phonetic":"/ˈbɒr.əʊ/","definition":"借入；借","type":"word"},{"text":"go sightseeing","phonetic":"/ɡəʊ ˈsaɪtˌsiː.ɪŋ/","definition":"观光","type":"phrase"},{"text":"How are you?","phonetic":"","definition":"你好吗？","type":"sentence"}]

Input: ${JSON.stringify(normalized)}`
        }]
      })
    })
    clearTimeout(timer)
    const rawText = await res.text()
    if (!rawText || rawText.trim().length === 0) {
      console.warn('[batchLookup] 中转站返回空响应,使用占位释义')
      return normalized.map(it => ({ text: it.text, phonetic: '', definition: '', type: it.type }))
    }
    let data
    try {
      data = JSON.parse(rawText)
    } catch (_) {
      console.warn('[batchLookup] 中转站返回非 JSON,使用占位释义')
      return normalized.map(it => ({ text: it.text, phonetic: '', definition: '', type: it.type }))
    }
    if (data.error) {
      console.warn('[batchLookup] API error:', data.error.message || data.error.details)
      return normalized.map(it => ({ text: it.text, phonetic: '', definition: '', type: it.type }))
    }
    const text = data.choices?.[0]?.message?.content ?? "[]"
    const match = text.match(/\[[\s\S]*?\]/)
    if (match) {
      try {
        const parsed = JSON.parse(match[0])
        // 兜底：保留每项的 type
        return parsed.map((item, i) => ({
          text: item.text || normalized[i]?.text || '',
          phonetic: item.phonetic || '',
          definition: item.definition || '',
          type: item.type || normalized[i]?.type || 'word',
        }))
      } catch (e) {
        console.warn('[batchLookup] JSON 解析失败')
      }
    }
    return normalized.map(it => ({ text: it.text, phonetic: '', definition: '', type: it.type }))
  } catch (e) {
    clearTimeout(timer)
    console.warn('[batchLookup] 异常:', e.message)
    return normalized.map(it => ({ text: it.text, phonetic: '', definition: '', type: it.type }))
  }
}
