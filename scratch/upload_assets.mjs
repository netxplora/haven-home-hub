import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mime from 'mime-types'; // Note: Node might not have this natively, but we can do a simple map.

// Load env vars manually
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = 'public-assets';

const filesToUpload = [
  'hero-video.mp4',
  'hero_all_properties.png',
  'hero_buy_properties.png',
  'hero_land_listings.png',
  'hero_luxury_penthouse.png',
  'hero_luxury_penthouse.webp',
  'hero_modern_villa.png',
  'hero_modern_villa.webp',
  'hero_rent_properties.png'
];

async function main() {
  console.log(`Checking if bucket '${BUCKET_NAME}' exists...`);
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  
  if (bucketsError) {
    console.error('Error listing buckets:', bucketsError.message);
    process.exit(1);
  }

  const bucketExists = buckets.some(b => b.name === BUCKET_NAME);
  
  if (!bucketExists) {
    console.log(`Creating public bucket '${BUCKET_NAME}'...`);
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 52428800, // 50MB
    });
    
    if (createError) {
      console.error('Error creating bucket:', createError.message);
      process.exit(1);
    }
    console.log(`Bucket '${BUCKET_NAME}' created successfully.`);
  } else {
    console.log(`Bucket '${BUCKET_NAME}' already exists.`);
  }

  const publicDir = path.join(process.cwd(), 'public');
  const urlMapping = {};

  for (const filename of filesToUpload) {
    const filePath = path.join(publicDir, filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`File ${filename} not found in public directory. Skipping.`);
      continue;
    }

    const fileBuffer = fs.readFileSync(filePath);
    
    // Basic mime type detection
    let contentType = 'application/octet-stream';
    if (filename.endsWith('.mp4')) contentType = 'video/mp4';
    if (filename.endsWith('.png')) contentType = 'image/png';
    if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) contentType = 'image/jpeg';
    if (filename.endsWith('.webp')) contentType = 'image/webp';

    console.log(`Uploading ${filename}...`);
    
    // Node.js fetch needs an ArrayBuffer, Blob, or TypedArray
    const arrayBuffer = new Uint8Array(fileBuffer).buffer;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, arrayBuffer, {
        contentType,
        upsert: true
      });

    if (error) {
      console.error(`Error uploading ${filename}:`, error.message);
    } else {
      const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filename);
      urlMapping[filename] = publicUrlData.publicUrl;
      console.log(`Successfully uploaded. Public URL: ${publicUrlData.publicUrl}`);
    }
  }

  console.log('\n--- UPLOAD COMPLETE ---');
  console.log('Update your frontend code with these URLs:');
  console.log(JSON.stringify(urlMapping, null, 2));
}

main();
