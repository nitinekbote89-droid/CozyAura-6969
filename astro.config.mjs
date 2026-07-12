import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import cloudflare from "@astrojs/cloudflare";

const adapter = process.env.NETLIFY === 'true'
  ? netlify()
  : cloudflare();

export default defineConfig({
  output: 'server',
  prefetch: false,
  adapter: adapter,
  vite: {
    build: {
      modulePreload: {
        polyfill: false
      }
    }
  }
});