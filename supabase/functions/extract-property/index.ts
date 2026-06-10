// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Conversion helpers ──────────────────────────────────────────────
const SQFT_TO_SQM = 0.092903;
const ACRE_TO_SQM = 4046.86;

function convertToSqm(value: number, unit: string): number {
  const u = unit.toLowerCase().replace(/[^a-z]/g, "");
  if (["sqft", "sqfeet", "squarefeet", "squarefoot", "sf"].includes(u)) {
    return Math.round(value * SQFT_TO_SQM * 100) / 100;
  }
  if (["acre", "acres", "ac"].includes(u)) {
    return Math.round(value * ACRE_TO_SQM * 100) / 100;
  }
  // Already sqm or unknown unit — return as-is
  return value;
}

function isValidCoordinate(lat: any, lng: any): boolean {
  const la = Number(lat);
  const lo = Number(lng);
  return !isNaN(la) && !isNaN(lo) && la >= -90 && la <= 90 && lo >= -180 && lo <= 180;
}

// ── Image accessibility check ───────────────────────────────────────
async function verifyImageUrl(imageUrl: string, timeoutMs = 5000): Promise<boolean> {
  if (!imageUrl || !imageUrl.startsWith("http")) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(imageUrl, {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HavenHomeHub/1.0)",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return false;
    const ct = res.headers.get("content-type") || "";
    return ct.startsWith("image/");
  } catch {
    return false;
  }
}

// ── Required-field validation ───────────────────────────────────────
const REQUIRED_FIELDS = [
  "property_title",
  "property_description",
  "listing_type",
  "base_price",
  "primary_cover_image_url",
];

function getMissingFields(data: Record<string, any>): string[] {
  return REQUIRED_FIELDS.filter((key) => {
    const v = data[key];
    if (v === null || v === undefined || v === "") return true;
    if (key === "base_price" && (isNaN(Number(v)) || Number(v) <= 0)) return true;
    return false;
  });
}

