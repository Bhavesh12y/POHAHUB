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

// Exact images extracted from MainLanding.jsx arrays
const GAME_IMAGES = {
  'connect-four': 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/Logo%20(1).png',
  'tic-tac-toe': 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/original-c03c34a74dba4bb1c8010bec8c06e719.png',
  'scribble': 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/scribble.png',
  'snake-and-ladder': 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/sal.png',
  'tambola': 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/tambols.png',
  'stone-paper-scissor': 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/SPS2.png',
  'ludo': 'https://raw.githubusercontent.com/Bhavesh12y/pohahub/refs/heads/main/frontend/src/images/ludo.png',
  'air-hockey': 'https://raw.githubusercontent.com/Bhavesh12y/pohahub/refs/heads/main/frontend/src/images/airhockey.png',
  'table-tennis': 'https://raw.githubusercontent.com/Bhavesh12y/pohahub/refs/heads/main/frontend/src/images/tabletennis.png',
  'block-blaster': 'https://raw.githubusercontent.com/Bhavesh12y/pohahub/refs/heads/main/frontend/src/images/block.png',
  '2048': 'https://raw.githubusercontent.com/Bhavesh12y/pohahub/refs/heads/main/frontend/src/images/2048.png',
  'dino': 'https://raw.githubusercontent.com/Bhavesh12y/pohahub/refs/heads/main/frontend/src/images/dinorun.png',
  'flappy-bird': 'https://raw.githubusercontent.com/Bhavesh12y/pohahub/refs/heads/main/frontend/src/images/flappy.jpg',
  'helix-jump': 'https://raw.githubusercontent.com/Bhavesh12y/pohahub/refs/heads/main/frontend/src/images/helix.jpg',
};

// Define which games are single-player for the Leaderboard logic
const SINGLE_PLAYER_GAMES = ['block-blaster', '2048', 'dino', 'flappy-bird', 'helix-jump'];

