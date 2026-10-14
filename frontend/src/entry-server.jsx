// Build-time renderer used by scripts/prerender.mjs. Content pages (hub, guides,
// blog, legal) are rendered to static HTML so crawlers and first paint get real
// content; game rooms stay client-rendered.
import { Writable } from 'node:stream';
import React from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.jsx';
import { GAMES } from './data/games.js';
import { BLOG_POSTS } from './data/blogPosts.js';
import { SEO_CONFIG, defaultSeo } from './config/seo.js';

export const STATIC_ROUTES = ['/', '/single-player', '/blog', '/about', '/contact', '/trust', '/privacy-policy', '/terms'];

export function getPrerenderRoutes() {
  const guides = GAMES.map((game) => game.guidePath);
  const posts = BLOG_POSTS.map((post) => `/blog/${post.slug}`);
  return [...STATIC_ROUTES, ...guides, ...posts];
}

export function getSitemapEntries() {
  const today = new Date().toISOString().slice(0, 10);
  const entries = [
    { path: '/', priority: '1.0', lastmod: today },
    { path: '/single-player', priority: '0.9', lastmod: today },
    { path: '/blog', priority: '0.9', lastmod: BLOG_POSTS[0]?.date || today },
  ];
  GAMES.forEach((game) => entries.push({ path: game.guidePath, priority: game.hidden ? '0.6' : '0.8', lastmod: today }));
  BLOG_POSTS.forEach((post) =>
    entries.push({ path: `/blog/${post.slug}`, priority: '0.7', lastmod: post.updated || post.date }),
  );
  ['/about', '/contact', '/trust', '/privacy-policy', '/terms'].forEach((path) =>
    entries.push({ path, priority: '0.4', lastmod: today }),
  );
  return entries;
}

export const site = { baseUrl: SEO_CONFIG.baseUrl, defaultTitle: defaultSeo.title, defaultDescription: defaultSeo.description };

export function render(url) {
  const helmetContext = {};

  return new Promise((resolve, reject) => {
    let html = '';
    const sink = new Writable({
      write(chunk, _encoding, callback) {
        html += chunk.toString();
        callback();
      },
    });
    sink.on('finish', () => {
      const { helmet } = helmetContext;
      const head = helmet
        ? [helmet.title, helmet.meta, helmet.link, helmet.script].map((part) => part?.toString() || '').join('\n    ')
        : '';
      resolve({ html, head });
    });

    const stream = renderToPipeableStream(
      <React.StrictMode>
        <HelmetProvider context={helmetContext}>
          <StaticRouter location={url}>
            <App />
          </StaticRouter>
        </HelmetProvider>
      </React.StrictMode>,
      {
        // Wait for every lazy route chunk so the full page is in the HTML.
        onAllReady() {
          stream.pipe(sink);
        },
        onShellError: reject,
        onError(error) {
          reject(error);
        },
      },
    );
  });
}
