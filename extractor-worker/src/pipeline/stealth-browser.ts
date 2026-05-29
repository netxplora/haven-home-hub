import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';

// Register the stealth plugin
chromium.use(stealthPlugin());

export async function extractWithBrowser(url: string, logMessage: (msg: string) => Promise<void>): Promise<any> {
  let browser = null;
  try {
    await logMessage('Launching stealth browser...');
    
    // In production, this should connect to a residential proxy
    // const proxy = { server: process.env.PROXY_URL, username: process.env.PROXY_USER, password: process.env.PROXY_PASS };
    
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();
    
    await logMessage(`Navigating to ${url}...`);
    // Wait until network is mostly idle to ensure hydration completes
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Optional: wait for specific container or bypass simple captchas here
    // await page.waitForTimeout(2000);

    const html = await page.content();
    const $ = cheerio.load(html);

    let data: any = {};
    
    // Basic DOM Fallback Extraction
    data.title = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
    data.description = $('meta[property="og:description"]').attr('content') || '';
    data.cover_image_url = $('meta[property="og:image"]').attr('content') || '';
    
    const priceStr = $('meta[property="product:price:amount"]').attr('content');
    if (priceStr) {
      data.price = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
    } else {
      // Look for a raw price in the text
      const priceMatch = html.match(/\$\s*(\d{1,3}(?:,\d{3})+)/);
      if (priceMatch) {
        data.price = parseFloat(priceMatch[1].replace(/,/g, ''));
      }
    }

    data.address = $('meta[property="og:street-address"]').attr('content') || '';
    data.city = $('meta[property="og:locality"]').attr('content') || '';
    data.state = $('meta[property="og:region"]').attr('content') || '';

    // If still missing essential data, the stealth browser at least bypassed the block,
    // and we can try to extract JSON-LD again from the rendered HTML.
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const text = $(el).html() || '';
        const jsonData = JSON.parse(text);
        const objects = Array.isArray(jsonData) ? jsonData : [jsonData];
        for (const obj of objects) {
          if (obj['@type'] === 'RealEstateListing' || obj['@type'] === 'SingleFamilyResidence') {
            if (obj.name && !data.title) data.title = obj.name;
            if (obj.offers && obj.offers.price && !data.price) data.price = parseFloat(obj.offers.price);
          }
        }
      } catch(e) {}
    });

    if (!data.title && !data.price) {
      throw new Error("Stealth browser accessed the page but could not find recognizable property data.");
    }

    return data;
  } catch (error: any) {
    throw new Error(`Browser Extraction Failed: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
