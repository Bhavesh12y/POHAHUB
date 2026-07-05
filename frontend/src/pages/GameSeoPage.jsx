import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  SEO_CONFIG,
  absoluteUrl,
  defaultSeo,
  gamesSeo,
  normalizeGameId,
} from '../config/seo.js';

function JsonLd({ data }) {
  return (
    <script type="application/ld+json">
      {JSON.stringify(data)}
    </script>
  );
}

function setNamedMeta(name, content) {
  if (!content) return;

  let element = document.querySelector(`meta[name="${name}"]`);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('name', name);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

export default function GameSeoPage({ slug }) {
  const { gameId } = useParams();
  const rawGameId = slug || gameId || '';
  const normalizedGameId = normalizeGameId(rawGameId);
  const game = gamesSeo[rawGameId] || gamesSeo[normalizedGameId];
  const meta = SEO_CONFIG.games[normalizedGameId] || game;

  // --- NEW: Name Check State ---
  const [showNameModal, setShowNameModal] = useState(false);
  const [playerNameInput, setPlayerNameInput] = useState('');

  // --- NEW: Check LocalStorage on Mount ---
  useEffect(() => {
    const storedName = localStorage.getItem('Doozles-player-name');
    if (!storedName) {
      setShowNameModal(true);
    }
  }, []);

  useEffect(() => {
    const title = meta?.title || SEO_CONFIG.defaultTitle;
    const description = meta?.description || SEO_CONFIG.defaultDescription;
    const keywords = meta?.keywords || SEO_CONFIG.defaultKeywords;

    document.title = title;
    setNamedMeta('description', description);
    setNamedMeta('keywords', keywords);
  }, [meta]);

  if (!game) {
    return <Navigate to="/" replace />;
  }

  const canonicalUrl = absoluteUrl(game.path);
  // Fallback to og-image if specific game image doesn't exist
  const gameImageUrl = game.image || defaultSeo.image; 
  const relatedGames = game.related.map((relatedSlug) => gamesSeo[relatedSlug]).filter(Boolean);

  const videoGameSchema = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: game.name,
    description: game.description,
    url: canonicalUrl,
    image: gameImageUrl,
    applicationCategory: 'BrowserGame',
    operatingSystem: 'Web browser',
    playMode: game.playMode || 'MultiPlayer',
    publisher: {
      '@type': 'Organization',
      name: SEO_CONFIG.siteName,
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
        name: SEO_CONFIG.siteName,
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

  // --- NEW: Handle Name Submission ---
  const handleSaveName = (e) => {
    e.preventDefault();
    if (playerNameInput.trim()) {
      localStorage.setItem('Doozles-player-name', playerNameInput.trim());
      setShowNameModal(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{game.title}</title>
        <meta name="description" content={game.description} />
        <meta name="keywords" content={game.keywords} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content={SEO_CONFIG.siteName} />
        <meta property="og:title" content={game.title} />
        <meta property="og:description" content={game.description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={gameImageUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={game.title} />
        <meta name="twitter:description" content={game.description} />
        <meta name="twitter:image" content={gameImageUrl} />
      </Helmet>

      <JsonLd data={videoGameSchema} />
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={faqSchema} />

      {/* NEW: Inline style for the modal animation */}
      <style>{`
        @keyframes sketch-pop {
          0% { opacity: 0; transform: translateY(30px) rotate(-3deg) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) rotate(0deg) scale(1); }
        }
        .animate-sketch-pop {
          animation: sketch-pop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          opacity: 0;
        }
      `}</style>

      <article className="max-w-5xl mx-auto px-5 py-12 sm:py-16">
        <header className="mb-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
          
          <div className="flex-1">
            <p className="inline-block bg-[#facc15] border-[3px] border-black shadow-[4px_4px_0px_#000] px-4 py-2 mb-5 -rotate-1 text-sm font-black uppercase tracking-widest">
              Game guide
            </p>
            <h1 className="text-[clamp(2.5rem,7vw,5rem)] font-black uppercase leading-none tracking-normal text-black">
              {game.name}
            </h1>
            <p className="mt-5 text-lg sm:text-xl font-bold text-gray-800 leading-relaxed">
              {game.intro}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              {/* NEW: Replaced Link with an onClick interceptor to ensure name is set before playing */}
              <button
                onClick={(e) => {
                  if (!localStorage.getItem('Doozles-player-name')) {
                    e.preventDefault();
                    setShowNameModal(true);
                  } else {
                    window.location.href = game.playPath;
                  }
                }}
                className="inline-flex items-center justify-center bg-[#7dd3fc] text-black border-[4px] border-black px-8 py-4 font-black uppercase tracking-widest text-lg shadow-[6px_6px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all cursor-pointer"
              >
                Play Now
              </button>
              <Link
                to="/"
                className="inline-flex items-center justify-center bg-white text-black border-[4px] border-black px-8 py-4 font-black uppercase tracking-widest text-lg shadow-[6px_6px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all"
              >
                Back to Hub
              </Link>
            </div>
          </div>

          <div className="w-full md:w-1/3 flex-shrink-0">
             <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_#000] overflow-hidden aspect-video flex items-center justify-center rotate-2 hover:rotate-0 transition-transform duration-300 p-2">
                <img 
                  src={gameImageUrl} 
                  alt={`${game.name} preview`} 
                  className="w-full h-full object-contain"
                  onError={(e) => { e.target.style.display = 'none' }} 
                />
             </div>
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

      {/* --- NAME PROMPT MODAL --- */}
      {showNameModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-[#a9def9] border-[4px] border-black shadow-[8px_8px_0px_#000] p-6 sm:p-8 max-w-sm w-full relative rotate-1 animate-sketch-pop pointer-events-auto">
            {/* Optional Close Button */}
            <button
              onClick={() => setShowNameModal(false)}
              className="absolute top-4 right-4 bg-white text-black border-[3px] border-black w-8 h-8 flex items-center justify-center font-black text-lg shadow-[2px_2px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[0px_0px_0px_#000] transition-all"
            >
              X
            </button>
            <h2 className="text-2xl font-black uppercase mb-4 tracking-normal text-left">
              Who's Playing?
            </h2>
            <p className="font-bold text-black mb-6 text-sm uppercase tracking-wide">
              Enter your name to compete on the global leaderboard!
            </p>
            <form onSubmit={handleSaveName} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="ENTER NAME..."
                maxLength={12}
                value={playerNameInput}
                onChange={(e) => setPlayerNameInput(e.target.value)}
                className="w-full border-[3px] border-black px-4 py-3 font-black uppercase text-lg focus:outline-none focus:shadow-[4px_4px_0_0_#000] transition-shadow"
                autoFocus
              />
              <button
                type="submit"
                disabled={!playerNameInput.trim()}
                className="bg-[#facc15] disabled:opacity-50 disabled:cursor-not-allowed text-black border-[3px] border-black px-6 py-3 font-black uppercase tracking-widest text-lg shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all"
              >
                Let's Go!
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}