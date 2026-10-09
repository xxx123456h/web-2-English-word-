// api/_lib/aiImageProvider.js
// AI image generation provider abstraction.
//
// Why this file exists:
//   * We wire up infistar.ai -> gpt-image-2.5-flare. Its /v1/models entry
//     lists supported_endpoint_types: ["image-generation"], i.e. the
//     OpenAI-style POST /v1/images/generations. Calling /v1/chat/completions
//     returns 422 "当前模型不支持本次 API 端点".
//   * To add a new provider later: implement generate() and add to PROVIDERS.

import { relayOrigin, relayUrl, relayKey } from './relayConfig.js';

// Measured: ~29s for a 1024x1024 image, and response headers only arrive
// once the image is done, so there is no separate "connect" timeout (a 5s
// one used to abort every request). DNS/TCP failures still surface
// immediately as fetch errors. 55s stays under the route's maxDuration 60.
const INFISTAR_TIMEOUT_MS = 55000;

function err(msg, code = 'PROVIDER_ERROR') {
  const e = new Error(msg);
  e.code = code;
  e.transient = code === 'NETWORK' || code === 'TIMEOUT' || code === 'UNREACHABLE'
    || code.startsWith('HTTP_5') || code === 'HTTP_429';
  return e;
}

// ---- Provider 1: infistar.ai (gpt-image-2.5-flare) ----
//
// Endpoint (OpenAI images API):
//   POST {base}/v1/images/generations
//   Authorization: Bearer $INFISTAR_API_KEY
//   Body: { model, prompt, n: 1, size: "1024x1024" }
//
// Response: { created, data: [{ b64_json: "iVBORw0K..." }], usage }
//   (b64_json is a PNG, ~2.2MB base64; output_format=jpeg is ignored.)
// Some relays return data[0].url instead; we accept either.
async function infistarGenerate({ prompt, word, meaning, example }) {
  const apiKey = relayKey();
  // INFISTAR_BASE_URL may be the bare host (https://infistar.ai) or include
  // the /v1 prefix (https://infistar.ai/v1). relayConfig normalizes both so
  // we never end up with /v1/v1/images/generations.
  const base = relayOrigin();
  const url = relayUrl('/v1/images/generations');
  const model = process.env.INFISTAR_IMAGE_MODEL || 'gpt-image-2.5-flare';

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
        body: JSON.stringify({ model, prompt, n: 1, size: '1024x1024' }),
        signal: ctrl.signal,
      });
    } catch (networkErr) {
      // Classify the failure so the UI can give actionable advice.
      //
      //   * AbortError (overall-timeout)          -> 55s timer fired. Slow
      //     API or stalled connection. TIMEOUT (worth retrying).
      //   * ENOTFOUND / EAI_AGAIN / ECONNREFUSED  -> DNS or TCP refusal.
      //     Host is firewalled or doesn't exist. UNREACHABLE.
      //   * Other                                 -> generic NETWORK.
      const code = networkErr?.code || networkErr?.cause?.code;
      const isAbort = networkErr?.name === 'AbortError';

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