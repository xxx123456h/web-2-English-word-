// api/_lib/loadEnvFile.js
// Tiny dotenv loader for local dev. Vercel CLI loads .env.local
// automatically, but plain `npm run dev` (Vite) does NOT inject .env.local
// into process.env for server-side API routes. This helper bridges that
// gap so the user can put secrets in .env.local and have them picked up
// during `npm run dev`.
//
// In production (Vercel), env vars are set via the dashboard and this
// loader is a no-op.

import fs from 'node:fs';
import path from 'node:path';

let loaded = false;

export function loadEnvFile() {
  if (loaded) return;
  loaded = true;

  // Skip in production. Vercel sets env vars via the dashboard.
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL === '1') return;
  if (process.env.NODE_ENV === 'production') return;

  // Walk up to find the project root (where .env.local lives).
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, '.env.local');
    if (fs.existsSync(candidate)) {
      applyEnvFile(candidate);
      return;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
}

function applyEnvFile(filePath) {
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    for (const rawLine of text.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      // Strip optional surrounding quotes
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"'))
       || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      // Never overwrite an already-set env var (shell env wins).
      if (process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  } catch (e) {
    // Silent - missing/unreadable .env.local is expected.
  }
}