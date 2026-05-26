const fs = require('fs');
const path = require('path');

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
  
  // Replace {t('key', 'Default')} with {'Default'} or just 'Default' if outside JSX
  // Actually, t('key', 'Default text') => 'Default text'
  code = code.replace(/t\(['`"][^'`"]+['`"],\s*['`"]([^'`"]+)['`"]\)/g, '"$1"');
  
  // Remove import { useTranslation } from 'react-i18next';
  code = code.replace(/import\s+\{\s*useTranslation\s*\}\s+from\s+["']react-i18next["'];?\r?\n/g, '');
  
  // Remove const { t } = useTranslation();
  code = code.replace(/const\s+\{\s*t\s*\}\s*=\s*useTranslation\(\);?\r?\n/g, '');
  
  // Remove LanguageToggle imports and usage
  if (file.includes('Header.tsx')) {
    code = code.replace(/import\s+\{\s*LanguageToggle\s*\}\s+from\s+["']@\/components\/site\/LanguageToggle["'];?\r?\n/g, '');
    code = code.replace(/<LanguageToggle\s*\/>/g, '');
  }
  
  fs.writeFileSync(p, code);
  console.log('Processed', file);
});
