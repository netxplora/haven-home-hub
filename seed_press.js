import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import dotenv from "dotenv";

dotenv.config({ path: resolve(process.cwd(), ".env") });
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("No supabase credentials found in env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const releases = [
  {
    date: "April 2026",
    title: `Haven Home Hub launches fractional property investment platform`,
    summary: "Investors can now co-own income-generating properties with transparent unit pricing and scheduled distributions. The platform supports both traditional bank transfers and digital currency deposits.",
  },
  {
    date: "March 2026",
    title: `Haven Home Hub expands operations to three new cities`,
    summary: "The agency now covers Austin, Miami, and Ibadan, with dedicated full-time agents embedded in each region to provide localized market expertise.",
  },
  {
    date: "February 2026",
    title: `Haven Home Hub surpasses $50M in total assets under management`,
    summary: "The fractional investment arm reaches a major milestone, with over 2,000 active investors participating in commercial and residential property portfolios.",
  },
  {
    date: "January 2026",
    title: `Haven Home Hub closes 2025 with 400+ verified property listings`,
    summary: "Year-end results confirm continued growth in curated property inventory and agent network, with a 65% increase in transaction volume over the previous year.",
  },
  {
    date: "October 2025",
    title: `Haven Home Hub introduces digital currency payments for property investments`,
    summary: "Buyers and investors can now pay with Bitcoin, Ethereum, and USDT alongside traditional banking methods, broadening access for international investors.",
  },
  {
    date: "July 2025",
    title: `Haven Home Hub partners with leading valuation firm for property verification`,
    summary: "All listed properties now include independent valuation data to improve buyer confidence and ensure pricing accuracy across all markets.",
  },
];

async function seed() {
  console.log("Starting migration of Press Releases to Blog Posts...");

  // Get or create 'Press Release' category
  let { data: cat } = await supabase.from("blog_categories").select("id").eq("name", "Press Release").single();
  let categoryId = cat?.id;

  if (!categoryId) {
    const { data: newCat, error: catErr } = await supabase.from("blog_categories").insert({ name: "Press Release", slug: "press-release" }).select("id").single();
    if (catErr) {
      console.error("Error creating category:", catErr);
      return;
    }
    categoryId = newCat.id;
  }

  // Insert posts
  for (const release of releases) {
    const [month, year] = release.date.split(" ");
    const monthIndex = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].indexOf(month) + 1;
    const publishedAt = `${year}-${monthIndex.toString().padStart(2, '0')}-01T00:00:00Z`;

    const slug = release.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const { error } = await supabase.from("blog_posts").upsert({
      title: release.title,
      slug: slug,
      excerpt: release.summary,
      content: `<p>${release.summary}</p>`,
      status: "published",
      published_at: publishedAt,
      category_id: categoryId,
    }, { onConflict: 'slug' });

    if (error) {
      console.error(`Error inserting "${release.title}":`, error);
    } else {
      console.log(`Successfully migrated: "${release.title}"`);
    }
  }
  console.log("Migration complete.");
}

seed();
