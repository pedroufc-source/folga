'use strict';
// Gera og.png (preview do link no WhatsApp e redes) e apple-touch-icon.png: `npm run images`.
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
(async () => {
  const browser = await chromium.launch();
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await og.goto('file://' + path.join(__dirname, 'og.html'));
  await og.evaluate(() => document.fonts.ready);
  await og.screenshot({ path: path.join(root, 'og.png') });
  const icon = await browser.newPage({ viewport: { width: 180, height: 180 } });
  await icon.goto('file://' + path.join(__dirname, 'og.html'));
  await icon.setContent(`<style>html,body{margin:0}</style><img src="file://${path.join(root, 'icon.svg')}" width="180" height="180">`);
  await icon.waitForTimeout(100);
  await icon.screenshot({ path: path.join(root, 'apple-touch-icon.png') });
  await browser.close();
  console.log('og.png e apple-touch-icon.png atualizados.');
})();
