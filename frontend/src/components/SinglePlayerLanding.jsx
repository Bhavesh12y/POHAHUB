import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { absoluteUrl } from '../config/seo.js';
import { getPlayerName, setPlayerName } from '../lib/playerName.js';
import { gamesForMode, MODE_INFO } from '../data/games.js';
import GameCard from './GameCard.jsx';
import { NameModal } from './Modal.jsx';
import { ArrowLeftIcon, BotIcon, PencilIcon, PlayIcon } from './Icons.jsx';
import useHydrated from '../lib/useHydrated.js';

const TABS = [
  { id: 'solo', label: 'Arcade', Icon: PlayIcon, color: 'bg-lime-300' },
  { id: 'bot', label: 'vs Bot', Icon: BotIcon, color: 'bg-[#a9def9]' },
];

export default function SinglePlayerLanding() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [playerName, setPlayerNameState] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);

  const hydrated = useHydrated();
  const mode = hydrated && searchParams.get('mode') === 'bot' ? 'bot' : 'solo';
  const games = gamesForMode(mode);

  useEffect(() => {
    setPlayerNameState(getPlayerName());
  }, []);

  const handleSaveName = (name) => {
    setPlayerName(name);
    setPlayerNameState(name);
    setShowNameModal(false);
  };

  const selectMode = (next) => {
    setSearchParams(next === 'solo' ? {} : { mode: next }, { replace: true, preventScrollReset: true });
  };

  return (
    <>
      <Helmet>
        <title>Single Player Games and Bots | Doozles</title>
        <meta
          name="description"
          content="Play free single-player browser games on Doozles: 2048, Block Blaster, Dino Run, Flappy Bird, Traffic Run and 3D Helix Jump, or challenge bots at Ludo, Connect 4, Tic Tac Toe and Air Hockey."
        />
        <link rel="canonical" href={absoluteUrl('/single-player')} />
      </Helmet>

      <div className="relative min-h-screen overflow-hidden font-sans text-black">
        <div className="relative max-w-7xl mx-auto px-5 py-24 sm:py-28 z-10 w-full">
          <section className="mb-10 sm:mb-12 animate-sketch-pop text-center sm:text-left">
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-white text-black border-[3px] border-black px-4 py-2 mb-6 shadow-[3px_3px_0px_#000] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_#000] font-black uppercase tracking-widest text-sm transition-all"
            >
              <ArrowLeftIcon /> Back to Multiplayer
            </Link>
            <h1 className="max-w-5xl text-[clamp(3rem,8vw,6rem)] font-black uppercase leading-[0.9] tracking-normal">
              Go Solo.
              <span className="block text-pink-400">{mode === 'bot' ? 'Beat the Bots.' : 'Beat High Scores.'}</span>
            </h1>
          </section>

          {playerName && (
            <div className="flex justify-center sm:justify-start items-center gap-3 mb-8 animate-sketch-pop">
              <p className="text-2xl sm:text-3xl font-black uppercase tracking-normal text-black bg-[#a9def9] border-[3px] border-black px-4 py-1 shadow-[4px_4px_0px_#000] -rotate-1">
                hi.. {playerName}
              </p>
              <button
                onClick={() => setShowNameModal(true)}
                className="bg-[#facc15] text-black border-[3px] border-black p-2 shadow-[3px_3px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[1px_1px_0px_#000] transition-all rotate-2"
                aria-label="Edit name"
              >
                <PencilIcon />
              </button>
            </div>
          )}

          <div className="flex flex-wrap justify-center sm:justify-start gap-3 mb-4 animate-sketch-pop">
            {TABS.map(({ id, label, Icon, color }) => (
              <button
                key={id}
                type="button"
                onClick={() => selectMode(id)}
                aria-pressed={mode === id}
                className={`inline-flex items-center gap-2 border-[3px] border-black px-4 py-2 font-black uppercase tracking-wider text-xs sm:text-sm transition-all ${
                  mode === id
                    ? `${color} shadow-[4px_4px_0px_#000] -rotate-1`
                    : 'bg-white text-gray-600 shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#000]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
          <p className="font-body text-base font-semibold text-gray-700 mb-8 sm:mb-12 max-w-2xl text-center sm:text-left mx-auto sm:mx-0">
            {mode === 'bot'
              ? 'Classic board and table games against a computer opponent. Pick easy, medium or hard before you start.'
              : 'Quick arcade runs with a personal best saved on this device and a global top three.'}
          </p>

          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
            {games.map((game, index) => (
              <GameCard
                key={`${mode}-${game.id}`}
                game={game}
                index={index}
                to={MODE_INFO[mode].path(game)}
                badge={mode === 'bot' ? 'vs Bot' : null}
                cta={mode === 'bot' ? 'Challenge' : 'Play Now'}
              />
            ))}
          </section>
        </div>

        <NameModal
          open={showNameModal}
          onClose={() => setShowNameModal(false)}
          onSave={handleSaveName}
          initialName={playerName}
          heading="Update Name"
        />
      </div>
    </>
  );
}
