import { Suspense, lazy, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { absoluteUrl, defaultSeo } from '../config/seo.js';
import { emitWithAck } from '../lib/socket.js';
import { GAMES, gamesForMode, MODE_INFO } from '../data/games.js';
import { BLOG_POSTS } from '../data/blogPosts.js';
import GameCard from './GameCard.jsx';
import Modal from './Modal.jsx';
import ModeCards from './ModeCards.jsx';
import useHydrated from '../lib/useHydrated.js';

const Scanner = lazy(() =>
  import('@yudiel/react-qr-scanner').then((module) => ({
    default: module.Scanner,
  })),
);

const MODE_COPY = {
  bot: { title: 'Challenge a bot', text: 'Classic board and table games against a computer opponent. Pick easy, medium or hard before you start.' },
  solo: { title: 'Solo arcade', text: 'Quick 3D arcade runs with a personal best and a global top three.' },
  online: { title: 'Online rooms', text: 'Create a private room, share the code or QR, and play with friends on their own phones.' },
  local: { title: 'Local play', text: 'Everyone plays on this device. Pass the phone on your turn, or share the screen for air hockey.' },
};
const VALID_MODES = Object.keys(MODE_COPY);

function SketchStrokes({ flip = false }) {
  return (
    <svg viewBox="0 0 24 32" className={`w-5 h-7 ${flip ? '-scale-x-100' : ''}`} aria-hidden="true">
      <g stroke="#111" strokeWidth="3.5" strokeLinecap="round">
        <path d="M16 3 L21 8" />
        <path d="M4 16 L18 16" />
        <path d="M16 29 L21 24" />
      </g>
    </svg>
  );
}

const FEATURED_GUIDES = ['ludo', 'raja-mantri', 'tambola', 'air-hockey', 'connect-four', '2048'];

export default function MainLanding() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinMode, setJoinMode] = useState('');
  const [nearbyStatus, setNearbyStatus] = useState('');
  const hydrated = useHydrated();
  const requested = searchParams.get('mode');
  const playMode = hydrated && VALID_MODES.includes(requested) ? requested : 'online';
  const displayedGames = gamesForMode(playMode);

  const selectMode = (mode) => {
    const next = new URLSearchParams(searchParams);
    if (mode === 'online') next.delete('mode');
    else next.set('mode', mode);
    setSearchParams(next, { replace: true, preventScrollReset: true });
  };

  const handleScan = (result) => {
    if (result && result[0]) {
      try {
        const urlObj = new URL(result[0].rawValue);
        closeMenu();
        navigate(urlObj.pathname + urlObj.search);
      } catch {
        setNearbyStatus('Invalid QR code scanned');
      }
    }
  };

  const handleFindNearby = () => {
    setJoinMode('nearby');
    setNearbyStatus('Requesting your location...');

    if (!navigator.geolocation) {
      setNearbyStatus('Location is not supported in this browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setNearbyStatus('Scanning for nearby rooms...');
        try {
          const res = await emitWithAck('room:find_nearby', {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });

          if (res.ok && res.roomUrl) {
            setNearbyStatus('Match found! Joining...');
            const urlObj = new URL(res.roomUrl);
            setTimeout(() => {
              closeMenu();
              navigate(urlObj.pathname + urlObj.search);
            }, 1000);
          } else {
            setNearbyStatus(res.error || 'No nearby rooms found.');
          }
        } catch {
          setNearbyStatus('Could not reach the server.');
        }
      },
      () => setNearbyStatus('Location permission denied.'),
      { enableHighAccuracy: true },
    );
  };

  function closeMenu() {
    setShowJoinModal(false);
    setJoinMode('');
    setNearbyStatus('');
  }

  const latestPosts = BLOG_POSTS.slice(0, 3);
  const featuredGuides = FEATURED_GUIDES.map((id) => GAMES.find((g) => g.id === id)).filter(Boolean);

  return (
    <>
      <Helmet>
        <title>{defaultSeo.title}</title>
        <meta name="description" content={defaultSeo.description} />
        <link rel="canonical" href={absoluteUrl('/')} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Doozles" />
        <meta property="og:title" content={defaultSeo.title} />
        <meta property="og:description" content={defaultSeo.description} />
        <meta property="og:url" content={absoluteUrl('/')} />
        <meta property="og:image" content={defaultSeo.image} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={defaultSeo.title} />
        <meta name="twitter:description" content={defaultSeo.description} />
        <meta name="twitter:image" content={defaultSeo.image} />
      </Helmet>

      <div className="relative min-h-screen overflow-hidden font-sans text-black">
        <div className="relative max-w-7xl mx-auto px-5 py-24 sm:py-28 z-10 w-full">
          <section className="mb-10 sm:mb-14 animate-sketch-pop text-center flex flex-col items-center">
            <div className="inline-block bg-[#facc15] border-[3px] border-black shadow-[4px_4px_0px_#000] px-4 py-2 mb-6 -rotate-1">
              <span className="text-sm sm:text-base font-black uppercase tracking-widest text-black">
                Rooms, rivalries, and ridiculous comebacks
              </span>
            </div>

            <h1 className="max-w-5xl mx-auto text-[clamp(3rem,8vw,6rem)] font-black uppercase leading-[0.9] tracking-normal">
              Pick a game.
              <span className="block text-pink-400">Start the room.</span>
            </h1>

            <p className="mt-6 max-w-2xl mx-auto text-[clamp(1rem,2vw,1.4rem)] font-bold text-gray-700 leading-relaxed uppercase tracking-wider">
              A bright notebook arcade for quick matches with friends, family, or a bot.
            </p>
          </section>

          <section className="animate-sketch-pop" aria-label="Play modes">
            <ModeCards value={playMode} onChange={selectMode} />
          </section>

          <div className="mt-14 mb-10 sm:mb-12">
            <div className="h-[4px] bg-black max-w-4xl mx-auto rounded-full" />
            <div className="mt-8 flex flex-col items-center text-center gap-3">
              <h2 className="flex items-center gap-4 text-2xl sm:text-3xl font-black uppercase tracking-widest">
                <SketchStrokes />
                {MODE_COPY[playMode].title}
                <SketchStrokes flip />
              </h2>
              <p className="font-body text-base font-semibold text-gray-700 max-w-2xl">{MODE_COPY[playMode].text}</p>
              {playMode === 'online' && (
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="mt-2 inline-block bg-sky-300 text-black border-[4px] border-black px-6 py-3 font-black uppercase tracking-widest shadow-[5px_5px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all rotate-1"
                >
                  Join Existing Room
                </button>
              )}
            </div>
          </div>

          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
            {displayedGames.map((game, index) => (
              <GameCard
                key={`${playMode}-${game.id}`}
                game={game}
                index={index}
                to={MODE_INFO[playMode].path(game)}
                badge={playMode === 'local' ? 'Same device' : playMode === 'bot' ? 'vs Bot' : null}
                cta={playMode === 'bot' ? 'Challenge' : 'Play Now'}
              />
            ))}
          </section>

          {/* About + discovery section: real text for players and for search engines. */}
          <section className="mt-24 grid gap-8 lg:grid-cols-5">
            <div className="lg:col-span-3 paper-panel bg-white p-6 sm:p-10">
              <h2 className="text-3xl sm:text-4xl font-black uppercase mb-5">What is Doozles?</h2>
              <div className="sketch-prose">
                <p>
                  Doozles is a free browser arcade for the games people actually play together: Ludo on a Sunday
                  afternoon, Raja Mantri Chor Sipahi with cousins, Tambola at a family party, or a quick round of Tic
                  Tac Toe while waiting for food. Nothing to install and no account to make. Open a link and play.
                </p>
                <p>There are four ways to play:</p>
                <ul>
                  <li>
                    <strong>Online rooms.</strong> Create a private room and invite friends with a six-letter code, a
                    link, or a QR code. Every move is checked by our game server, so both screens always agree.
                  </li>
                  <li>
                    <strong>Local play.</strong> Everyone shares one phone or tablet. Turn-based games hand the device
                    to the next player, and Air Hockey splits the screen so two people can play face to face.
                  </li>
                  <li>
                    <strong>Versus bot.</strong> Practice against computer opponents with easy, medium and hard
                    settings. It works offline once the page has loaded.
                  </li>
                  <li>
                    <strong>Solo arcade.</strong> Short single-player games like 2048, Block Blaster and Helix Jump,
                    with a personal best and a global top three.
                  </li>
                </ul>
                <p>
                  Every game has a full guide covering the rules, the history behind it and strategies that actually
                  win. If you are new to a game, start there.
                </p>
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-8">
              <div className="bg-[#fef9c3] border-[4px] border-black shadow-[6px_6px_0px_#000] p-6 rotate-1">
                <h2 className="text-2xl font-black uppercase mb-4">Popular guides</h2>
                <ul className="grid grid-cols-2 gap-3">
                  {featuredGuides.map((game) => (
                    <li key={game.id}>
                      <Link
                        to={game.guidePath}
                        className="block bg-white border-[3px] border-black px-3 py-2 font-black uppercase text-sm shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] transition-all"
                      >
                        {game.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white border-[4px] border-black shadow-[6px_6px_0px_#000] p-6 -rotate-1">
                <div className="flex items-center justify-between mb-4 gap-3">
                  <h2 className="text-2xl font-black uppercase">From the blog</h2>
                  <Link to="/blog" className="text-sm font-black uppercase underline decoration-[3px] decoration-pink-400 underline-offset-4">
                    All posts
                  </Link>
                </div>
                <ul className="space-y-4">
                  {latestPosts.map((post) => (
                    <li key={post.slug} className="border-t-[2px] border-dashed border-black pt-3 first:border-0 first:pt-0">
                      <Link to={`/blog/${post.slug}`} className="group block">
                        <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">{post.category}</span>
                        <span className="block font-body font-extrabold text-base leading-snug group-hover:underline decoration-[2px]">
                          {post.title}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>

        <Modal open={showJoinModal} onClose={closeMenu} title="Join Match">
          {!joinMode && (
            <div className="flex flex-col gap-4">
              <button
                onClick={() => setJoinMode('scan')}
                className="bg-sky-300 border-[3px] border-black p-4 text-lg font-black uppercase shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all text-left"
              >
                Scan QR Code
              </button>
              <button
                onClick={handleFindNearby}
                className="bg-purple-300 border-[3px] border-black p-4 text-lg font-black uppercase shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all text-left"
              >
                Find Nearby
              </button>
              <p className="font-body text-sm font-semibold text-gray-600">
                Have a room code? Open the game from the list and enter it under &quot;Join existing&quot;.
              </p>
            </div>
          )}

          {joinMode === 'scan' && (
            <div className="flex flex-col items-center">
              <div className="w-full aspect-square border-[4px] border-black shadow-[6px_6px_0px_#000] overflow-hidden mb-6 bg-gray-200 rotate-1">
                <Suspense
                  fallback={
                    <div className="flex h-full w-full items-center justify-center bg-gray-100 px-4 text-center text-sm font-black uppercase tracking-widest">
                      Loading camera...
                    </div>
                  }
                >
                  <Scanner onScan={handleScan} />
                </Suspense>
              </div>
              <p className="font-bold text-gray-500 uppercase tracking-widest text-sm mb-2 text-center">
                Point the camera at the host&apos;s QR code
              </p>
              {nearbyStatus && <p className="text-red-500 font-black uppercase text-center mt-2">{nearbyStatus}</p>}
            </div>
          )}

          {joinMode === 'nearby' && (
            <div className="text-center py-8">
              <div className="inline-block w-16 h-16 border-[6px] border-purple-200 border-t-purple-600 rounded-full animate-spin mb-6" />
              <p className="font-black text-base sm:text-lg uppercase tracking-widest text-purple-600 px-4 leading-relaxed">
                {nearbyStatus}
              </p>
            </div>
          )}
        </Modal>


      </div>
    </>
  );
}
