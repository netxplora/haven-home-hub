import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.css')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Replace CSS variables
    content = content.replace(/var\(--gold\)/g, 'var(--primary)');
    content = content.replace(/var\(--gold-foreground\)/g, 'var(--primary-foreground)');
    content = content.replace(/var\(--gold-soft\)/g, 'var(--primary-glow)'); // or another light primary
    
    // Replace tailwind custom classes
    content = content.replace(/bg-gradient-gold/g, 'bg-primary text-primary-foreground'); // Replace the gold gradient class
    
    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log('Updated:', filePath);
    }
  }
});
