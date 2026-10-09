import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Minimal config for @opennextjs/cloudflare (see https://opennext.js.org/cloudflare).
// All app state lives client-side and in Supabase / the FastAPI backend,
// so the default dummy caches are fine here.
export default defineCloudflareConfig();
