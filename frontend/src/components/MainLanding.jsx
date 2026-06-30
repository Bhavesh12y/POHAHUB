import { Suspense, lazy, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { absoluteUrl, defaultSeo } from '../config/seo.js';
import { emitWithAck } from '../lib/socket.js';

const Scanner = lazy(() =>
  import('@yudiel/react-qr-scanner').then((module) => ({
    default: module.Scanner,
  })),
);

const GAMES = [
  {
    id: 'connect-four',
    title: 'Connect 4',
    description: 'Drop discs and connect four in a row to win.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/Logo%20(1).png',
    path: '/games/connect-four',
    available: true,
    headerColor: 'bg-[#c4b5fd]',
    buttonColor: 'bg-[#fdba74]',
    tilt: '-rotate-1',
  },
  {
    id: 'tic-tac-toe',
    title: 'Tic Tac Toe',
    description: 'Outsmart your opponent in this classic 3x3 grid.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/original-c03c34a74dba4bb1c8010bec8c06e719.png',
    path: '/games/tic-tac-toe',
    available: true,
    headerColor: 'bg-[#f9a8d4]',
    buttonColor: 'bg-[#facc15]',
    tilt: 'rotate-1',
  },
  {
    id: 'scribble',
    title: 'Scribble',
    description: 'Draw, guess, and score points in real-time.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/scribble.png',
    path: '/games/scribble',
    available: true,
    headerColor: 'bg-[#7dd3fc]',
    buttonColor: 'bg-[#86efac]',
    tilt: '-rotate-1',
  },
  {
    id: 'snake-and-ladder',
    title: 'Snake & Ladder',
    description: 'Roll the dice, climb ladders, dodge snakes.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/sal.png',
    path: '/games/snake-and-ladder',
    available: true,
    headerColor: 'bg-[#86efac]',
    buttonColor: 'bg-[#f9a8d4]',
    tilt: 'rotate-1',
  },
  {
    id: 'tambola',
    title: 'Tambola',
    description: 'Mark numbers on your ticket and claim prizes.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/tambols.png',
    path: '/games/tambola',
    available: true,
    headerColor: 'bg-[#fecaca]',
    buttonColor: 'bg-[#7dd3fc]',
    tilt: '-rotate-1',
  },
  {
    id: 'stone-paper-scissor',
    title: 'RockPaperScissor',
    description: 'Outsmart your opponent in this classic game of hand signs.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/SPS2.png',
    path: '/games/stone-paper-scissor',
    available: true,
    headerColor: 'bg-[#fbbf24]',
    buttonColor: 'bg-[#f87171]',
    tilt: '-rotate-1',
  },
  {
    id: 'ludo',
    title: 'Ludo',
    description: 'Race your tokens home in this classic board game.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/POHAHUB/refs/heads/main/frontend/src/images/ludo.png',
    path: '/games/ludo',
    available: true,
    headerColor: 'bg-[#facc15]',
    buttonColor: 'bg-[#e5e7eb]',
    tilt: 'rotate-1',
  },
];

const SINGLE_PLAYER_GAMES = [
  {
    id: 'block-blaster',
    title: 'Block Blaster',
    description: 'Clear the board by placing and matching blocks.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/POHAHUB/refs/heads/main/frontend/src/images/block.png',
    path: '/games/block-blaster',
    available: true,
    headerColor: 'bg-[#c4b5fd]',
    buttonColor: 'bg-[#6ee7b7]',
    tilt: 'rotate-1',
  },
  {
    id: '2048',
    title: '2048',
    description: 'Slide tiles and merge them to reach the 2048 tile.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/POHAHUB/refs/heads/main/frontend/src/images/2048.png',
    path: '/games/2048',
    available: true,
    headerColor: 'bg-[#bef264]',
    buttonColor: 'bg-[#fcd34d]',
    tilt: '-rotate-1',
  },
  {
    id: 'dino',
    title: 'Dino Run',
    description: 'Jump over cacti and dodge obstacles in this endless runner.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/POHAHUB/refs/heads/main/frontend/src/images/dinorun.png',
    path: '/games/dino',
    available: true,
    headerColor: 'bg-[#93c5fd]',
    buttonColor: 'bg-[#fca5a5]',
    tilt: 'rotate-1',
  },
];

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export default function MainLanding() {
  const navigate = useNavigate();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinMode, setJoinMode] = useState('');
  const [nearbyStatus, setNearbyStatus] = useState('');
  const [gameMode, setGameMode] = useState('multiplayer');

  const handleScan = (result) => {
    if (result && result[0]) {
      try {
        const urlObj = new URL(result[0].rawValue);
        setShowJoinModal(false);
        setJoinMode('');
        navigate(urlObj.pathname + urlObj.search);
      } catch (e) {
        setNearbyStatus('INVALID QR CODE SCANNED');
      }
    }
  };

  const handleFindNearby = () => {
    setJoinMode('nearby');
    setNearbyStatus('REQUESTING GPS COORDINATES...');

    if (!navigator.geolocation) {
      setNearbyStatus('GEOLOCATION NOT SUPPORTED BY BROWSER');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setNearbyStatus('SCANNING RADAR FOR MATCHES...');
        try {
          const res = await emitWithAck('room:find_nearby', {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });

          if (res.ok && res.roomUrl) {
            setNearbyStatus('MATCH FOUND! JOINING...');
            const urlObj = new URL(res.roomUrl);
            setTimeout(() => {
              setShowJoinModal(false);
              setJoinMode('');
              navigate(urlObj.pathname + urlObj.search);
            }, 1000);
          } else {
            setNearbyStatus(res.error || 'NO NEARBY ROOMS FOUND.');
          }
        } catch (err) {
          setNearbyStatus('ERROR CONNECTING TO RADAR.');
        }
      },
      () => {
        setNearbyStatus('LOCATION PERMISSION DENIED.');
      },
      { enableHighAccuracy: true },
    );
  };

  const closeMenu = () => {
    setShowJoinModal(false);
    setJoinMode('');
    setNearbyStatus('');
  };

  const displayedGames = gameMode === 'multiplayer' ? GAMES : SINGLE_PLAYER_GAMES;

  return (
    <>
      <Helmet>
        <title>{defaultSeo.title}</title>
        <meta name="description" content={defaultSeo.description} />
        <link rel="canonical" href={absoluteUrl('/')} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="POHAHUB" />
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

        <div className="relative max-w-7xl mx-auto px-5 py-24 sm:py-28 z-10 w-full">
          <section className="mb-10 sm:mb-14 animate-sketch-pop text-center sm:text-left">
            <div className="inline-block bg-[#facc15] border-[3px] border-black shadow-[4px_4px_0px_#000] px-4 py-2 mb-6 -rotate-1">
              <span className="text-sm sm:text-base font-black uppercase tracking-widest text-black">
                Rooms, rivalries, and ridiculous comebacks
              </span>
            </div>

            <h2 className="max-w-5xl text-[clamp(3rem,8vw,6rem)] font-black uppercase leading-[0.9] tracking-normal">
              Pick a game.
              <span className="block text-pink-400">Start the room.</span>
            </h2>

            <p className="mt-6 max-w-2xl text-[clamp(1rem,2vw,1.4rem)] font-bold text-gray-700 leading-relaxed uppercase tracking-wider mb-8">
              A bright notebook arcade for quick multiplayer matches with friends.
            </p>

            <button
              onClick={() => setShowJoinModal(true)}
              className="inline-block bg-sky-300 text-black border-[4px] border-black px-8 py-4 font-black uppercase tracking-widest text-lg shadow-[6px_6px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all rotate-1"
            >
              JOIN EXISTING ROOM
            </button>
          </section>

          <div className="flex justify-center sm:justify-start gap-4 mb-8 sm:mb-12 animate-sketch-pop">
            <button
              onClick={() => setGameMode('multiplayer')}
              className={`border-[4px] border-black px-6 py-3 font-black uppercase tracking-widest text-sm sm:text-base transition-all ${
                gameMode === 'multiplayer'
                  ? 'bg-pink-400 text-black shadow-[6px_6px_0px_#000] -rotate-1 scale-105'
                  : 'bg-white text-gray-600 shadow-[2px_2px_0px_#000] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] cursor-pointer'
              }`}
            >
              Multiplayer
            </button>
            <button
              onClick={() => setGameMode('singleplayer')}
              className={`border-[4px] border-black px-6 py-3 font-black uppercase tracking-widest text-sm sm:text-base transition-all ${
                gameMode === 'singleplayer'
                  ? 'bg-lime-400 text-black shadow-[6px_6px_0px_#000] rotate-1 scale-105'
                  : 'bg-white text-gray-600 shadow-[2px_2px_0px_#000] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] cursor-pointer'
              }`}
            >
              Single Player
            </button>
          </div>

          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
            {displayedGames.map((game, index) => {
              const CardWrapper = game.available ? Link : 'div';
              const delay = `${(index + 1) * 100}ms`;

              return (
                <CardWrapper
                  key={game.id}
                  to={game.available ? game.path : undefined}
                  style={{ animationDelay: delay }}
                  className={`group animate-sketch-pop flex min-h-full flex-col bg-white border-[4px] border-black shadow-[8px_8px_0px_#000] transition-all duration-200 ${game.tilt} ${
                    game.available
                      ? 'cursor-pointer hover:-translate-y-2 hover:rotate-0 hover:shadow-[12px_12px_0px_#000]'
                      : 'cursor-not-allowed opacity-80'
                  }`}
                >
                  <div className={`${game.headerColor} border-b-[4px] border-black px-5 py-4 flex items-center justify-between`}>
                    <h3 className="text-2xl lg:text-3xl font-black uppercase tracking-widest text-black leading-none">
                      {game.title}
                    </h3>
                  </div>

                  <div className="m-5 mb-0 border-[3px] border-black bg-white shadow-[inset_2px_2px_0px_rgba(0,0,0,0.1)]">
                    <img
                      src={game.image}
                      alt={`${game.title} preview`}
                      loading="lazy"
                      className={`aspect-video w-full object-contain bg-white p-2 transition-transform duration-300 ${
                        game.available ? 'group-hover:scale-[1.05]' : 'grayscale'
                      }`}
                    />
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <p className="text-sm lg:text-base font-bold text-gray-700 leading-relaxed flex-1 uppercase tracking-wide">
                      {game.description}
                    </p>

                    {game.available ? (
                      <span className={`${game.buttonColor} text-black border-[3px] border-black shadow-[4px_4px_0px_#000] group-hover:translate-y-[2px] group-hover:translate-x-[2px] group-hover:shadow-[2px_2px_0px_#000] transition-all mt-5 inline-flex justify-center px-5 py-3 text-sm lg:text-base font-black uppercase tracking-widest rounded`}>
                        Play Now
                      </span>
                    ) : (
                      <span className="bg-gray-200 text-gray-500 border-[3px] border-gray-400 mt-5 inline-flex justify-center px-5 py-3 text-sm lg:text-base font-black uppercase tracking-widest rounded">
                        Coming Soon
                      </span>
                    )}
                  </div>
                </CardWrapper>
              );
            })}
          </section>
        </div>

        {showJoinModal && (
          <div className="fixed inset-0 z-[100] overflow-y-auto pointer-events-none">
            <div className="flex min-h-full items-start justify-center p-4 pt-20 sm:pt-24 pb-12">
              <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_#000] p-6 sm:p-8 max-w-sm w-full relative -rotate-1 pointer-events-auto">
                <button
                  onClick={closeMenu}
                  className="absolute top-4 right-4 bg-red-400 text-black border-[3px] border-black w-10 h-10 flex items-center justify-center font-black text-lg shadow-[3px_3px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[1px_1px_0px_#000] z-10 transition-all"
                  aria-label="Close"
                >
                  <CloseIcon />
                </button>

                <h2 className="text-2xl sm:text-3xl font-black uppercase mb-8 tracking-normal text-left pr-12">
                  Join Match
                </h2>

                {!joinMode && (
                  <div className="flex flex-col gap-4">
                    <button
                      onClick={() => setJoinMode('scan')}
                      className="bg-sky-300 border-[3px] border-black p-4 text-lg font-black uppercase shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all text-left flex justify-between items-center"
                    >
                      Scan QR Code
                    </button>
                    <button
                      onClick={handleFindNearby}
                      className="bg-purple-300 border-[3px] border-black p-4 text-lg font-black uppercase shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all text-left flex justify-between items-center"
                    >
                      Find Nearby
                    </button>
                  </div>
                )}

                {joinMode === 'scan' && (
                  <div className="flex flex-col items-center animate-sketch-pop">
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
                      Point Camera at Host
                    </p>
                    {nearbyStatus && (
                      <p className="text-red-500 font-black uppercase text-center mt-2">
                        {nearbyStatus}
                      </p>
                    )}
                  </div>
                )}

                {joinMode === 'nearby' && (
                  <div className="text-center py-8 animate-sketch-pop">
                    <div className="inline-block w-16 h-16 border-[6px] border-purple-200 border-t-purple-600 rounded-full animate-spin mb-6" />
                    <p className="font-black text-base sm:text-lg uppercase tracking-widest text-purple-600 px-4 leading-relaxed">
                      {nearbyStatus}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
