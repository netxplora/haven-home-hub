// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    // Works for smaller, unprotected property sites.
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
    // Routes through residential IPs with headless browser rendering.
    // Handles Cloudflare, PerimeterX, and JS-rendered SPAs.
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
    // Maximum bypass for very aggressive protection (rare).
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

    // Initial Data Structure
    let propertyData: any = {
      title: "",
      description: "",
      property_category: "buy", // Default fallback
      property_type: "house", // Default fallback
      price: 0,
      currency: "USD",
      bedrooms: null,
      bathrooms: null,
      size_sqm: null,
      address: "",
      city: "",
      state: "",
      country: "",
      interior_features: [],
      exterior_features: [],
      cover_image_url: "",
      gallery_images: []
    };

    // 1. EXTRACT JSON-LD (Highest Priority)
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || "{}");
        // Handle array of JSON-LD objects
        const objects = Array.isArray(json) ? json : [json];
        
        objects.forEach(obj => {
          if (obj['@type'] === 'RealEstateListing' || obj['@type'] === 'SingleFamilyResidence' || obj['@type'] === 'Product' || obj['@type'] === 'Place') {
            if (obj.name && !propertyData.title) propertyData.title = obj.name;
            if (obj.description && !propertyData.description) propertyData.description = obj.description;
            
            // Extract Price from Offers
            if (obj.offers && obj.offers.price) {
              propertyData.price = parseFloat(obj.offers.price);
              if (obj.offers.priceCurrency) propertyData.currency = obj.offers.priceCurrency;
            }
            
            // Address
            if (obj.address) {
              if (obj.address.streetAddress) propertyData.address = obj.address.streetAddress;
              if (obj.address.addressLocality) propertyData.city = obj.address.addressLocality;
              if (obj.address.addressRegion) propertyData.state = obj.address.addressRegion;
              if (obj.address.addressCountry) propertyData.country = obj.address.addressCountry;
            }

            // Specs
            if (obj.numberOfBedrooms) propertyData.bedrooms = Number(obj.numberOfBedrooms);
            if (obj.numberOfBathroomsTotal) propertyData.bathrooms = Number(obj.numberOfBathroomsTotal);
            if (obj.floorSize && obj.floorSize.value) propertyData.size_sqm = Number(obj.floorSize.value);
            
            // Image
            if (obj.image) {
              if (Array.isArray(obj.image)) {
                propertyData.cover_image_url = obj.image[0];
                propertyData.gallery_images = obj.image;
              } else if (typeof obj.image === 'string') {
                propertyData.cover_image_url = obj.image;
              } else if (obj.image.url) {
                propertyData.cover_image_url = obj.image.url;
              }
            }
          }
        });
      } catch (e) {
        console.error("JSON-LD parsing error", e);
      }
    });

    // 2. EXTRACT OPEN GRAPH & META TAGS (Fallback)
    if (!propertyData.title) propertyData.title = $('meta[property="og:title"]').attr('content') || $('meta[name="title"]').attr('content') || $('title').text() || "";
    if (!propertyData.description) propertyData.description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || "";
    if (!propertyData.cover_image_url) propertyData.cover_image_url = $('meta[property="og:image"]').attr('content') || $('link[rel="image_src"]').attr('href') || "";
    if (propertyData.price === 0) {
      const priceMeta = $('meta[property="product:price:amount"]').attr('content') || $('meta[name="price"]').attr('content') || $('meta[itemprop="price"]').attr('content');
      if (priceMeta) propertyData.price = parseFloat(priceMeta.replace(/[^0-9.]/g, ''));
    }
    if (!propertyData.currency) {
      const currMeta = $('meta[property="product:price:currency"]').attr('content') || $('meta[itemprop="priceCurrency"]').attr('content');
      if (currMeta) propertyData.currency = currMeta;
    }

    // Address Fallbacks
    if (!propertyData.address) propertyData.address = $('meta[property="og:street-address"]').attr('content') || $('meta[name="street-address"]').attr('content') || "";
    if (!propertyData.city) propertyData.city = $('meta[property="og:locality"]').attr('content') || $('meta[name="locality"]').attr('content') || "";
    if (!propertyData.state) propertyData.state = $('meta[property="og:region"]').attr('content') || $('meta[name="region"]').attr('content') || "";
    if (!propertyData.country) propertyData.country = $('meta[property="og:country-name"]').attr('content') || $('meta[name="country-name"]').attr('content') || "";

    // 3. AGGRESSIVE REGEX SCRAPING (Final Fallback for heavily obfuscated SPAs like Zillow/Redfin)
    // Sometimes data is hidden in JSON hydration blocks
    if (!propertyData.title) {
       const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
       if (titleMatch) propertyData.title = titleMatch[1].trim();
    }

    // Address Parsing from Title (if still missing)
    if (!propertyData.address || !propertyData.city) {
      const titleStr = propertyData.title || $('title').text() || "";
      const firstPart = titleStr.split(/\||-/)[0].trim();
      const parts = firstPart.split(',').map((s: string) => s.trim());
      if (parts.length >= 2) {
        if (!propertyData.address) propertyData.address = parts[0];
        if (!propertyData.city) propertyData.city = parts[1];
        if (!propertyData.state && parts.length > 2) {
            propertyData.state = parts[2].split(' ')[0]; // E.g., "CA 90210" -> "CA"
        }
      }
    }
    
    // Attempt to guess bedrooms if missing
    if (!propertyData.bedrooms) {
      // Look for "3 beds", "3 bd", "3 Bedrooms"
      const bedMatch = html.match(/(\d+)\s*(?:beds|bedrooms|bd|bds)\b/i);
      if (bedMatch) propertyData.bedrooms = parseInt(bedMatch[1]);
    }
    
    // Attempt to guess bathrooms if missing
    if (!propertyData.bathrooms) {
      // Look for "2 baths", "2.5 ba", "2 Bathrooms"
      const bathMatch = html.match(/(\d+(?:\.\d+)?)\s*(?:baths|bathrooms|ba)\b/i);
      if (bathMatch) propertyData.bathrooms = parseFloat(bathMatch[1]);
    }

    // Attempt to guess square footage
    if (!propertyData.size_sqm) {
      const sqftMatch = html.match(/(\d+(?:,\d+)?)\s*(?:sqft|sq ft|square feet)\b/i);
      if (sqftMatch) propertyData.size_sqm = parseFloat(sqftMatch[1].replace(/,/g, ''));
    }

    // Attempt to guess price if still 0
    if (propertyData.price === 0) {
      // Look for raw $ amounts. Take the first reasonable looking price (e.g. $450,000)
      const priceMatch = html.match(/\$\s*(\d{1,3}(?:,\d{3})+)/);
      if (priceMatch) {
        propertyData.price = parseFloat(priceMatch[1].replace(/,/g, ''));
      }
    }

    // Features Fallbacks
    if (propertyData.exterior_features.length === 0 || propertyData.interior_features.length === 0) {
        const extractedFeatures: string[] = [];
        $('li').each((_, el) => {
            const text = $(el).text().trim();
            // Filter likely feature strings
            if (text.length > 3 && text.length < 60 && !text.includes('http') && !text.includes('javascript:')) {
                extractedFeatures.push(text);
            }
        });

        const exteriorKeywords = ['pool', 'garage', 'patio', 'deck', 'fence', 'yard', 'garden', 'roof', 'brick', 'acreage', 'lot', 'balcony', 'porch', 'exterior', 'parking', 'carport'];
        const interiorKeywords = ['room', 'floor', 'kitchen', 'bath', 'heating', 'cooling', 'appliances', 'basement', 'carpet', 'wood', 'tile', 'window', 'closet', 'fireplace', 'laundry', 'hvac', 'ac'];
        
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

    // Extract generic images for gallery if empty
    if (propertyData.gallery_images.length === 0) {
      $('img').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        // Filter out small icons/logos, 1x1 pixels, or relative paths
        if (src && src.startsWith('http') && !src.includes('icon') && !src.includes('logo') && !src.includes('avatar')) {
          propertyData.gallery_images.push(src);
        }
      });
      // Try extracting background images or JSON strings with image URLs
      const allUrlsMatch = html.match(/https?:\/\/[^"'\s>]+?\.(?:jpg|jpeg|png|webp)/gi);
      if (allUrlsMatch) {
        propertyData.gallery_images.push(...allUrlsMatch);
      }
      // Unique and limit
      propertyData.gallery_images = [...new Set(propertyData.gallery_images)].slice(0, 15);
    }
    
    // If we got gallery images but no cover, use the first one
    if (!propertyData.cover_image_url && propertyData.gallery_images.length > 0) {
      propertyData.cover_image_url = propertyData.gallery_images[0];
    }

    // Category detection based on URL and Title
    const urlAndTitle = (url + " " + propertyData.title).toLowerCase();
    if (urlAndTitle.includes("rent")) {
      propertyData.property_category = "rent";
    } else if (urlAndTitle.includes("land") || urlAndTitle.includes("lot")) {
      propertyData.property_category = "land";
      propertyData.property_type = "land";
    } else {
      propertyData.property_category = "buy";
    }

    // Basic property type detection
    if (urlAndTitle.includes("apartment") || urlAndTitle.includes("apt")) {
      propertyData.property_type = "apartment";
    } else if (urlAndTitle.includes("condo")) {
      propertyData.property_type = "condo";
    } else if (urlAndTitle.includes("villa")) {
      propertyData.property_type = "villa";
    } else if (urlAndTitle.includes("commercial")) {
      propertyData.property_type = "commercial";
    }

    // AI ENHANCEMENT (Optional)
    // Try to run OpenAI for cleanup only if the key is available, but do not fail if it's missing or quota exceeded
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
              { role: "system", content: "You are a real estate parser. Clean and format the provided JSON object. Return the EXACT SAME SCHEMA. Only fix capitalization, clean up messy descriptions, format the address (extract address, city, state, country if missing from the description or title), and extract a list of string features for both `interior_features` and `exterior_features` separately from the description. If any fields are blank, try to fill them using clues from the title or description." },
              { role: "user", content: JSON.stringify(propertyData) }
            ]
          })
        });

        if (openAiRes.ok) {
          const aiData = await openAiRes.json();
          const enhancedData = JSON.parse(aiData.choices[0].message.content);
          
          // Merge safely (don't override with nulls)
          propertyData.title = enhancedData.title || propertyData.title;
          propertyData.description = enhancedData.description || propertyData.description;
          propertyData.address = enhancedData.address || propertyData.address;
          propertyData.city = enhancedData.city || propertyData.city;
          propertyData.state = enhancedData.state || propertyData.state;
          propertyData.country = enhancedData.country || propertyData.country;
          if (enhancedData.interior_features && enhancedData.interior_features.length > 0) {
            propertyData.interior_features = enhancedData.interior_features;
          }
          if (enhancedData.exterior_features && enhancedData.exterior_features.length > 0) {
            propertyData.exterior_features = enhancedData.exterior_features;
          }
        } else {
          console.log("AI Enhancement skipped: OpenAI returned non-200");
        }
      } catch (aiErr) {
        console.log("AI Enhancement failed, proceeding with standard extraction:", aiErr);
      }
    }

    // Validation: Did we actually extract anything?
    if (!propertyData.title || propertyData.title.trim() === "") {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Extraction Failed: Could not find any property details. The site might be blocking automated access with a Captcha, or the URL format is unsupported. Please enter this property manually." 
      }), {
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data: {
        ...propertyData,
        // Include alternative keys in case frontend mapping expects them
        beds: propertyData.bedrooms,
        baths: propertyData.bathrooms,
        sqft: propertyData.size_sqm
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
