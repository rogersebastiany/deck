const fs = require('fs');
const path = require('path');

const cardsDir = path.join(__dirname, 'obsidian/cards');
const outputFile = path.join(__dirname, 'website/cards.json');

const files = fs.readdirSync(cardsDir).filter(file => file.endsWith('.md'));

const cards = files.map(file => {
  const content = fs.readFileSync(path.join(cardsDir, file), 'utf8');
  
  // Basic parsing
  const title = content.match(/^# (.*)/m)?.[1] || '';
  const image = content.match(/!\[\[\.\.\/(.*?)\]\]/)?.[1] || '';
  
  // Extract table properties
  const properties = {};
  const tableRows = content.match(/\| (.*?) \| (.*?) \|/g);
  if (tableRows) {
    tableRows.slice(2).forEach(row => {
      const parts = row.split('|').map(p => p.trim()).filter(p => p);
      if (parts.length === 2) {
        properties[parts[0]] = parts[1];
      }
    });
  }

  // Extract category
  const categoryMatch = content.match(/## Category\n\[\[Home#(.*?)\|/);
  const category = categoryMatch ? categoryMatch[1] : '';

  // Extract card text (Effect)
  const effectMatch = content.match(/> \*\*\[EFFECT\]\*\*\n> (.*)/);
  const effect = effectMatch ? effectMatch[1] : '';

  // Extract artwork
  const artworkMatch = content.match(/## Artwork Description\n([\s\S]*?)\n\n##/);
  const artwork = artworkMatch ? artworkMatch[1].trim() : '';

  return {
    title,
    image: `../${image.replace(/\.png$/, '.webp')}`,
    category,
    properties,
    effect,
    artwork,
    slug: title.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    rawMd: content.replace(/\.png\]\]/g, '.webp]]')
  };
});

fs.writeFileSync(outputFile, JSON.stringify(cards, null, 2));
console.log(`Generated ${cards.length} cards in website/cards.json`);
