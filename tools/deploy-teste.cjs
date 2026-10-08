'use strict';
// Publica uma versão de teste na Cloudflare Pages, sem tocar no site principal (GitHub Pages).
// Uso: npm run deploy:teste  →  https://teste.folga.pages.dev (o endereço sai no fim do envio)
// Requer login na Cloudflare (npx wrangler login).
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'output', 'dist');
const PROJECT = 'folga';
const PUBLIC = ['index.html', 'styles.css', 'engine.js', 'content.js', 'app.js', 'icon.svg', 'apple-touch-icon.png', 'og.png', 'THIRD_PARTY.md', 'fonts'];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
for (const item of PUBLIC) fs.cpSync(path.join(root, item), path.join(dist, item), { recursive: true });
// Endereço de teste fora dos buscadores.
fs.writeFileSync(path.join(dist, '_headers'), '/*\n  X-Robots-Tag: noindex\n');
console.log(`output/dist montada com ${PUBLIC.length} itens`);

execFileSync('npx', ['--yes', 'wrangler@4.148.0', 'pages', 'deploy', dist, '--project-name', PROJECT, '--branch', process.argv[2] || 'teste', '--commit-dirty=true'], { cwd: root, stdio: 'inherit' });
