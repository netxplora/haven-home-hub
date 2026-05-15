import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');

let supabaseUrl = '';
let supabaseKey = '';

envContent.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].replace(/"/g, '').trim();
  }
  if (line.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY=')) {
    supabaseKey = line.split('=')[1].replace(/"/g, '').trim();
  }
});

console.log('Supabase URL:', supabaseUrl);

fetch(`${supabaseUrl}/rest/v1/properties?select=*&limit=5`, {
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`
  }
}).then(res => res.json()).then(data => {
  if (data.error) {
    console.error('Error fetching properties:', data);
  } else {
    console.log(`Found ${data.length} properties`);
  }
}).catch(err => {
  console.error('Fetch error:', err);
});
