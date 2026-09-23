// api/_lib/aiImageProvider.js
// AI image generation provider abstraction.
//
// Why this file exists:
//   * We wire up infistar.ai -> gpt-image-2.5-flare, an Anthropic-compatible
//     endpoint whose path is /v1/chat/completions (NOT /v1/images/generations
//     as OpenAI's image API uses). The model returns a base64 PNG inside the
//     assistant message's content array, similar to Claude's image tool use.
//   * To add a new provider later: implement generate() and add to PROVIDERS.

const INFISTAR_TIMEOUT_MS = 30000;
const INFISTAR_CONNECT_TIMEOUT_MS = 5000;

function err(msg, code = 'PROVIDER_ERROR') {
  const e = new Error(msg);
  e.code = code;
  e.transient = code === 'NETWORK' || code === 'TIMEOUT' || code === 'UNREACHABLE'
    || code.startsWith('HTTP_5') || code === 'HTTP_429';
  return e;
}

// ---- Provider 1: infistar.ai (gpt-image-2.5-flare) ----
//
// Endpoint (Anthropic-compatible):
//   POST {base}/v1/chat/completions
//   Authorization: Bearer $INFISTAR_API_KEY
//   Body: { model, messages: [{ role, content }], max_tokens, stream }
//
// The model name is "gpt-image-2.5-flare" (per the infistar.ai UI screenshot:
// "默认模型 gpt-image-2.5-flare"). Earlier we incorrectly used "gpt-image-2"
// against the /v1/images/generations endpoint — that endpoint doesn't exist
// on infistar.ai, hence every request failed.
//
// Response shape (Anthropic-compatible OpenAI relay):
//   { choices: [{ message: { content: [
//       { type: 'image', source: { type: 'base64', media_type: 'image/png', data: '...' } }
//   ]}}]}
// We unwrap the base64 -> data URL so the frontend <img> renders directly.
async function infistarGenerate({ prompt, word, meaning, example }) {
  const apiKey = process.env.INFISTAR_API_KEY;
  // INFISTAR_BASE_URL may be the bare host (https://infistar.ai) or include
  // the path prefix (https://infistar.ai/v1) per the user's setup UI.
  // We append /chat/completions regardless.
  const baseRaw = process.env.INFISTAR_BASE_URL || 'https://infistar.ai';
  const base = baseRaw.replace(/\/$/, '');
  const url = base.endsWith('/chat/completions')
    ? base
    : `${base}/v1/chat/completions`;
  const model = process.env.INFISTAR_IMAGE_MODEL || 'gpt-image-2.5-flare';

  if (!apiKey) {
    throw err('INFISTAR_API_KEY is not configured', 'NO_KEY');
  }
  const ctrl = new AbortController();
  const overallTimer = setTimeout(() => ctrl.abort('overall-timeout'), INFISTAR_TIMEOUT_MS);
  const connectTimer = setTimeout(() => ctrl.abort('connect-timeout'), INFISTAR_CONNECT_TIMEOUT_MS);

  try {
    let resp;
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
              ],
            },
          ],
        }),
        signal: ctrl.signal,
      });
    } catch (networkErr) {
      // Classify the failure so the UI can give actionable advice.
      //
      //   * AbortError with reason='connect-timeout'  -> our 5s timer fired
      //     (TCP never connected). UNREACHABLE.
      //   * AbortError with reason='overall-timeout'  -> 30s timer fired
      //     mid-stream. Could be slow API or stalled connection.
      //     TIMEOUT (worth retrying).
      //   * ENOTFOUND / EAI_AGAIN / ECONNREFUSED      -> DNS or TCP refusal.
      //     Host is firewalled or doesn't exist. UNREACHABLE.
      //   * Other                                     -> generic NETWORK.
      const code = networkErr?.code || networkErr?.cause?.code;
      const isAbort = networkErr?.name === 'AbortError';
      const reason = isAbort ? (ctrl.signal.reason || 'aborted') : null;

      if (isAbort && reason === 'connect-timeout') {
        throw err(
          `无法连接到 ${base}（${INFISTAR_CONNECT_TIMEOUT_MS / 1000}s 内未连通，可能是网络/防火墙问题）`,
          'UNREACHABLE',
        );
      }
      if (code === 'ENOTFOUND' || code === 'EAI_AGAIN' || code === 'ECONNREFUSED'
          || code === 'ETIMEDOUT' || code === 'ENETUNREACH') {
        throw err(
          `DNS/TCP 失败：${base} 不可达（${code}）。本地 dev 通常因 GFW 拦截 infistar.ai 引起`,
          'UNREACHABLE',
        );
      }
      if (isAbort && reason === 'overall-timeout') {
        throw err(`infistar.ai timed out after ${INFISTAR_TIMEOUT_MS}ms`, 'TIMEOUT');
      }
      throw err(`network error calling infistar.ai: ${networkErr.message || networkErr}`, 'NETWORK');
    }
    clearTimeout(connectTimer);

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw err(`infistar.ai returned ${resp.status}: ${text.slice(0, 300)}`, 'HTTP_' + resp.status);
    }

    let data;
    try {
      data = await resp.json();
    } catch (_) {
      throw err('infistar.ai returned non-JSON response', 'BAD_JSON');
    }

    // Unwrap the base64 image from the assistant message.
    // Expected: data.choices[0].message.content is either a string or an
    // array of content blocks; we look for { type: 'image', source: { type:'base64', data: '...' } }
    // or { type: 'image_url', image_url: { url: 'data:image/png;base64,...' } }.
    const message = data?.choices?.[0]?.message;
    const blocks = Array.isArray(message?.content) ? message.content : null;

    if (blocks) {
      for (const block of blocks) {
        if (!block || typeof block !== 'object') continue;
        // Anthropic-style image block
        if (block.type === 'image' && block.source?.type === 'base64' && block.source.data) {
          const mime = block.source.media_type || 'image/png';
          return {
            imageUrl: `data:${mime};base64,${block.source.data}`,
            source: 'infistar',
            revisedPrompt: null,
          };
        }
        // OpenAI-style image_url block (data URL or http URL)
        if (block.type === 'image_url' && block.image_url?.url) {
          return {
            imageUrl: block.image_url.url,
            source: 'infistar',
            revisedPrompt: null,
          };
        }
      }
    }

    // If content is a string and is a URL
    if (typeof message?.content === 'string' && /^https?:\/\//.test(message.content)) {
      return { imageUrl: message.content.trim(), source: 'infistar', revisedPrompt: null };
    }

    // Last-ditch: some relays return { image: 'data:image/png;base64,...' } at the top level
    if (typeof data?.image === 'string' && data.image.length > 100) {
      return { imageUrl: data.image, source: 'infistar', revisedPrompt: null };
    }

    throw err(
      `infistar.ai returned an unexpected payload shape: ${JSON.stringify(data).slice(0, 300)}`,
      'BAD_SHAPE',
    );
  } finally {
    clearTimeout(overallTimer);
    clearTimeout(connectTimer);
  }
}

const PROVIDERS = {
  infistar: infistarGenerate,
};

export function resolveProvider() {
  const name = process.env.AI_IMAGE_PROVIDER || 'infistar';
  const fn = PROVIDERS[name];
  if (!fn) {
    throw err(`unknown AI_IMAGE_PROVIDER: ${name}`, 'UNKNOWN_PROVIDER');
  }
  return { name, generate: fn };
}

export { infistarGenerate };