import * as cheerio from 'cheerio';

export async function extractStructuredData(url: string): Promise<any> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let structuredData: any = {};

    // 1. Check for JSON-LD RealEstateListing / Product / SingleFamilyResidence
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const text = $(el).html() || '';
        const jsonData = JSON.parse(text);
        
        // Handle array of JSON-LD objects
        const objects = Array.isArray(jsonData) ? jsonData : [jsonData];
        
        for (const obj of objects) {
          const type = obj['@type'];
          if (type === 'RealEstateListing' || type === 'SingleFamilyResidence' || type === 'Product' || type === 'Place') {
            
            if (obj.name) structuredData.title = obj.name;
            if (obj.description) structuredData.description = obj.description;
            if (obj.image) {
              if (Array.isArray(obj.image)) {
                structuredData.cover_image_url = obj.image[0];
                structuredData.gallery_images = obj.image;
              } else if (typeof obj.image === 'string') {
                structuredData.cover_image_url = obj.image;
              }
            }

            // Extract price
            if (obj.offers && obj.offers.price) {
              structuredData.price = parseFloat(obj.offers.price);
              if (obj.offers.priceCurrency) structuredData.currency = obj.offers.priceCurrency;
            }

            // Extract address
            if (obj.address) {
              if (obj.address.streetAddress) structuredData.address = obj.address.streetAddress;
              if (obj.address.addressLocality) structuredData.city = obj.address.addressLocality;
              if (obj.address.addressRegion) structuredData.state = obj.address.addressRegion;
              if (obj.address.addressCountry) structuredData.country = obj.address.addressCountry;
            }
            
            // Extract beds/baths if available
            if (obj.numberOfRooms) structuredData.bedrooms = obj.numberOfRooms;
            if (obj.numberOfBathroomsTotal) structuredData.bathrooms = obj.numberOfBathroomsTotal;
          }
        }
      } catch (e) {
        // Skip invalid JSON-LD
      }
    });

    // If we couldn't find basic JSON-LD, throw to trigger fallback
    if (!structuredData.title && !structuredData.price) {
      throw new Error('No structured JSON-LD data found on the page');
    }

    return structuredData;
  } catch (error) {
    // Return null to trigger the stealth browser fallback
    return null;
  }
}
