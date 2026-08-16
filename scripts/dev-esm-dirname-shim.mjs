// Dev-only ESM shim.
//
// The project sets "type": "module", so `tsx server/index.ts` runs the server
// as native ESM. A few server modules (e.g. server/analytics-pdf.ts,
// server/static.ts) reference the CommonJS-only `__dirname` / `__filename`
// globals at module scope. Under ESM these throw
// `ReferenceError: __dirname is not defined in ES module scope`, which crashes
// `npm run dev` on startup. The production build bundles to CommonJS
// (dist/index.cjs) where these globals exist, so this only affects the tsx dev
// path.
//
// Loading this file via NODE_OPTIONS="--import ..." defines the globals so a
// bare `__dirname` reference resolves off the global object instead of
// throwing. The values are only used for font-path / static-path fallbacks, so
// pointing them at the repo root (process.cwd()) is harmless in development.
import path from "node:path";

if (typeof globalThis.__dirname === "undefined") {
  globalThis.__dirname = process.cwd();
}
if (typeof globalThis.__filename === "undefined") {
  globalThis.__filename = path.join(process.cwd(), "index.js");
}
