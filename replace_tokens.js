const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'styles', 'components');

const replacements = {
  'var(--color-glow-400)': 'var(--color-primary)',
  'var(--color-glow-500)': 'var(--color-primary)',
  'var(--color-glow-600)': 'var(--color-primary-hover)',
  'var(--color-glow-700)': 'var(--color-deep-aubergine)',
  'var(--color-glow-highlight)': 'var(--color-electric-lime)',
  'var(--font-primary)': 'var(--font-body)',
  'var(--color-bg-surface)': 'var(--color-white)',
  'rgba(14, 165, 233,': 'rgba(255, 107, 74,' // rgb for flux coral
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  for (const [key, value] of Object.entries(replacements)) {
    content = content.split(key).join(value);
  }
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated', filePath);
  }
}

function walkDir(d) {
  const files = fs.readdirSync(d);
  for (const f of files) {
    const full = path.join(d, f);
    if (fs.statSync(full).isDirectory()) walkDir(full);
    else if (full.endsWith('.css')) processFile(full);
  }
}

walkDir(dir);
console.log('Done.');
