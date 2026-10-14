import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BLOG_POSTS } from '../data/blogPosts.js';
import { absoluteUrl } from '../config/seo.js';
import { AuthorBadge } from './BlogPostPage.jsx';
import { ArrowRightIcon } from '../components/Icons.jsx';

const CARD_COLORS = ['bg-[#fef08a]', 'bg-[#bae6fd]', 'bg-[#bbf7d0]', 'bg-[#fbcfe8]', 'bg-[#fed7aa]'];

export default function BlogIndexPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const categories = ['All', ...new Set(BLOG_POSTS.map((p) => p.category))];
  const filteredPosts =
    selectedCategory === 'All' ? BLOG_POSTS : BLOG_POSTS.filter((p) => p.category === selectedCategory);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <Helmet>
        <title>Doozles Blog: Game Guides, Strategy and Behind the Scenes</title>
        <meta
          name="description"
          content="Strategy guides, the history of traditional Indian games, party game tips and engineering notes from the team building Doozles."
        />
        <link rel="canonical" href={absoluteUrl('/blog')} />
      </Helmet>

      <div className="text-center mb-12">
        <div className="inline-block -rotate-1 mb-3">
          <div className="bg-[#facc15] border-[4px] border-black px-6 py-3 shadow-[6px_6px_0px_#000]">
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-black">Doozles Blog</h1>
          </div>
        </div>
        <p className="font-body text-lg font-semibold text-gray-700 max-w-2xl mx-auto mt-4">
          Strategy, game history, party ideas and notes from building the arcade.
        </p>

        <div className="flex flex-wrap justify-center gap-2 mt-8">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              aria-pressed={selectedCategory === cat}
              className={`px-4 py-2 text-xs sm:text-sm font-black uppercase border-[3px] border-black shadow-[3px_3px_0px_#000] transition-all hover:translate-x-0.5 hover:translate-y-0.5 ${
                selectedCategory === cat ? 'bg-black text-white' : 'bg-white text-black hover:bg-yellow-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {filteredPosts.map((post, idx) => (
          <article
            key={post.slug}
            className={`border-[4px] border-black p-6 flex flex-col justify-between shadow-[8px_8px_0px_#000] transition-transform hover:-translate-y-1 ${CARD_COLORS[idx % CARD_COLORS.length]} ${idx % 2 ? 'rotate-[0.5deg]' : '-rotate-[0.5deg]'}`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="text-[11px] font-black uppercase bg-white px-2.5 py-1 border-[2px] border-black text-black">
                  {post.category}
                </span>
                <span className="text-xs font-black uppercase tracking-widest text-gray-700">{post.readTime}</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-black leading-tight mb-3">
                <Link to={`/blog/${post.slug}`} className="hover:underline decoration-[3px]">
                  {post.title}
                </Link>
              </h2>

              <p className="font-body text-base font-medium text-gray-800 line-clamp-3 mb-6">{post.excerpt}</p>
            </div>

            <div className="border-t-[3px] border-dashed border-black pt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 font-body">
                <AuthorBadge author={post.author} size="sm" />
                <div>
                  <span className="text-sm font-extrabold text-black block leading-tight">{post.author.name}</span>
                  <time dateTime={post.date} className="text-xs font-semibold text-gray-600">
                    {post.publishedAt}
                  </time>
                </div>
              </div>

              <Link
                to={`/blog/${post.slug}`}
                aria-label={`Read ${post.title}`}
                className="inline-flex items-center gap-1 bg-white border-[3px] border-black text-xs font-black px-3 py-1.5 uppercase shadow-[3px_3px_0px_#000] hover:bg-yellow-300 transition-colors"
              >
                Read <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
