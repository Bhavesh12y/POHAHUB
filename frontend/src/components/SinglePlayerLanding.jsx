import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { absoluteUrl } from '../config/seo.js';

// Paste your SINGLE_PLAYER_GAMES array here
const SINGLE_PLAYER_GAMES = [
  // ... (Keep your SINGLE_PLAYER_GAMES array the same)
  {
    id: 'block-blaster',
    title: 'Block Blaster',
    description: 'Clear the board by placing and matching blocks.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/pohahub/refs/heads/main/frontend/src/images/block.png',
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
    image: 'https://raw.githubusercontent.com/Bhavesh12y/pohahub/refs/heads/main/frontend/src/images/2048.png',
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
    image: 'https://raw.githubusercontent.com/Bhavesh12y/pohahub/refs/heads/main/frontend/src/images/dinorun.png',
    path: '/games/dino',
    available: true,
    headerColor: 'bg-[#93c5fd]',
    buttonColor: 'bg-[#fca5a5]',
    tilt: 'rotate-1',
  },
  {

  id: 'flappy-bird',
    title: 'Flappy Bird',
    description: 'Navigate through pipes in this challenging arcade game.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/pohahub/refs/heads/main/frontend/src/images/flappy.jpg',
    path: '/games/flappy-bird',
    available: true,
    headerColor: 'bg-[#93c5fd]',
    buttonColor: 'bg-[#fca5a5]',
    tilt: 'rotate-1',
  },

    {
    id: 'traffic-run',
    title: 'Traffic Run',
    description: 'Dodge cars in a 3-lane dash. Speed increases as you go!',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/traffic.png', // Replace with an actual thumbnail link if you have one
    path: '/games/traffic-run',
    available: true,
    headerColor: 'bg-[#ffb5a7]', // Uses one of your pastel theme colors
    buttonColor: 'bg-[#a9def9]', // Uses one of your pastel theme colors
    tilt: '-rotate-1',
  },
   {

  id: 'helix-jump',
    title: 'Helix Jump',
    description: 'Jump through the helix in this challenging arcade game.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/pohahub/refs/heads/main/frontend/src/images/helix.jpg',
    path: '/games/helix-jump',
    available: true,
    headerColor: 'bg-[#93c5fd]',
    buttonColor: 'bg-[#fca5a5]',
    tilt: 'rotate-1',
  },

];

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

export default function SinglePlayerLanding() {
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('Doozles-player-name') || '');
  const [showNameModal, setShowNameModal] = useState(false);
  const [playerNameInput, setPlayerNameInput] = useState(playerName);

  const handleSaveName = (e) => {
    e.preventDefault();
    if (playerNameInput.trim()) {
      const newName = playerNameInput.trim();
      localStorage.setItem('Doozles-player-name', newName);
      setPlayerName(newName);
      setShowNameModal(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Single Player Games | Doozles</title>
        <meta name="description" content="Play fun single-player games like 2048, Dino Run, and Block Blaster on Doozles." />
        <link rel="canonical" href={absoluteUrl('/single-player')} />
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
            <Link to="/" className="inline-block bg-white text-black border-[3px] border-black px-4 py-2 mb-6 shadow-[3px_3px_0px_#000] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_#000] font-black uppercase tracking-widest text-sm transition-all">
              ← Back to Multiplayer
            </Link>
            <h2 className="max-w-5xl text-[clamp(3rem,8vw,6rem)] font-black uppercase leading-[0.9] tracking-normal">
              Go Solo.
              <span className="block text-pink-400">Beat High Scores.</span>
            </h2>
          </section>

          {playerName && (
            <div className="flex justify-center sm:justify-start items-center gap-3 mb-8 animate-sketch-pop">
              <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-normal text-black bg-[#a9def9] border-[3px] border-black px-4 py-1 shadow-[4px_4px_0px_#000] -rotate-1">
                hi.. {playerName}
              </h3>
              <button
                onClick={() => setShowNameModal(true)}
                className="bg-[#facc15] text-black border-[3px] border-black p-2 shadow-[3px_3px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[1px_1px_0px_#000] transition-all rotate-2"
              >
                <PencilIcon />
              </button>
            </div>
          )}

          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
            {SINGLE_PLAYER_GAMES.map((game, index) => {
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
                      className={`aspect-video w-full object-contain bg-white p-2 transition-transform duration-300 group-hover:scale-[1.05]`}
                    />
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <p className="text-sm lg:text-base font-bold text-gray-700 leading-relaxed flex-1 uppercase tracking-wide">
                      {game.description}
                    </p>

                    <span className={`${game.buttonColor} text-black border-[3px] border-black shadow-[4px_4px_0px_#000] group-hover:translate-y-[2px] group-hover:translate-x-[2px] group-hover:shadow-[2px_2px_0px_#000] transition-all mt-5 inline-flex justify-center px-5 py-3 text-sm lg:text-base font-black uppercase tracking-widest rounded`}>
                      Play Now
                    </span>
                  </div>
                </CardWrapper>
              );
            })}
          </section>
        </div>

        {/* Modal for editing name on the Single Player page */}
        {showNameModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
             {/* Use the exact same name modal markup you have in MainLanding here */}
             <div className="bg-[#a9def9] border-[4px] border-black shadow-[8px_8px_0px_#000] p-6 sm:p-8 max-w-sm w-full relative rotate-1 animate-sketch-pop pointer-events-auto">
              <button onClick={() => setShowNameModal(false)} className="absolute top-4 right-4 bg-white text-black border-[3px] border-black w-8 h-8 flex items-center justify-center font-black text-lg shadow-[2px_2px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[0px_0px_0px_#000] transition-all">X</button>
              <h2 className="text-2xl font-black uppercase mb-4 tracking-normal text-left">Update Name</h2>
              <form onSubmit={handleSaveName} className="flex flex-col gap-4">
                <input type="text" maxLength={12} value={playerNameInput} onChange={(e) => setPlayerNameInput(e.target.value)} className="w-full border-[3px] border-black px-4 py-3 font-black uppercase text-lg focus:outline-none focus:shadow-[4px_4px_0_0_#000] transition-shadow" autoFocus />
                <button type="submit" disabled={!playerNameInput.trim()} className="bg-[#facc15] disabled:opacity-50 text-black border-[3px] border-black px-6 py-3 font-black uppercase tracking-widest text-lg shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all">Save!</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}