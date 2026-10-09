// api/_lib/aiImageProvider.js
// AI image generation provider abstraction.
//
// Why this file exists:
//   * We wire up infistar.ai -> gemini-3.1-flash-lite-image (default).
//     Measured ~6-9s per image, ~80-600KB JPEG. gpt-image-2.5-flare took ~29s.
//   * Endpoint depends on the model's /v1/models supported_endpoint_types:
//       gemini-*-image  -> ["openai"]           -> POST /v1/chat/completions
//       gpt-image-*     -> ["image-generation"] -> POST /v1/images/generations
//     Calling the wrong one returns 422 "当前模型不支持本次 API 端点".
//   * To add a new provider later: implement generate() and add to PROVIDERS.

import { relayOrigin, relayUrl, relayKey } from './relayConfig.js';

// Response headers only arrive once the image is done, so there is no
// separate "connect" timeout (a 5s one used to abort every request).
// DNS/TCP failures still surface immediately as fetch errors. 25s is ~3x
// the measured gemini latency; set INFISTAR_IMAGE_TIMEOUT_MS higher (max
// ~55000, route maxDuration is 60s) if you switch back to gpt-image-*.
const INFISTAR_TIMEOUT_MS = parseInt(process.env.INFISTAR_IMAGE_TIMEOUT_MS || '25000', 10);

// gemini image models only speak the chat endpoint.
const usesChatEndpoint = (model) => /^gemini-/i.test(model);

function err(msg, code = 'PROVIDER_ERROR') {
  const e = new Error(msg);
  e.code = code;
  e.transient = code === 'NETWORK' || code === 'TIMEOUT' || code === 'UNREACHABLE'
    || code.startsWith('HTTP_5') || code === 'HTTP_429';
  return e;
}

// ---- Provider 1: infistar.ai ----
//
// Chat endpoint (gemini-*-image):
//   POST {base}/v1/chat/completions
//   Body: { model, messages: [{ role: "user", content: "Generate an image: ..." }] }
//   Response: choices[0].message.content = "![image](data:image/jpeg;base64,...)"
//
// Images endpoint (gpt-image-*):
//   POST {base}/v1/images/generations
//   Body: { model, prompt, n: 1, size: "1024x1024" }
//   Response: { data: [{ b64_json: "iVBORw0K..." }] } (PNG, ~2.2MB base64).
//   Some relays return data[0].url instead; we accept either.
async function infistarGenerate({ prompt, word, meaning, example }) {
  const apiKey = relayKey();
  // INFISTAR_BASE_URL may be the bare host (https://infistar.ai) or include
  // the /v1 prefix (https://infistar.ai/v1). relayConfig normalizes both so
  // we never end up with /v1/v1/images/generations.
  const base = relayOrigin();
  const model = process.env.INFISTAR_IMAGE_MODEL || 'gemini-3.1-flash-lite-image';
  const chat = usesChatEndpoint(model);
  const url = relayUrl(chat ? '/v1/chat/completions' : '/v1/images/generations');
  const reqBody = chat
    ? { model, messages: [{ role: 'user', content: `Generate an image: ${prompt}` }] }
    : { model, prompt, n: 1, size: '1024x1024' };

  if (!apiKey) {
    throw err('INFISTAR_API_KEY is not configured', 'NO_KEY');
  }
  const ctrl = new AbortController();
  const overallTimer = setTimeout(() => ctrl.abort('overall-timeout'), INFISTAR_TIMEOUT_MS);

  try {
    let resp;
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(reqBody),
        signal: ctrl.signal,
      });
    } catch (networkErr) {
      // Classify the failure so the UI can give actionable advice.
      //
      //   * AbortError (overall-timeout)          -> overall timer fired. Slow
      //     API or stalled connection. TIMEOUT (worth retrying).
      //   * ENOTFOUND / EAI_AGAIN / ECONNREFUSED  -> DNS or TCP refusal.
      //     Host is firewalled or doesn't exist. UNREACHABLE.
      //   * Other                                 -> generic NETWORK.
      const code = networkErr?.code || networkErr?.cause?.code;
      // abort(reason) rejects with the reason string itself, not an AbortError,
      // so check the signal rather than the error's name.
      const isAbort = ctrl.signal.aborted || networkErr?.name === 'AbortError';

      if (code === 'ENOTFOUND' || code === 'EAI_AGAIN' || code === 'ECONNREFUSED'
          || code === 'ETIMEDOUT' || code === 'ENETUNREACH') {
        throw err(
          `DNS/TCP 失败：${base} 不可达（${code}）。本地 dev 通常因 GFW 拦截 infistar.ai 引起`,
          'UNREACHABLE',
        );
      }
      if (isAbort) {
        throw err(`infistar.ai timed out after ${INFISTAR_TIMEOUT_MS}ms`, 'TIMEOUT');
      }
      throw err(`network error calling infistar.ai: ${networkErr.message || networkErr}`, 'NETWORK');
    }

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

    if (chat) {
      // The image comes back inline in the message text, as markdown or a
      // bare data URL. Grab the first data:image/... or http(s) image URL.
      const content = data?.choices?.[0]?.message?.content;
      const text = typeof content === 'string' ? content
        : Array.isArray(content) ? content.map((c) => c?.text || c?.image_url?.url || '').join(' ') : '';
      const m = text.match(/data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+/)
        || text.match(/https?:\/\/[^\s)"']+/);
      if (m) return { imageUrl: m[0], source: 'infistar', revisedPrompt: null };
      throw err(
        `infistar.ai chat reply had no image: ${JSON.stringify(data).slice(0, 300)}`,
        'BAD_SHAPE',
      );
    }

    const item = data?.data?.[0];
    if (typeof item?.b64_json === 'string' && item.b64_json.length > 100) {
      // Base64 prefixes: PNG -> "iVBOR", JPEG -> "/9j/", WebP -> "UklGR".
      const mime = item.b64_json.startsWith('/9j/') ? 'image/jpeg'
        : item.b64_json.startsWith('UklGR') ? 'image/webp' : 'image/png';
      return {
        imageUrl: `data:${mime};base64,${item.b64_json}`,
        source: 'infistar',
        revisedPrompt: item.revised_prompt || null,
      };
    }
    if (typeof item?.url === 'string' && /^(https?:|data:image\/)/.test(item.url)) {
      return { imageUrl: item.url, source: 'infistar', revisedPrompt: item.revised_prompt || null };
    }

    throw err(
      `infistar.ai returned an unexpected payload shape: ${JSON.stringify(data).slice(0, 300)}`,
      'BAD_SHAPE',
    );
  } finally {
    clearTimeout(overallTimer);
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