import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BLOG_POSTS } from '../data/blogPosts.js';
import { absoluteUrl, defaultSeo } from '../config/seo.js';
import Markdown from '../components/Markdown.jsx';
import { ArrowLeftIcon, ArrowRightIcon } from '../components/Icons.jsx';
import NotFoundPage from './NotFoundPage.jsx';

export function AuthorBadge({ author, size = 'md' }) {
  const initials = author.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const dims = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-12 h-12 text-base';
  return (
    <span
      aria-hidden="true"
      className={`${dims} shrink-0 rounded-full border-[2px] border-black bg-[#fde047] flex items-center justify-center font-black shadow-[2px_2px_0px_#000]`}
    >
      {initials}
    </span>
  );
}

export default function BlogPostPage() {
  const { slug } = useParams();
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  if (!post) return <NotFoundPage />;

  const canonicalUrl = absoluteUrl(`/blog/${post.slug}`);
  const relatedPosts = BLOG_POSTS.filter((p) => p.slug !== slug && p.category === post.category)
    .concat(BLOG_POSTS.filter((p) => p.slug !== slug && p.category !== post.category))
    .slice(0, 2);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.updated || post.date,
    mainEntityOfPage: canonicalUrl,
    image: defaultSeo.image,
    author:
      post.author.name === 'Doozles Team'
        ? { '@type': 'Organization', name: 'Doozles', url: absoluteUrl('/about') }
        : { '@type': 'Person', name: post.author.name, url: absoluteUrl('/about') },
    publisher: { '@type': 'Organization', name: 'Doozles', url: absoluteUrl('/') },
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 font-sans">
      <Helmet>
        <title>{`${post.title} | Doozles Blog`}</title>
        <meta name="description" content={post.excerpt} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="Doozles" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={defaultSeo.image} />
        <meta property="article:published_time" content={post.date} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.excerpt} />
      </Helmet>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mb-6">
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-black uppercase text-black bg-yellow-200 px-3.5 py-1.5 border-[3px] border-black shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] transition-all"
        >
          <ArrowLeftIcon /> All articles
        </Link>
      </div>

      <header className="bg-white border-[4px] border-black p-6 sm:p-10 shadow-[8px_8px_0px_#000] mb-10 -rotate-[0.5deg]">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <span className="text-xs font-black uppercase bg-[#bae6fd] text-black px-3 py-1 border-[2px] border-black">
            {post.category}
          </span>
          <span className="text-xs font-black uppercase tracking-widest text-gray-500">{post.readTime}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-black leading-tight mb-6">{post.title}</h1>

        <p className="font-body text-lg font-semibold text-gray-700 leading-relaxed mb-6">{post.excerpt}</p>

        <div className="flex items-center gap-3.5 pt-5 border-t-[3px] border-dashed border-black">
          <AuthorBadge author={post.author} />
          <div className="font-body">
            <span className="text-base font-extrabold text-black block">{post.author.name}</span>
            <span className="text-sm font-semibold text-gray-600 block">
              {post.author.role} · <time dateTime={post.date}>{post.publishedAt}</time>
            </span>
          </div>
        </div>
      </header>

      <article className="bg-white border-[4px] border-black p-6 sm:p-12 shadow-[8px_8px_0px_#000]">
        <Markdown>{post.content}</Markdown>
      </article>

      <section className="mt-14">
        <h2 className="text-2xl sm:text-3xl font-black uppercase text-black mb-6">Keep reading</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {relatedPosts.map((p) => (
            <Link
              key={p.slug}
              to={`/blog/${p.slug}`}
              className="group bg-[#fed7aa] border-[3px] border-black p-5 shadow-[5px_5px_0px_#000] hover:-translate-y-1 transition-transform block"
            >
              <span className="text-[11px] font-black uppercase bg-white px-2 py-0.5 border-[2px] border-black text-black">
                {p.category}
              </span>
              <span className="block font-body text-lg font-extrabold text-black mt-3 leading-snug group-hover:underline">
                {p.title}
              </span>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-gray-700">
                {p.readTime} <ArrowRightIcon className="w-3.5 h-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
