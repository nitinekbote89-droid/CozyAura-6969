import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envRaw = readFileSync(resolve('c:/Users/ekbot/.gemini/antigravity/scratch/lumiere/.env'), 'utf8');
const env = {};
envRaw.split('\n').forEach(line => {
  const m = line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = env[m[1]] || m[2].replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Query the max order ID
const { data: maxOrder, error: err } = await supabase
  .from('orders')
  .select('id');

if (err) {
  console.error('Error fetching orders:', err);
  process.exit(1);
}

let maxIdNum = 0;
maxOrder.forEach(o => {
  const num = parseInt(o.id.replace('#', ''), 10);
  if (!isNaN(num) && num > maxIdNum) {
    maxIdNum = num;
  }
});

console.log('Max Order ID found in DB:', maxIdNum);

// We need to setval('order_id_seq', maxIdNum)
// We can run this by executing a query. Since we don't have a raw sql execution RPC,
// let's see if we can create a temporary function or if there is an existing RPC.
// Wait, can we create an RPC function via PostgreSQL or just call setval?
// Supabase postgrest doesn't allow calling setval directly, but we can check if we can run raw SQL.
// Wait, how do we run raw SQL? We can run a migrations patch or SQL command if we can.
// But we don't have direct access to psql here.
// Wait, is there a way to call a pg function?
// Let's check what SQL files were run. They were applied to the Supabase database.
// Can we write a script to execute SQL?
// No, the supabase javascript client doesn't expose a raw sql query executor unless there's an RPC.
// Wait! Let's check the schema of `supabase-migration.sql` or other patches to see if there is an RPC we can use to run arbitrary sql.
