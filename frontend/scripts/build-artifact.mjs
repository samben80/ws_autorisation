// Génère une page « fragment » autonome à partir du build single-file,
// destinée à un hébergement type Artifact (l'hôte fournit <html>/<head>/<body>).
// Usage : npm run build:artifact  (lance d'abord build:standalone)
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = resolve('dist-standalone/index.html');
const dest = resolve('dist-standalone/artifact.html');

const html = readFileSync(src, 'utf8');
const fragment =
  '<title>Wavesoft · Rôles & autorisations</title>\n' +
  html
    .replace(/<!doctype html>/i, '')
    .replace(/<html[^>]*>/i, '')
    .replace(/<\/html>/i, '')
    .replace(/<head[^>]*>/i, '')
    .replace(/<\/head>/i, '')
    .replace(/<body[^>]*>/i, '')
    .replace(/<\/body>/i, '')
    .replace(/<meta[^>]*>/gi, '')
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .trim() +
  '\n';

writeFileSync(dest, fragment);
console.log(`artifact.html écrit (${fragment.length} octets) → ${dest}`);
