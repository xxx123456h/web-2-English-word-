// 图片转 base64
export const toBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result.split(",")[1])
  reader.onerror = reject
  reader.readAsDataURL(file)
})

// 调用 Claude 识别圈划单词
export const recognizeWords = async (base64, mediaType = "image/jpeg") => {
  const res = await fetch("/api/claude/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${import.meta.env.VITE_CLAUDE_API_KEY}`,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: `找出图中所有被圆圈圈出或有下划线标注的英文单词。
如果没有圈划标注，则提取所有4个字母以上的英文单词。
只返回JSON数组，不要任何其他文字，例如：["word1","word2"]` }
        ]
      }]
    })
  })
  const data = await res.json()
  const text = data.content?.[0]?.text ?? "[]"
  return JSON.parse(text.match(/\[.*\]/s)?.[0] ?? "[]")
}

// 批量查询单词释义（一次 API 调用搞定所有单词）
export const batchLookup = async (words) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch("/api/claude/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${import.meta.env.VITE_CLAUDE_API_KEY}`,
        "anthropic-version": "2023-06-01",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `给以下英文单词提供音标和简短中文释义。只返回JSON数组：[{"word":"apple","phonetic":"/ˈæp.əl/","definition":"苹果"}]\n单词：${JSON.stringify(words)}`
        }]
      })
    })
    clearTimeout(timer)
    const data = await res.json()
    const text = data.content?.[0]?.text ?? "[]"
    return JSON.parse(text.match(/\[.*\]/s)?.[0] ?? "[]")
  } catch {
    clearTimeout(timer)
    return words.map(w => ({ word: w, phonetic: "", definition: "" }))
  }
}