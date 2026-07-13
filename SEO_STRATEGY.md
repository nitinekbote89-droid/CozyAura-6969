# Cozy Aura — SEO Strategy & Configuration Plan

This document outlines the SEO optimizations configured for Cozy Aura to ensure top performance, indexability, and ranking.

---

## 📋 The SEO Checklist

| Optimization | Status | Purpose |
| :--- | :--- | :--- |
| **Sitemap Generation** | ✅ **Active** | Automatically builds `sitemap-index.xml` on every deployment. |
| **Robots.txt** | ✅ **Active** | Directs search bots to the index and sitemap. |
| **Server-Side Rendering (SSR)** | ✅ **Active** | Delivers fully-rendered HTML to crawlers instantly. |
| **Page Caching (TTFB)** | ✅ **Active** | Stale-while-revalidate caching delivers sub-second page loads. |
| **Admin Prerendering** | ✅ **Active** | Converted `admin.astro` into static HTML for zero-compute edge delivery. |

---

## 🛠️ Code Configuration Details

### 1. Sitemap (`astro.config.mjs`)
* Configured using `@astrojs/sitemap`.
* Integrates into the Astro build pipeline to scan dynamic and static pages.
* Currently targeting the temporary deployment domain: `https://cozyaura-6969.nitinekbote89.workers.dev`.

### 2. Robots Panel (`public/robots.txt`)
* Allows all compliant search bots (`User-agent: *`).
* References the dynamic sitemap endpoint:
  ```txt
  Sitemap: https://cozyaura-6969.nitinekbote89.workers.dev/sitemap.xml
  ```

---

## 🚀 Transitioning to a Custom Domain (When Purchased)

Once you purchase your domain (e.g., `cozyaura.in` or `cozyaura.com`), perform these two simple code changes to redirect all SEO indexation:

### Step 1: Update `astro.config.mjs`
Change the `site` property to your new custom domain:
```javascript
export default defineConfig({
  site: 'https://cozyaura.in', // <-- Update this line
  output: 'server',
  adapter: cloudflare(),
  integrations: [sitemap()],
  ...
});
```

### Step 2: Update `public/robots.txt`
Update the `Sitemap` path to point to your new custom domain:
```txt
User-agent: *
Allow: /
Sitemap: https://cozyaura.in/sitemap.xml  # <-- Update this line
```
