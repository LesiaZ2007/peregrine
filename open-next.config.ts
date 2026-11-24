// Cloudflare Workers build config (used only by `npm run cf:build`).
// Vercel ignores this file; `next build` is unchanged.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

export default defineCloudflareConfig({
  // Prerendered pages are served from the static assets. No R2/KV needed,
  // so this stays on the free Workers plan.
  incrementalCache: staticAssetsIncrementalCache,
});
