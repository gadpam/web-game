import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const distDir = join(process.cwd(), 'dist');
const assetsDir = join(distDir, 'assets');
const indexHtmlPath = join(distDir, 'index.html');
const portableHtmlPath = join(distDir, 'uptime-portable.html');

if (!existsSync(indexHtmlPath) || !existsSync(assetsDir)) {
  console.error('[build-portable] dist/index.html or dist/assets not found. Run vite build first.');
  process.exit(1);
}

const html = readFileSync(indexHtmlPath, 'utf-8');
const assetFiles = readdirSync(assetsDir);

const cssContents = assetFiles
  .filter((f) => f.endsWith('.css'))
  .map((f) => readFileSync(join(assetsDir, f), 'utf-8'))
  .join('\n');

const jsContents = assetFiles
  .filter((f) => f.endsWith('.js'))
  .map((f) => readFileSync(join(assetsDir, f), 'utf-8'))
  .join('\n')
  .replace(/<\/script/gi, '<\\/script');

let portableHtml = html
  .replace(/<link[^>]+rel="stylesheet"[^>]*>/gi, '')
  .replace(/<script[^>]+src="[^"]+"[^>]*><\/script>/gi, '');

const inlineStyleTag = `<style id="uptime-portable-styles">\n${cssContents}\n</style>`;
const inlineScriptTag = `<script type="module" id="uptime-portable-bundle">\n${jsContents}\n</script>`;

if (portableHtml.includes('</head>')) {
  portableHtml = portableHtml.replace('</head>', `${inlineStyleTag}\n</head>`);
} else {
  portableHtml = `${inlineStyleTag}\n${portableHtml}`;
}

if (portableHtml.includes('</body>')) {
  portableHtml = portableHtml.replace('</body>', `${inlineScriptTag}\n</body>`);
} else {
  portableHtml = `${portableHtml}\n${inlineScriptTag}`;
}

writeFileSync(portableHtmlPath, portableHtml, 'utf-8');
const sizeKb = (Buffer.byteLength(portableHtml, 'utf-8') / 1024).toFixed(1);
console.log(
  `[build-portable] Autonomous single-file bundle created: dist/uptime-portable.html (${sizeKb} kB)`
);
