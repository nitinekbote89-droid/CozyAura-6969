import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envRaw = readFileSync(resolve(__dirname, '../.env'), 'utf8');
const env = {};
envRaw.split('\n').forEach(line => {
  const m = line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
});
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function upgradeQuality(url) {
  if (!url || !url.includes('/image/upload/')) return url;
  return url.replace(/,q_auto(?![:\w])/, ',q_auto:eco');
}

async function migrate() {
  // Storefront images
  const { data: sfData } = await supabase.from('settings').select('*').eq('key', 'STOREFRONT_IMAGES').single();
  if (sfData?.value) {
    const images = sfData.value;
    let changed = 0;
    Object.keys(images).forEach(k => {
      const before = images[k];
      if (before && typeof before === 'string') {
        images[k] = upgradeQuality(before);
        if (images[k] !== before) { changed++; console.log(`  sf ${k}: q_auto → q_auto:eco`); }
      }
    });
    if (changed) { await supabase.from('settings').upsert({ key: 'STOREFRONT_IMAGES', value: images }); console.log(`✅ ${changed} storefront images`); }
  }

  // Products
  const { data: products } = await supabase.from('products').select('*');
  for (const p of products || []) {
    if (p.cover_image) {
      const after = upgradeQuality(p.cover_image);
      if (after !== p.cover_image) {
        await supabase.from('products').update({ cover_image: after }).eq('id', p.id);
        console.log(`  Product ${p.id}: q_auto → q_auto:eco`);
      }
    }
  }

  // Variants
  const { data: variants } = await supabase.from('product_variants').select('*');
  let vChanged = 0;
  for (const v of variants || []) {
    if (v.image_url) {
      const after = upgradeQuality(v.image_url);
      if (after !== v.image_url) {
        await supabase.from('product_variants').update({ image_url: after }).eq('id', v.id);
        vChanged++;
      }
    }
  }
  if (vChanged) console.log(`✅ ${vChanged} variant images`);
}

await migrate();
console.log('Done.');
