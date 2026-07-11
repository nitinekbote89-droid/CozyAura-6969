import { c as createComponent, m as maybeRenderHead, l as renderScript, r as renderTemplate, f as createAstro } from '../../chunks/astro/server_Bt2cXx47.mjs';
import 'piccolore';
import 'clsx';
export { renderers } from '../../renderers.mjs';

const $$Astro = createAstro();
const $$Callback = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Callback;
  const url = new URL(Astro2.request.url);
  url.searchParams.get("code");
  url.searchParams.get("error") || url.searchParams.get("error_description");
  return renderTemplate`<html>${maybeRenderHead()}<body> <div id="status" style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;color:#666;">Completing sign in...</div> ${renderScript($$result, "C:/Users/ekbot/.gemini/antigravity/scratch/lumiere/src/pages/auth/callback.astro?astro&type=script&index=0&lang.ts")} </body></html>`;
}, "C:/Users/ekbot/.gemini/antigravity/scratch/lumiere/src/pages/auth/callback.astro", void 0);

const $$file = "C:/Users/ekbot/.gemini/antigravity/scratch/lumiere/src/pages/auth/callback.astro";
const $$url = "/auth/callback";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Callback,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
