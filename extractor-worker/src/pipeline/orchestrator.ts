import { extractStructuredData } from './structured';
import { extractWithBrowser } from './stealth-browser';
import { runSchemaMapper } from '../utils/schema-mapper';

export async function runExtractionPipeline(
  url: string,
  updateStatus: (status: string) => Promise<void>,
  logMessage: (msg: string) => Promise<void>
) {
  let rawData: any = null;

  // 1. Attempt Structured Data Extraction (Fastest)
  await updateStatus('extracting_structured');
  await logMessage('Attempting structured data extraction (JSON-LD, NEXT_DATA)...');
  
  try {
    rawData = await extractStructuredData(url);
    if (rawData) {
      await logMessage('Successfully extracted structured data');
    }
  } catch (err: any) {
    await logMessage(`Structured extraction failed: ${err.message}`);
  }

  // 2. Fallback to Stealth Browser
  if (!rawData || !rawData.title || !rawData.price) {
    await updateStatus('running_browser');
    await logMessage('Falling back to stealth browser extraction with proxies...');
    
    try {
      rawData = await extractWithBrowser(url, logMessage);
      if (rawData) {
        await logMessage('Successfully extracted via stealth browser');
      }
    } catch (err: any) {
      await logMessage(`Browser extraction failed: ${err.message}`);
      throw new Error('All extraction strategies failed.');
    }
  }

  // 3. Normalize & Map Schema
  await updateStatus('mapping');
  await logMessage('Mapping raw data to platform schema & generating confidence scores...');
  
  const result = runSchemaMapper(rawData);

  return result;
}
