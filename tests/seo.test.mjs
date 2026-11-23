import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import fr from '../i18n/fr.js';

const root = new URL('../', import.meta.url);
const read = f => readFileSync(new URL(f, root), 'utf8');
const SITE = 'https://rubiksera.bradfo.me/';

test('sitemap.xml lists the home page on the live domain', () => {
  const xml = read('sitemap.xml');
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.ok(locs.includes(SITE));
  for (const loc of locs) assert.ok(loc.startsWith(SITE), loc);
});

test('robots.txt allows crawling and points to the sitemap', () => {
  const txt = read('robots.txt');
  assert.match(txt, /^User-agent: \*$/m);
  assert.match(txt, /^Allow: \/$/m);
  assert.match(txt, new RegExp(`^Sitemap: ${SITE}sitemap.xml$`, 'm'));
});

test('llms.txt describes the site without forbidden separators', () => {
  const txt = read('llms.txt');
  assert.match(txt, /^# rubiksera/);
  assert.ok(txt.includes(SITE));
  assert.doesNotMatch(txt, /[·—–]/);
});

test('index.html has a canonical URL and a HowTo with the 8 steps', () => {
  const html = read('index.html');
  assert.ok(html.includes(`<link rel="canonical" href="${SITE}" />`));
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(m, 'no JSON-LD block');
  const data = JSON.parse(m[1]);
  const graph = data['@graph'];
  const howTo = graph.find(n => n['@type'] === 'HowTo');
  assert.ok(howTo, 'no HowTo node');
  assert.deepEqual(howTo.step.map(s => s.name), fr.steps.map(s => s.title));
  assert.ok(graph.some(n => n['@type'] === 'WebSite' && n.url === SITE));
});
