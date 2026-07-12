import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import cloudflare from "@astrojs/cloudflare";

const adapter = process.env.CF_PAGES === '1' || process.env.CLOUDFLARE === 'true'
  ? cloudflare()
  : netlify();

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