import { Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { absoluteUrl, defaultSeo, gamesSeo } from '../config/seo.js';

function JsonLd({ data }) {
  return (
    <script type="application/ld+json">
      {JSON.stringify(data)}
    </script>
  );
}

export default function GameSeoPage({ slug }) {
  const game = gamesSeo[slug];

  if (!game) {
    return <Navigate to="/" replace />;
  }

  const canonicalUrl = absoluteUrl(game.path);
  const relatedGames = game.related.map((relatedSlug) => gamesSeo[relatedSlug]).filter(Boolean);
  const isChess = slug === 'chess';

  const videoGameSchema = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: game.name,
    description: game.description,
    url: canonicalUrl,
    applicationCategory: 'BrowserGame',
    operatingSystem: 'Web browser',
    playMode: game.playMode || 'MultiPlayer',
    publisher: {
      '@type': 'Organization',
      name: 'POHAHUB',
      url: absoluteUrl('/'),
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'POHAHUB',
        item: absoluteUrl('/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: game.name,
        item: canonicalUrl,
      },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: game.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <Helmet>
        <title>{game.title}</title>
        <meta name="description" content={game.description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="POHAHUB" />
        <meta property="og:title" content={game.title} />
        <meta property="og:description" content={game.description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={defaultSeo.image} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={game.title} />
        <meta name="twitter:description" content={game.description} />
        <meta name="twitter:image" content={defaultSeo.image} />
      </Helmet>

      <JsonLd data={videoGameSchema} />
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={faqSchema} />

      <article className="max-w-5xl mx-auto px-5 py-12 sm:py-16">
        <header className="mb-10">
          <p className="inline-block bg-[#facc15] border-[3px] border-black shadow-[4px_4px_0px_#000] px-4 py-2 mb-5 -rotate-1 text-sm font-black uppercase tracking-widest">
            Game guide
          </p>
          <h1 className="text-[clamp(2.5rem,7vw,5rem)] font-black uppercase leading-none tracking-normal text-black">
            {game.name}
          </h1>
          <p className="mt-5 max-w-3xl text-lg sm:text-xl font-bold text-gray-800 leading-relaxed">
            {game.intro}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Link
              to={isChess ? '/' : game.playPath}
              className="inline-flex items-center justify-center bg-[#7dd3fc] text-black border-[4px] border-black px-8 py-4 font-black uppercase tracking-widest text-lg shadow-[6px_6px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all"
            >
              Play Now
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center bg-white text-black border-[4px] border-black px-8 py-4 font-black uppercase tracking-widest text-lg shadow-[6px_6px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all"
            >
              Back to Hub
            </Link>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="paper-panel bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-black uppercase mb-4">Rules</h2>
            <ul className="space-y-3 font-bold text-gray-800">
              {game.rules.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="paper-panel bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-black uppercase mb-4">How to Play</h2>
            <ol className="space-y-3 font-bold text-gray-800 list-decimal list-inside">
              {game.howToPlay.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </section>
        </div>

        <section className="paper-panel bg-white p-6 sm:p-8 mt-6">
          <h2 className="text-2xl font-black uppercase mb-4">Winning Strategies</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {game.strategies.map((item) => (
              <div key={item} className="border-[3px] border-black bg-[#fdfdfd] p-4 font-bold">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="paper-panel bg-white p-6 sm:p-8 mt-6">
          <h2 className="text-2xl font-black uppercase mb-4">FAQ</h2>
          <div className="space-y-4">
            {game.faq.map((item) => (
              <details key={item.question} className="border-[3px] border-black bg-white p-4">
                <summary className="cursor-pointer font-black uppercase">
                  {item.question}
                </summary>
                <p className="mt-3 font-bold text-gray-800 leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {relatedGames.length > 0 && (
          <section className="mt-10">
            <h2 className="text-2xl font-black uppercase mb-5">Related Games</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {relatedGames.map((relatedGame) => (
                <Link
                  key={relatedGame.path}
                  to={relatedGame.path}
                  className="bg-white border-[4px] border-black shadow-[6px_6px_0px_#000] p-5 font-black uppercase hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all"
                >
                  {relatedGame.name}
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}
