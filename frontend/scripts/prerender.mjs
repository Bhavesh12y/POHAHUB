// Post-build step: renders content routes to static HTML, writes the SPA shell
// for client-only routes (/games/*), a real 404 page and sitemap.xml.
//
// Output uses Vercel "cleanUrls": /ludo is served from dist/ludo.html.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const serverEntry = path.join(root, 'dist-server', 'entry-server.js');

const { render, getPrerenderRoutes, getSitemapEntries, site } = await import(pathToFileURL(serverEntry).href);

const template = await fs.readFile(path.join(dist, 'index.html'), 'utf8');

function fill(head, html) {
  return template.replace('<!--app-head-->', head).replace('<!--app-html-->', html);
}

function outputFile(route) {
  if (route === '/') return path.join(dist, 'index.html');
  return path.join(dist, `${route.replace(/^\//, '')}.html`);
}

async function write(file, contents) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, contents);
}

const escapeHtml = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

// 1. Client-only shell for game rooms, local and bot play. Written first because
//    index.html is overwritten by the prerendered home page below.
const shellHead = [
  `<title>${escapeHtml(site.defaultTitle)}</title>`,
  `<meta name="description" content="${escapeHtml(site.defaultDescription)}" />`,
  '<meta name="robots" content="noindex, follow" />',
].join('\n    ');
await write(path.join(dist, 'spa.html'), fill(shellHead, ''));

// 2. Content pages.
const routes = getPrerenderRoutes();
for (const route of routes) {
  const { html, head } = await render(route);
  await write(outputFile(route), fill(head, html));
}

// 3. 404 page (served by Vercel with a real 404 status for unknown URLs).
const notFound = await render('/__not-found__');
await write(path.join(dist, '404.html'), fill(notFound.head, notFound.html));

// 4. Sitemap generated from the same catalogue as the routes.
const urls = getSitemapEntries()
  .map(
    ({ path: p, priority, lastmod }) =>
      `  <url>\n    <loc>${site.baseUrl}${p === '/' ? '/' : p}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>${priority}</priority>\n  </url>`,
  )
  .join('\n');
await write(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
);

await fs.rm(path.join(root, 'dist-server'), { recursive: true, force: true });
console.log(`Prerendered ${routes.length} routes, 404.html, spa.html and sitemap.xml`);