// ─────────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ success: false, error: "URL is required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Fetching URL:", url);

    const browserHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "max-age=0",
      "Sec-Ch-Ua": '"Chromium";v="125", "Google Chrome";v="125", "Not-A.Brand";v="99"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1"
    };

    const fetchWithTimeout = async (resource: string, options: any = {}) => {
      const { timeout = 15000 } = options;
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      const response = await fetch(resource, {
        ...options,
        signal: controller.signal  
      });
      clearTimeout(id);
      return response;
    };

    const isBotProtectionPage = (html: string): boolean => {
      const signatures = [
        "<title>Just a moment...</title>",
        "Enable JavaScript and cookies to continue",
        "cf-browser-verification",
        "cf-challenge-running",
        "challenge-platform",
        "_cf_chl_opt",
        "<title>Attention Required! | Cloudflare</title>",
        "<title>Pardon Our Interruption</title>",
        "Please verify you are a human",
        '<div id="px-captcha">',
        'id="datadome-captcha"',
        "<title>Access denied</title>"
      ];
      const lower = html.toLowerCase();
      return signatures.some(sig => lower.includes(sig.toLowerCase()));
    };

    let successfulHtml = "";
    let fetchTier = "";
    const scraperApiKey = Deno.env.get("SCRAPER_API_KEY");

    // ── TIER 1: Direct fetch (free, fast) ───────────────────────────
    try {
      console.log("Tier 1: Attempting direct fetch...");
      const directRes = await fetchWithTimeout(url, { headers: browserHeaders, timeout: 8000 });

      if (directRes && directRes.ok) {
        const text = await directRes.text();
        if (!isBotProtectionPage(text) && text.length > 1000) {
          successfulHtml = text;
          fetchTier = "direct";
          console.log("Tier 1 succeeded (direct fetch).");
        } else {
          console.log("Tier 1 returned bot protection page or empty content.");
        }
      } else {
        console.log("Tier 1 failed with status:", directRes?.status);
      }
    } catch (err) {
      console.log("Tier 1 threw exception:", err);
    }

    // ── TIER 2: ScraperAPI with JS rendering ────────────────────────
    if (!successfulHtml && scraperApiKey) {
      try {
        console.log("Tier 2: Attempting ScraperAPI with render=true...");
        const scraperUrl = `https://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(url)}&render=true`;
        const scraperRes = await fetchWithTimeout(scraperUrl, { timeout: 30000 });

        if (scraperRes && scraperRes.ok) {
          const text = await scraperRes.text();
          if (!isBotProtectionPage(text) && text.length > 500) {
            successfulHtml = text;
            fetchTier = "scraperapi-render";
            console.log("Tier 2 succeeded (ScraperAPI + render).");
          } else {
            console.log("Tier 2 returned bot protection page or empty content.");
          }
        } else {
          console.log("Tier 2 failed with status:", scraperRes?.status);
        }
      } catch (err) {
        console.log("Tier 2 threw exception:", err);
      }
    }

    // ── TIER 3: ScraperAPI with premium residential proxies ─────────
    if (!successfulHtml && scraperApiKey) {
      try {
        console.log("Tier 3: Attempting ScraperAPI with premium=true...");
        const premiumUrl = `https://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(url)}&render=true&premium=true&country_code=us`;
        const premiumRes = await fetchWithTimeout(premiumUrl, { timeout: 45000 });

        if (premiumRes && premiumRes.ok) {
          const text = await premiumRes.text();
          if (!isBotProtectionPage(text) && text.length > 500) {
            successfulHtml = text;
            fetchTier = "scraperapi-premium";
            console.log("Tier 3 succeeded (ScraperAPI premium).");
          } else {
            console.log("Tier 3 still returned a blocked page.");
          }
        } else {
          console.log("Tier 3 failed with status:", premiumRes?.status);
        }
      } catch (err) {
        console.log("Tier 3 threw exception:", err);
      }
    }

    // ── All tiers exhausted ─────────────────────────────────────────
    if (!successfulHtml) {
      const missingKey = !scraperApiKey;
      return new Response(JSON.stringify({ 
        success: false, 
        error: missingKey
          ? "Extraction Failed: No Scraper API key is configured. Please add your SCRAPER_API_KEY to the Supabase project secrets (Dashboard → Settings → Edge Functions → Secrets). You can get a free key at scraperapi.com."
          : "Extraction Failed: All fetch strategies were blocked by bot protection. The target site may have very aggressive anti-scraping measures. Please enter this property manually.",
        errorType: missingKey ? "missing_api_key" : "blocked"
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Extraction succeeded via: ${fetchTier}`);

    const html = successfulHtml;
    const $ = cheerio.load(html);

    // ── Refined extraction schema ───────────────────────────────────
    // Keys match the user-defined schema exactly.
    let propertyData: Record<string, any> = {
      property_title: "",
      property_description: "",
      listing_type: "buy",        // buy | rent | land
      property_category: "house", // house | apartment | condo | villa | commercial | land
      base_price: 0,
      currency: "USD",
      full_street_address: "",
      city: "",
      state: "",
      country: "",
      latitude: null,
      longitude: null,
      beds: null,
      baths: null,
      parking: null,
      sqm: null,
      year: null,
      interior_features: [],
      exterior_features: [],
      nearby_points_of_interest: [],
      viewing_times: "",
      primary_cover_image_url: "",
      property_media_gallery: [],
    };

    // ── 1. EXTRACT JSON-LD (Highest Priority) ───────────────────────
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || "{}");
        const objects = Array.isArray(json) ? json : [json];
        
        objects.forEach(obj => {
          const types = ['RealEstateListing', 'SingleFamilyResidence', 'Product', 'Place', 'Apartment', 'House', 'Residence'];
          if (!types.includes(obj['@type'])) return;

          if (obj.name && !propertyData.property_title) propertyData.property_title = obj.name;
          if (obj.description && !propertyData.property_description) propertyData.property_description = obj.description;
          
          // Price from Offers
          if (obj.offers && obj.offers.price) {
            propertyData.base_price = parseFloat(obj.offers.price);
            if (obj.offers.priceCurrency) propertyData.currency = obj.offers.priceCurrency;
          }
          
          // Address
          if (obj.address) {
            if (obj.address.streetAddress) propertyData.full_street_address = obj.address.streetAddress;
            if (obj.address.addressLocality) propertyData.city = obj.address.addressLocality;
            if (obj.address.addressRegion) propertyData.state = obj.address.addressRegion;
            if (obj.address.addressCountry) propertyData.country = obj.address.addressCountry;
          }

          // Coordinates
          if (obj.geo) {
            const lat = obj.geo.latitude ?? obj.geo.lat;
            const lng = obj.geo.longitude ?? obj.geo.lng ?? obj.geo.lon;
            if (isValidCoordinate(lat, lng)) {
              propertyData.latitude = Number(lat);
              propertyData.longitude = Number(lng);
            }
          }

          // Specs
          if (obj.numberOfBedrooms) propertyData.beds = Number(obj.numberOfBedrooms);
          if (obj.numberOfBathroomsTotal) propertyData.baths = Number(obj.numberOfBathroomsTotal);
          if (obj.numberOfRooms && !propertyData.beds) propertyData.beds = Number(obj.numberOfRooms);

          // Floor size with unit conversion
          if (obj.floorSize && obj.floorSize.value) {
            const rawVal = Number(obj.floorSize.value);
            const unit = obj.floorSize.unitText || obj.floorSize.unitCode || "sqm";
            propertyData.sqm = convertToSqm(rawVal, unit);
          }

          // Year built
          if (obj.yearBuilt) propertyData.year = Number(obj.yearBuilt);
          
          // Image
          if (obj.image) {
            if (Array.isArray(obj.image)) {
              propertyData.primary_cover_image_url = typeof obj.image[0] === 'string' ? obj.image[0] : obj.image[0]?.url || "";
              propertyData.property_media_gallery = obj.image.map((img: any) => typeof img === 'string' ? img : img?.url || "").filter(Boolean);
            } else if (typeof obj.image === 'string') {
              propertyData.primary_cover_image_url = obj.image;
            } else if (obj.image.url) {
              propertyData.primary_cover_image_url = obj.image.url;
            }
          }
        });
      } catch (e) {
        console.error("JSON-LD parsing error", e);
      }
    });

    // ── 2. EXTRACT OPEN GRAPH & META TAGS (Fallback) ────────────────
    if (!propertyData.property_title) {
      propertyData.property_title = $('meta[property="og:title"]').attr('content') || $('meta[name="title"]').attr('content') || $('title').text() || "";
    }
    if (!propertyData.property_description) {
      propertyData.property_description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || "";
    }
    if (!propertyData.primary_cover_image_url) {
      propertyData.primary_cover_image_url = $('meta[property="og:image"]').attr('content') || $('link[rel="image_src"]').attr('href') || "";
    }
    if (propertyData.base_price === 0) {
      const priceMeta = $('meta[property="product:price:amount"]').attr('content') || $('meta[name="price"]').attr('content') || $('meta[itemprop="price"]').attr('content');
      if (priceMeta) propertyData.base_price = parseFloat(priceMeta.replace(/[^0-9.]/g, ''));
    }
    if (propertyData.currency === "USD") {
      const currMeta = $('meta[property="product:price:currency"]').attr('content') || $('meta[itemprop="priceCurrency"]').attr('content');
      if (currMeta) propertyData.currency = currMeta;
    }

    // Address Fallbacks
    if (!propertyData.full_street_address) propertyData.full_street_address = $('meta[property="og:street-address"]').attr('content') || $('meta[name="street-address"]').attr('content') || "";
    if (!propertyData.city) propertyData.city = $('meta[property="og:locality"]').attr('content') || $('meta[name="locality"]').attr('content') || "";
    if (!propertyData.state) propertyData.state = $('meta[property="og:region"]').attr('content') || $('meta[name="region"]').attr('content') || "";
    if (!propertyData.country) propertyData.country = $('meta[property="og:country-name"]').attr('content') || $('meta[name="country-name"]').attr('content') || "";

    // Coordinates from meta
    if (!propertyData.latitude) {
      const latMeta = $('meta[property="place:location:latitude"]').attr('content') || $('meta[name="geo.position"]').attr('content')?.split(";")[0];
      const lngMeta = $('meta[property="place:location:longitude"]').attr('content') || $('meta[name="geo.position"]').attr('content')?.split(";")[1];
      if (latMeta && lngMeta && isValidCoordinate(latMeta, lngMeta)) {
        propertyData.latitude = Number(latMeta);
        propertyData.longitude = Number(lngMeta);
      }
    }

    // ── 3. REGEX SCRAPING (Final Fallback) ──────────────────────────
    // Title
    if (!propertyData.property_title) {
       const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
       if (titleMatch) propertyData.property_title = titleMatch[1].trim();
    }

    // Address Parsing from Title (if still missing)
    if (!propertyData.full_street_address || !propertyData.city) {
      const titleStr = propertyData.property_title || $('title').text() || "";
      const firstPart = titleStr.split(/\||-|:/)[0].trim();
      const parts = firstPart.split(',').map((s: string) => s.trim());
      if (parts.length >= 2) {
        if (!propertyData.full_street_address) propertyData.full_street_address = parts[0];
        if (!propertyData.city) propertyData.city = parts[1];
        if (!propertyData.state && parts.length > 2) {
            propertyData.state = parts[2].split(' ')[0];
        }
      }
    }
    
    // Bedrooms
    if (!propertyData.beds) {
      const bedMatch = html.match(/(\d+)\s*(?:beds|bedrooms|bd|bds)\b/i);
      if (bedMatch) propertyData.beds = parseInt(bedMatch[1]);
    }
    
    // Bathrooms
    if (!propertyData.baths) {
      const bathMatch = html.match(/(\d+(?:\.\d+)?)\s*(?:baths|bathrooms|ba)\b/i);
      if (bathMatch) propertyData.baths = parseFloat(bathMatch[1]);
    }

    // Parking
    if (!propertyData.parking) {
      const parkMatch = html.match(/(\d+)\s*(?:car|parking|garage)\s*(?:spaces?|spots?|bays?)?/i);
      if (parkMatch) propertyData.parking = parseInt(parkMatch[1]);
    }

    // Square footage with unit conversion
    if (!propertyData.sqm) {
      const sqftMatch = html.match(/(\d+(?:,\d+)?)\s*(sqft|sq\s*ft|square\s*feet|sf)\b/i);
      if (sqftMatch) {
        const raw = parseFloat(sqftMatch[1].replace(/,/g, ''));
        propertyData.sqm = convertToSqm(raw, "sqft");
      } else {
        // Try acres
        const acreMatch = html.match(/(\d+(?:\.\d+)?)\s*(acres?)\b/i);
        if (acreMatch) {
          const raw = parseFloat(acreMatch[1]);
          propertyData.sqm = convertToSqm(raw, "acre");
        } else {
          // Try sqm directly
          const sqmMatch = html.match(/(\d+(?:,\d+)?)\s*(?:sqm|sq\s*m|m²|square\s*met(?:er|re)s?)\b/i);
          if (sqmMatch) propertyData.sqm = parseFloat(sqmMatch[1].replace(/,/g, ''));
        }
      }
    }

    // Year built
    if (!propertyData.year) {
      const yearMatch = html.match(/(?:built\s*(?:in)?\s*|year\s*built\s*:?\s*)(\d{4})/i);
      if (yearMatch) {
        const y = parseInt(yearMatch[1]);
        if (y >= 1800 && y <= new Date().getFullYear() + 5) {
          propertyData.year = y;
        }
      }
    }

    // Price fallback
    if (propertyData.base_price === 0) {
      const priceMatch = html.match(/\$\s*(\d{1,3}(?:,\d{3})+)/);
      if (priceMatch) {
        propertyData.base_price = parseFloat(priceMatch[1].replace(/,/g, ''));
      }
    }

    // ── 4. FEATURES EXTRACTION ──────────────────────────────────────
    if (propertyData.exterior_features.length === 0 || propertyData.interior_features.length === 0) {
        const extractedFeatures: string[] = [];
        $('li').each((_, el) => {
            const text = $(el).text().trim();
            if (text.length > 3 && text.length < 60 && !text.includes('http') && !text.includes('javascript:')) {
                extractedFeatures.push(text);
            }
        });

        const exteriorKeywords = ['pool', 'garage', 'patio', 'deck', 'fence', 'yard', 'garden', 'roof', 'brick', 'acreage', 'lot', 'balcony', 'porch', 'exterior', 'parking', 'carport', 'driveway', 'landscap'];
        const interiorKeywords = ['room', 'floor', 'kitchen', 'bath', 'heating', 'cooling', 'appliances', 'basement', 'carpet', 'wood', 'tile', 'window', 'closet', 'fireplace', 'laundry', 'hvac', 'ac', 'granite', 'marble', 'stainless'];
        
        extractedFeatures.forEach(f => {
            const lowerF = f.toLowerCase();
            const isExterior = exteriorKeywords.some(kw => lowerF.includes(kw));
            const isInterior = interiorKeywords.some(kw => lowerF.includes(kw));
            
            if (isExterior && propertyData.exterior_features.length < 20) {
                propertyData.exterior_features.push(f);
            } else if (isInterior && propertyData.interior_features.length < 20) {
                propertyData.interior_features.push(f);
            }
        });

        propertyData.exterior_features = [...new Set(propertyData.exterior_features)];
        propertyData.interior_features = [...new Set(propertyData.interior_features)];
    }

    // ── 5. GALLERY IMAGES ───────────────────────────────────────────
    if (propertyData.property_media_gallery.length === 0) {
      $('img').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src && src.startsWith('http') && !src.includes('icon') && !src.includes('logo') && !src.includes('avatar') && !src.includes('favicon')) {
          propertyData.property_media_gallery.push(src);
        }
      });
      // Background images and JSON-embedded image URLs
      const allUrlsMatch = html.match(/https?:\/\/[^"'\s>]+?\.(?:jpg|jpeg|png|webp)/gi);
      if (allUrlsMatch) {
        propertyData.property_media_gallery.push(...allUrlsMatch);
      }
      propertyData.property_media_gallery = [...new Set(propertyData.property_media_gallery)].slice(0, 15);
    }
    
    // Cover image fallback
    if (!propertyData.primary_cover_image_url && propertyData.property_media_gallery.length > 0) {
      propertyData.primary_cover_image_url = propertyData.property_media_gallery[0];
    }

    // ── 6. LISTING TYPE & CATEGORY DETECTION ────────────────────────
    const urlAndTitle = (url + " " + propertyData.property_title).toLowerCase();
    if (urlAndTitle.includes("rent") || urlAndTitle.includes("lease")) {
      propertyData.listing_type = "rent";
    } else if (urlAndTitle.includes("land") || urlAndTitle.includes("lot") || urlAndTitle.includes("acreage")) {
      propertyData.listing_type = "land";
      propertyData.property_category = "land";
    } else {
      propertyData.listing_type = "buy";
    }

    if (urlAndTitle.includes("apartment") || urlAndTitle.includes("apt") || urlAndTitle.includes("flat")) {
      propertyData.property_category = "apartment";
    } else if (urlAndTitle.includes("condo") || urlAndTitle.includes("condominium")) {
      propertyData.property_category = "condo";
    } else if (urlAndTitle.includes("villa")) {
      propertyData.property_category = "villa";
    } else if (urlAndTitle.includes("commercial") || urlAndTitle.includes("office") || urlAndTitle.includes("retail")) {
      propertyData.property_category = "commercial";
    } else if (urlAndTitle.includes("penthouse")) {
      propertyData.property_category = "penthouse";
    }

    // ── 7. IMAGE ACCESSIBILITY VALIDATION ───────────────────────────
    // Verify cover image is accessible
    console.log("Validating image accessibility...");
    if (propertyData.primary_cover_image_url) {
      const coverValid = await verifyImageUrl(propertyData.primary_cover_image_url);
      if (!coverValid) {
        console.log("Cover image failed accessibility check:", propertyData.primary_cover_image_url);
        propertyData.primary_cover_image_url = "";
      }
    }

    // Validate gallery images (check up to 15 in parallel)
    if (propertyData.property_media_gallery.length > 0) {
      const validationResults = await Promise.allSettled(
        propertyData.property_media_gallery.slice(0, 15).map((imgUrl: string) => verifyImageUrl(imgUrl))
      );
      propertyData.property_media_gallery = propertyData.property_media_gallery.filter(
        (_: string, i: number) => i < validationResults.length && validationResults[i].status === "fulfilled" && (validationResults[i] as PromiseFulfilledResult<boolean>).value === true
      );
    }

    // If cover was cleared but gallery has valid images, use the first
    if (!propertyData.primary_cover_image_url && propertyData.property_media_gallery.length > 0) {
      propertyData.primary_cover_image_url = propertyData.property_media_gallery[0];
    }

    // ── 8. AI ENHANCEMENT (Optional) ────────────────────────────────
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (openAiKey) {
      try {
        console.log("Attempting optional AI enhancement...");
        const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openAiKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
              { 
                role: "system", 
                content: `You are a real estate data parser. Clean and format the provided property JSON.
Return the EXACT SAME schema keys. Only:
1. Fix capitalization in the title and description.
2. Clean up messy descriptions (remove HTML artifacts, excessive whitespace).
3. Extract address components (full_street_address, city, state, country) if missing — use clues from the title or description.
4. Extract interior_features and exterior_features as arrays of short strings from the description.
5. Extract nearby_points_of_interest as an array of objects with "name" and "distance" keys if mentioned.
6. Extract viewing_times if any open-house or inspection schedule is mentioned.
7. If beds, baths, parking, sqm, or year are null, try to fill them using the description.
Do NOT change listing_type, property_category, base_price, or currency unless they are clearly wrong.
Do NOT invent data. Return only fields you can extract from the provided input.` 
              },
              { role: "user", content: JSON.stringify(propertyData) }
            ]
          })
        });

        if (openAiRes.ok) {
          const aiData = await openAiRes.json();
          const enhancedData = JSON.parse(aiData.choices[0].message.content);
          
          // Merge safely — never override with nulls or empty
          if (enhancedData.property_title) propertyData.property_title = enhancedData.property_title;
          if (enhancedData.property_description) propertyData.property_description = enhancedData.property_description;
          if (enhancedData.full_street_address) propertyData.full_street_address = enhancedData.full_street_address;
          if (enhancedData.city) propertyData.city = enhancedData.city;
          if (enhancedData.state) propertyData.state = enhancedData.state;
          if (enhancedData.country) propertyData.country = enhancedData.country;
          if (enhancedData.beds && !propertyData.beds) propertyData.beds = Number(enhancedData.beds);
          if (enhancedData.baths && !propertyData.baths) propertyData.baths = Number(enhancedData.baths);
          if (enhancedData.parking && !propertyData.parking) propertyData.parking = Number(enhancedData.parking);
          if (enhancedData.sqm && !propertyData.sqm) propertyData.sqm = Number(enhancedData.sqm);
          if (enhancedData.year && !propertyData.year) propertyData.year = Number(enhancedData.year);
          if (enhancedData.viewing_times && !propertyData.viewing_times) propertyData.viewing_times = enhancedData.viewing_times;
          if (Array.isArray(enhancedData.interior_features) && enhancedData.interior_features.length > 0) {
            propertyData.interior_features = enhancedData.interior_features;
          }
          if (Array.isArray(enhancedData.exterior_features) && enhancedData.exterior_features.length > 0) {
            propertyData.exterior_features = enhancedData.exterior_features;
          }
          if (Array.isArray(enhancedData.nearby_points_of_interest) && enhancedData.nearby_points_of_interest.length > 0) {
            propertyData.nearby_points_of_interest = enhancedData.nearby_points_of_interest;
          }
          // Validate coordinates from AI
          if (enhancedData.latitude && enhancedData.longitude && !propertyData.latitude) {
            if (isValidCoordinate(enhancedData.latitude, enhancedData.longitude)) {
              propertyData.latitude = Number(enhancedData.latitude);
              propertyData.longitude = Number(enhancedData.longitude);
            }
          }
        } else {
          console.log("AI Enhancement skipped: OpenAI returned non-200");
        }
      } catch (aiErr) {
        console.log("AI Enhancement failed, proceeding with standard extraction:", aiErr);
      }
    }

    // ── 9. FINAL COORDINATE VALIDATION ──────────────────────────────
    if (propertyData.latitude !== null && propertyData.longitude !== null) {
      if (!isValidCoordinate(propertyData.latitude, propertyData.longitude)) {
        propertyData.latitude = null;
        propertyData.longitude = null;
      }
    }

    // ── 10. REQUIRED FIELD VALIDATION ───────────────────────────────
    if (!propertyData.property_title || propertyData.property_title.trim() === "") {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Extraction Failed: Could not extract a property title. The URL may be invalid, or the site is blocking automated access (e.g. Captcha). Please manually input the details." 
      }), {
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if it looks like a real property (requires at least 2 of: price, address, beds, baths)
    let validFeaturesCount = 0;
    if (propertyData.base_price > 0) validFeaturesCount++;
    if (propertyData.full_street_address || propertyData.city) validFeaturesCount++;
    if (propertyData.beds !== null || propertyData.baths !== null) validFeaturesCount++;
    if (propertyData.property_media_gallery.length > 0) validFeaturesCount++;

    if (validFeaturesCount < 2) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Extraction Failed: The provided URL does not appear to be a standard real estate listing. Missing critical pricing, location, or property specifications. Please enter this listing manually.` 
      }), {
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const missingFields = getMissingFields(propertyData);
    const isIncomplete = missingFields.length > 0;

    return new Response(JSON.stringify({ 
      success: true, 
      data: propertyData,
      validation: {
        status: isIncomplete ? "incomplete_import" : "complete",
        missing_fields: missingFields,
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Extraction error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
