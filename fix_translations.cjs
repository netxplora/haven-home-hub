const fs = require('fs');
const path = require('path');

const translationRaw = fs.readFileSync(path.resolve(__dirname, 'src/locales/en/translation.json'), 'utf8');
const translations = JSON.parse(translationRaw);

// Flatten object
function flattenObj(obj, parent = '', res = {}) {
  for(let key in obj) {
    let propName = parent ? parent + '.' + key : key;
    if(typeof obj[key] == 'object') {
      flattenObj(obj[key], propName, res);
    } else {
      res[propName] = obj[key];
    }
  }
  return res;
}

const flatT = flattenObj(translations);

const files = [
  'src/components/site/Header.tsx',
  'src/components/site/Footer.tsx',
  'src/pages/marketplace/Home.tsx',
  'src/pages/marketplace/PropertyDetail.tsx',
  'src/components/site/PropertyCard.tsx',
  'src/components/site/SearchBar.tsx'
];

files.forEach(file => {
  const p = path.resolve(__dirname, file);
  if(!fs.existsSync(p)) return;
  let code = fs.readFileSync(p, 'utf8');
  
  // Replace useTranslation imports and hook usages
  code = code.replace(/import\s+\{\s*useTranslation\s*\}\s+from\s+["']react-i18next["'];?\r?\n/g, '');
  code = code.replace(/const\s+\{\s*t\s*\}\s*=\s*useTranslation\(\);?\r?\n/g, '');
  
  // Header LanguageToggle removal
  if (file.includes('Header.tsx')) {
    code = code.replace(/import\s+\{\s*LanguageToggle\s*\}\s+from\s+["']@\/components\/site\/LanguageToggle["'];?\r?\n/g, '');
    code = code.replace(/<LanguageToggle\s*\/>/g, '');
  }

  // Replace t('key') and t('key', 'fallback')
  // We use a regex that handles both: t("key") and t("key", "fallback") and t("key", { param: val })
  const regex = /\bt\(\s*['"]([a-zA-Z0-9_.-]+)['"](?:,\s*([^)]+))?\s*\)/g;
  
  code = code.replace(regex, (match, key, args) => {
    let text = flatT[key];
    if (!text) {
      console.warn('MISSING KEY:', key);
      return '"' + key.split('.').pop() + '"';
    }
    
    // Replace {{param}} with JS interpolation if args exist
    if (args && args.trim().startsWith('{')) {
      // It's a param object like { title: property.title }
      // This is a naive replacement but works for our simple cases:
      text = text.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, '$$$1');
      // Return template literal: `text`
      return '`' + text.replace(/`/g, '\\`') + '`';
    } else {
      // Normal string
      return '"' + text.replace(/"/g, '\\"') + '"';
    }
  });

  fs.writeFileSync(p, code);
  console.log('Processed', file);
});
