import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BLOG_POSTS } from '../data/blogPosts.js';

export default function BlogIndexPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', ...new Set(BLOG_POSTS.map(p => p.category))];

  const filteredPosts = selectedCategory === 'All' 
    ? BLOG_POSTS 
    : BLOG_POSTS.filter(p => p.category === selectedCategory);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <Helmet>
        <title>Doozles Blog & Game Strategy Guides | Casual Gaming Insights</title>
        <meta 
          name="description" 
          content="Read in-depth game strategy guides, the cultural history of traditional board games, puzzle algorithms, and casual web gaming technology insights on Doozles." 
        />
      </Helmet>

      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-block -rotate-1 mb-3">
          <div className="bg-[#facc15] border-[4px] border-black px-6 py-3 shadow-[6px_6px_0px_#000]">
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-black">
              Doozles Blog & Guides
            </h1>
          </div>
        </div>
        <p className="text-base sm:text-lg font-bold text-gray-700 max-w-2xl mx-auto mt-3">
          In-depth articles, tactical strategies, game theory, and the history of the world's most beloved casual games.
        </p>

        {/* Category Pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-8">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 text-xs sm:text-sm font-black uppercase rounded-lg border-[3px] border-black shadow-[3px_3px_0px_#000] transition-all hover:translate-x-0.5 hover:translate-y-0.5 ${
                selectedCategory === cat 
                  ? 'bg-black text-white' 
                  : 'bg-white text-black hover:bg-yellow-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {filteredPosts.map((post, idx) => {
          const colors = ['bg-[#fef08a]', 'bg-[#bae6fd]', 'bg-[#bbf7d0]', 'bg-[#fbcfe8]', 'bg-[#fed7aa]'];
          const cardColor = colors[idx % colors.length];

          return (
            <article
              key={post.slug}
              className={`border-[4px] border-black rounded-2xl p-6 flex flex-col justify-between shadow-[8px_8px_0px_#000] transition-transform hover:-translate-y-1 ${cardColor}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] sm:text-xs font-black uppercase bg-white px-2.5 py-1 rounded border border-black text-black">
                    {post.category}
                  </span>
                  <span className="text-xs font-bold text-gray-700">{post.readTime}</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-black leading-tight uppercase mb-3">
                  <Link to={`/blog/${post.slug}`} className="hover:underline decoration-3">
                    {post.title}
                  </Link>
                </h2>

                <p className="text-xs sm:text-sm font-medium text-gray-800 line-clamp-3 mb-6">
                  {post.excerpt}
                </p>
              </div>

              <div className="border-t-2 border-black/20 pt-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src={post.author.avatar}
                    alt={post.author.name}
                    className="w-8 h-8 rounded-full border border-black object-cover"
                  />
                  <div>
                    <span className="text-xs font-black text-black block leading-none">{post.author.name}</span>
                    <span className="text-[10px] font-bold text-gray-600">{post.publishedAt}</span>
                  </div>
                </div>

                <Link
                  to={`/blog/${post.slug}`}
                  className="sketch-button bg-white text-xs font-black px-3 py-1.5 uppercase hover:bg-yellow-300"
                >
                  Read &rarr;
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