function JsonLd({ data }) {
  return <script type="application/ld+json">{JSON.stringify(data)}</script>;
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

// Icons
function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2">
      <circle cx="18" cy="5" r="3"></circle>
      <circle cx="6" cy="12" r="3"></circle>
      <circle cx="18" cy="19" r="3"></circle>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export default function GameSeoPage({ slug }) {
  const { gameId } = useParams();
  const rawGameId = slug || gameId || '';
  const normalizedGameId = normalizeGameId(rawGameId);
  const game = gamesSeo[rawGameId] || gamesSeo[normalizedGameId];
  const meta = SEO_CONFIG.games[normalizedGameId] || game;

  const [showNameModal, setShowNameModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [playerNameInput, setPlayerNameInput] = useState('');
  const [copied, setCopied] = useState(false);
  
  const isSinglePlayer = SINGLE_PLAYER_GAMES.includes(normalizedGameId);

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
  
  // Robust image grabber: Tries exact ID first, then normalized ID, then falls back
  const gameImageUrl = GAME_IMAGES[rawGameId] || GAME_IMAGES[normalizedGameId] || game.image || defaultSeo.image; 
  
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
    playMode: isSinglePlayer ? 'SinglePlayer' : (game.playMode || 'MultiPlayer'),
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
      { '@type': 'ListItem', position: 1, name: SEO_CONFIG.siteName, item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: game.name, item: canonicalUrl },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: game.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  const handleSaveName = (e) => {
    e.preventDefault();
    if (playerNameInput.trim()) {
      localStorage.setItem('Doozles-player-name', playerNameInput.trim());
      setShowNameModal(false);
    }
  };

  const handlePlayClick = (e) => {
    if (!localStorage.getItem('Doozles-player-name')) {
      e.preventDefault();
      setShowNameModal(true);
    } else {
      window.location.href = game.playPath;
    }
  };

  // Social Share Handlers
  const shareText = `Play ${game.name} on Doozles! ${game.intro}`;
  const shareUrl = window.location.href;

  const openWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
  };

  const openTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

      {/* Changed max-w to 4xl for a tighter single-column reading experience */}
      <article className="max-w-4xl mx-auto px-5 py-12 sm:py-16">
        
        {/* --- FULL WIDTH HERO SECTION (TOP TO BOTTOM) --- */}
        <header className="mb-14 flex flex-col items-center text-center animate-sketch-pop">
          
          <div className="mb-5">
             <span className="inline-block bg-[#facc15] border-[3px] border-black shadow-[4px_4px_0px_#000] px-4 py-2 -rotate-1 text-sm font-black uppercase tracking-widest">
              Game guide
            </span>
          </div>
          
          {/* TITLE & SUBTEXT */}
          <h1 className="text-[clamp(3.5rem,8vw,6rem)] font-black uppercase leading-[0.9] tracking-normal text-black mb-6 w-full">
            {game.name}
          </h1>
          
          <p className="text-xl sm:text-2xl font-bold text-gray-800 leading-relaxed mb-10 max-w-3xl">
            {game.intro}
          </p>

          {/* THE BIG IMAGE */}
          <div className="w-full mb-10">
             <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_#000] overflow-hidden aspect-video flex items-center justify-center rotate-1 hover:rotate-0 transition-transform duration-300 p-2 sm:p-4">
                <img 
                  src={gameImageUrl} 
                  alt={`${game.name} preview`} 
                  className="w-full h-full object-contain scale-[0.95]"
                  onError={(e) => { e.target.style.display = 'none' }} 
                />
             </div>
          </div>

          {/* PLAY AND SHARE BUTTONS BELOW IMAGE */}
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-2xl mb-8">
            <button
              onClick={handlePlayClick}
              className="flex-1 min-w-[200px] inline-flex items-center justify-center bg-[#7dd3fc] text-black border-[4px] border-black px-8 py-5 font-black uppercase tracking-widest text-xl shadow-[6px_6px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all cursor-pointer rotate-1"
            >
              Play Now
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              className="inline-flex items-center justify-center bg-[#fca5a5] text-black border-[4px] border-black px-8 py-5 font-black uppercase tracking-widest text-xl shadow-[6px_6px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all cursor-pointer -rotate-1"
            >
              <ShareIcon /> Share
            </button>
          </div>
            
          <div>
             <Link
              to={isSinglePlayer ? "/single-player" : "/"}
              className="inline-flex items-center justify-center bg-white text-black border-[3px] border-black px-6 py-3 font-black uppercase tracking-widest text-sm shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all"
            >
              ← Back to {isSinglePlayer ? "Single Player" : "Hub"}
            </Link>
          </div>
        </header>

        {/* --- LEADERBOARD (IF SINGLE PLAYER) --- */}
        {isSinglePlayer && (
          <section className="mb-10 animate-sketch-pop" style={{ animationDelay: '150ms' }}>
            <div className="bg-[#bef264] border-[4px] border-black shadow-[8px_8px_0px_#000] p-6 -rotate-1 max-w-2xl mx-auto">
              <h3 className="text-xl font-black uppercase border-b-[3px] border-black pb-3 mb-4 flex justify-between items-center">
                <span>🏆 Global Top Scores</span>
              </h3>
              <ul className="space-y-3 font-bold">
                <li className="flex justify-between items-center bg-white border-[2px] border-black p-2">
                  <span className="uppercase">1. Guest_992</span>
                  <span className="bg-[#facc15] px-2 border-l-[2px] border-black">12,450</span>
                </li>
                <li className="flex justify-between items-center bg-white border-[2px] border-black p-2">
                  <span className="uppercase">2. SketchMaster</span>
                  <span className="bg-[#facc15] px-2 border-l-[2px] border-black">10,120</span>
                </li>
                <li className="flex justify-between items-center bg-white border-[2px] border-black p-2">
                  <span className="uppercase">3. You</span>
                  <span className="bg-[#facc15] px-2 border-l-[2px] border-black">--</span>
                </li>
              </ul>
            </div>
          </section>
        )}

        {/* --- GAME INFO GRIDS --- */}
        <div className="grid gap-6 sm:grid-cols-2 mt-8">
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
            <h2 className="text-2xl font-black uppercase mb-5 text-center">Related Games</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {relatedGames.map((relatedGame) => (
                <Link
                  key={relatedGame.path}
                  to={relatedGame.path}
                  className="bg-white border-[4px] border-black shadow-[6px_6px_0px_#000] p-5 font-black uppercase hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all text-center"
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

      {/* --- SHARE MODAL (WhatsApp, Twitter, Copy) --- */}
      {showShareModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_#000] p-6 sm:p-8 max-w-sm w-full relative -rotate-1 animate-sketch-pop pointer-events-auto">
            <button
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 bg-red-400 text-black border-[3px] border-black w-10 h-10 flex items-center justify-center font-black text-lg shadow-[3px_3px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[1px_1px_0px_#000] transition-all"
            >
              <CloseIcon />
            </button>
            <h2 className="text-2xl font-black uppercase mb-6 tracking-normal text-left">
              Share Game
            </h2>
            
            <div className="flex flex-col gap-4">
              {/* WhatsApp Button */}
              <button
                onClick={openWhatsApp}
                className="w-full bg-[#4ade80] text-black border-[3px] border-black p-4 text-lg font-black uppercase shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all text-left flex items-center"
              >
                {/* SVG for WhatsApp */}
                <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                WhatsApp
              </button>

              {/* Twitter/X Button */}
              <button
                onClick={openTwitter}
                className="w-full bg-[#38bdf8] text-black border-[3px] border-black p-4 text-lg font-black uppercase shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all text-left flex items-center"
              >
                 <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                Twitter / X
              </button>

              {/* Copy Link Button */}
              <button
                onClick={copyToClipboard}
                className="w-full bg-[#fcd34d] text-black border-[3px] border-black p-4 text-lg font-black uppercase shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all text-left flex items-center justify-between"
              >
                <span>Copy Link</span>
                {copied && <span className="text-sm bg-black text-white px-2 py-1 rounded">Copied!</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}