import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BLOG_POSTS } from '../data/blogPosts.js';

export default function BlogPostPage() {

  const { slug } = useParams();
  const post = BLOG_POSTS.find(p => p.slug === slug);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const relatedPosts = BLOG_POSTS.filter(p => p.slug !== slug).slice(0, 2);

  // Article structured data for Google SEO / AdSense
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: '2026-08-15',
    author: {
      '@type': 'Person',
      name: post.author.name,
      jobTitle: post.author.role
    },
    publisher: {
      '@type': 'Organization',
      name: 'Doozles',
      url: 'https://doozles.xyz'
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 font-sans">
      <Helmet>
        <title>{`${post.title} | Doozles Blog`}</title>
        <meta name="description" content={post.excerpt} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* Back to Blog */}
      <div className="mb-6">
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-black uppercase text-black bg-yellow-200 px-3.5 py-1.5 rounded-lg border-[2px] border-black shadow-[2px_2px_0px_#000] hover:bg-yellow-300"
        >
          &larr; Back to all articles
        </Link>
      </div>

      {/* Article Header Card */}
      <header className="bg-white border-[4px] border-black rounded-2xl p-6 sm:p-10 shadow-[8px_8px_0px_#000] mb-10 -rotate-0.5">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-black uppercase bg-[#bae6fd] text-sky-900 px-3 py-1 rounded-full border border-black">
            {post.category}
          </span>
          <span className="text-xs font-bold text-gray-500">• {post.readTime}</span>
        </div>

        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-black leading-tight uppercase mb-6">
          {post.title}
        </h1>

        {/* Author Metadata */}
        <div className="flex items-center gap-3.5 pt-4 border-t-2 border-black/20">
          <img
            src={post.author.avatar}
            alt={post.author.name}
            className="w-12 h-12 rounded-full border-[2px] border-black object-cover"
          />
          <div>
            <span className="text-sm font-black text-black block">{post.author.name}</span>
            <span className="text-xs font-bold text-gray-600 block">{post.author.role} • {post.publishedAt}</span>
          </div>
        </div>
      </header>

      {/* Article Body */}
      <article className="bg-white border-[4px] border-black rounded-2xl p-6 sm:p-12 shadow-[8px_8px_0px_#000] text-gray-900 leading-relaxed font-sans">
        <div className="space-y-6 text-base sm:text-lg font-medium text-gray-800">
          {post.content.split('\n\n').map((block, idx) => {
            const trimmed = block.trim();
            if (!trimmed) return null;

            if (trimmed.startsWith('# ')) {
              return (
                <h1 key={idx} className="text-2xl sm:text-3xl font-black uppercase text-black border-b-[3px] border-black pb-2 pt-2">
                  {trimmed.replace(/^#\s+/, '')}
                </h1>
              );
            }
            if (trimmed.startsWith('## ')) {
              return (
                <h2 key={idx} className="text-xl sm:text-2xl font-black uppercase text-black pt-4 border-b-2 border-black/20 pb-1">
                  {trimmed.replace(/^##\s+/, '')}
                </h2>
              );
            }
            if (trimmed.startsWith('### ')) {
              return (
                <h3 key={idx} className="text-lg sm:text-xl font-black uppercase text-gray-900 pt-2">
                  {trimmed.replace(/^###\s+/, '')}
                </h3>
              );
            }
            if (trimmed.startsWith('---')) {
              return <hr key={idx} className="border-t-[3px] border-black my-6" />;
            }
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
              const items = trimmed.split('\n').filter(Boolean);
              return (
                <ul key={idx} className="list-disc pl-6 space-y-2">
                  {items.map((item, i) => (
                    <li key={i} className="font-semibold text-gray-800">
                      {item.replace(/^[-*]\s+/, '')}
                    </li>
                  ))}
                </ul>
              );
            }
            if (trimmed.startsWith('1. ') || trimmed.startsWith('2. ') || trimmed.startsWith('3. ')) {
              const items = trimmed.split('\n').filter(Boolean);
              return (
                <ol key={idx} className="list-decimal pl-6 space-y-2">
                  {items.map((item, i) => (
                    <li key={i} className="font-semibold text-gray-800">
                      {item.replace(/^\d+\.\s+/, '')}
                    </li>
                  ))}
                </ol>
              );
            }

            return (
              <p key={idx} className="leading-relaxed text-gray-800 font-medium">
                {trimmed}
              </p>
            );
          })}
        </div>
      </article>


      {/* Related Articles */}
      <section className="mt-14">
        <h3 className="text-xl sm:text-2xl font-black uppercase text-black mb-6">
          More from Doozles Guides
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {relatedPosts.map(p => (
            <Link
              key={p.slug}
              to={`/blog/${p.slug}`}
              className="bg-[#fed7aa] border-[3px] border-black rounded-xl p-5 shadow-[5px_5px_0px_#000] hover:-translate-y-1 transition-transform block"
            >
              <span className="text-[10px] font-black uppercase bg-white px-2 py-0.5 rounded border border-black text-black">
                {p.category}
              </span>
              <h4 className="text-base sm:text-lg font-black text-black uppercase mt-2 leading-tight">
                {p.title}
              </h4>
              <span className="text-xs font-bold text-gray-700 block mt-2">{p.readTime} &rarr;</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
