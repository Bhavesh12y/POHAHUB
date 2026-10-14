import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getGame } from '../data/games.js';
import { getPlayerName } from '../lib/playerName.js';
import { setSocketOverride } from '../lib/socket.js';
import { createLocalSocket, LOCAL_ROOM_CODE } from '../lib/localRoom.js';
import { GameSessionContext } from '../lib/gameSession.js';
import { ArrowLeftIcon, BotIcon, DeviceIcon } from '../components/Icons.jsx';
import NotFoundPage from './NotFoundPage.jsx';

const BOARDS = {
  'tic-tac-toe': lazy(() => import('../games/tictactoe/TicTacToeBoard.jsx')),
  'connect-four': lazy(() => import('../games/connect-four/Board.jsx')),
  'stone-paper-scissor': lazy(() => import('../games/stone-paper-scissor/Board.jsx')),
  'snake-and-ladder': lazy(() => import('../games/snake-and-ladder/board.jsx')),
  ludo: lazy(() => import('../games/ludo/Board.jsx')),
};
const AirHockeyLocal = lazy(() => import('../games/air-hockey/AirHockeyLocal.jsx'));

// Per-game setup rules.
const SETUP = {
  'tic-tac-toe': { min: 2, max: 2, difficulty: true },
  'connect-four': { min: 2, max: 2, difficulty: true },
  'stone-paper-scissor': { min: 2, max: 2, difficulty: true, hiddenChoices: true },
  'snake-and-ladder': { min: 2, max: 4, difficulty: false },
  ludo: { min: 2, max: 4, difficulty: true },
  'air-hockey': { min: 2, max: 2, difficulty: true },
};

const DIFFICULTIES = [
  { id: 'easy', label: 'Easy', color: 'bg-[#86efac]' },
  { id: 'medium', label: 'Medium', color: 'bg-[#fde047]' },
  { id: 'hard', label: 'Hard', color: 'bg-[#fca5a5]' },
];

const BOT_NAMES = ['Chintu Bot', 'Pinky Bot', 'Golu Bot'];

function Loading() {
  return (
    <div className="text-center py-24 font-black uppercase tracking-widest text-xl animate-pulse">Loading...</div>
  );
}

function ChoiceButton({ active, onClick, children, color = 'bg-[#fde047]' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 min-w-[80px] border-[3px] border-black px-4 py-3 font-black uppercase tracking-wider text-sm transition-all ${
        active ? `${color} shadow-[4px_4px_0px_#000] -rotate-1` : 'bg-white shadow-[2px_2px_0px_#000] hover:-translate-y-0.5'
      }`}
    >
      {children}
    </button>
  );
}

function SetupScreen({ game, mode, rules, onStart }) {
  const isBot = mode === 'bot';
  const [count, setCount] = useState(rules.min);
  const [difficulty, setDifficulty] = useState('medium');
  const [names, setNames] = useState(['', '', '', '']);

  useEffect(() => {
    const saved = getPlayerName();
    setNames((prev) => [saved || '', prev[1], prev[2], prev[3]]);
  }, []);

  const humans = isBot ? 1 : count;
  const countLabel = isBot ? 'Number of bots' : 'Number of players';
  const countOptions = isBot
    ? Array.from({ length: rules.max - 1 }, (_, i) => i + 1)
    : Array.from({ length: rules.max - rules.min + 1 }, (_, i) => rules.min + i);

  const start = (e) => {
    e.preventDefault();
    const players = [];
    for (let i = 0; i < humans; i++) {
      players.push({ id: `p${i + 1}`, name: names[i].trim() || `Player ${i + 1}` });
    }
    if (isBot) {
      const bots = rules.max > 2 ? count : 1;
      for (let i = 0; i < bots; i++) {
        const name = rules.max > 2 ? BOT_NAMES[i] : `Bot (${difficulty})`;
        players.push({ id: `bot${i + 1}`, name, isBot: true });
      }
    }
    onStart({ players, difficulty });
  };

  return (
    <div className="max-w-xl mx-auto px-5 py-12">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-white border-[3px] border-black px-4 py-1.5 shadow-[3px_3px_0px_#000] -rotate-1 mb-5 font-black uppercase tracking-widest text-sm">
          {isBot ? <BotIcon /> : <DeviceIcon />} {isBot ? 'vs Bot' : 'Local · One device'}
        </div>
        <h1 className="text-[clamp(2.25rem,6vw,3.5rem)] font-black uppercase leading-none">{game.title}</h1>
        <p className="font-body text-base font-semibold text-gray-700 mt-4">
          {isBot
            ? 'Play against the computer. Same rules as online, and no internet needed once it has loaded.'
            : 'Everyone plays on this device. Hand it to the next player when the board shows their name.'}
        </p>
      </div>

      <form onSubmit={start} className="bg-white border-[4px] border-black shadow-[10px_10px_0px_#000] p-6 sm:p-8 space-y-7 -rotate-[0.5deg]">
        {rules.max > 2 && (
          <fieldset>
            <legend className="block text-sm font-black tracking-widest uppercase mb-3">{countLabel}</legend>
            <div className="flex gap-3">
              {countOptions.map((n) => (
                <ChoiceButton key={n} active={count === n} onClick={() => setCount(n)}>
                  {n}
                </ChoiceButton>
              ))}
            </div>
          </fieldset>
        )}

        {isBot && rules.difficulty && (
          <fieldset>
            <legend className="block text-sm font-black tracking-widest uppercase mb-3">Difficulty</legend>
            <div className="flex gap-3">
              {DIFFICULTIES.map((d) => (
                <ChoiceButton key={d.id} active={difficulty === d.id} onClick={() => setDifficulty(d.id)} color={d.color}>
                  {d.label}
                </ChoiceButton>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className="space-y-3">
          <legend className="block text-sm font-black tracking-widest uppercase mb-3">
            {humans > 1 ? 'Player names' : 'Your name'}
          </legend>
          {Array.from({ length: humans }, (_, i) => (
            <input
              key={i}
              type="text"
              maxLength={12}
              value={names[i]}
              placeholder={`Player ${i + 1}`}
              aria-label={`Player ${i + 1} name`}
              onChange={(e) => setNames((prev) => prev.map((n, idx) => (idx === i ? e.target.value : n)))}
              className="w-full px-4 py-3 bg-white border-[3px] border-black font-black uppercase focus:outline-none focus:shadow-[4px_4px_0_0_#000] transition-shadow"
            />
          ))}
        </fieldset>

        <button
          type="submit"
          className="w-full py-4 bg-[#facc15] text-black font-black tracking-widest uppercase text-lg border-[3px] border-black shadow-[6px_6px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all"
        >
          Start Game
        </button>
      </form>

      <div className="text-center mt-8">
        <Link to={game.guidePath} className="font-black uppercase text-sm underline decoration-[3px] decoration-pink-400 underline-offset-4">
          Read the {game.title} rules
        </Link>
      </div>
    </div>
  );
}

function HandoffOverlay({ name, onReady }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-[#fdfdfd]">
      <div className="text-center max-w-sm">
        <p className="font-body font-semibold text-gray-600 mb-3">No peeking! Pass the device to</p>
        <p className="text-5xl font-black uppercase mb-8 bg-[#fde047] border-[4px] border-black shadow-[6px_6px_0px_#000] px-6 py-3 -rotate-2 inline-block">
          {name}
        </p>
        <button
          type="button"
          onClick={onReady}
          className="block w-full bg-[#7dd3fc] border-[4px] border-black px-6 py-4 font-black uppercase tracking-widest shadow-[6px_6px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all"
        >
          I&apos;m {name}, show my turn
        </button>
      </div>
    </div>
  );
}

export default function LocalGamePage({ mode }) {
  const { gameId } = useParams();
  const game = getGame(gameId);
  const rules = SETUP[gameId];
  const [session, setSession] = useState(null);
  const [handoff, setHandoff] = useState(null);
  const socketRef = useRef(null);

  const exitPath = mode === 'bot' ? '/?mode=bot' : '/?mode=local';

  // Tear down the in-browser server when leaving the page.
  useEffect(
    () => () => {
      setSocketOverride(null);
      socketRef.current?.destroy();
    },
    [],
  );

  const helmet = useMemo(
    () => (
      <Helmet>
        <title>{`${game?.title ?? 'Game'} ${mode === 'bot' ? 'vs Bot' : 'Local Play'} | Doozles`}</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>
    ),
    [game?.title, mode],
  );

  if (!game || !rules || !game.modes.includes(mode)) return <NotFoundPage />;

  const start = ({ players, difficulty }) => {
    const label = mode === 'bot' ? (rules.difficulty ? `vs Bot · ${difficulty}` : 'vs Bot') : 'Local game';
    const playerName = players[0].name;

    if (gameId !== 'air-hockey') {
      socketRef.current?.destroy();
      const fake = createLocalSocket({
        gameType: gameId,
        mode,
        players,
        difficulty,
        onViewerChange: ({ viewerId }) => {
          if (mode === 'local' && rules.hiddenChoices) {
            setHandoff(players.find((p) => p.id === viewerId)?.name ?? null);
          }
        },
      });
      socketRef.current = fake;
      setSocketOverride(fake);
    }

    setSession({ mode, roomCode: LOCAL_ROOM_CODE, playerName, label, exitPath, players, difficulty });
  };

  if (!session) {
    return (
      <>
        {helmet}
        <SetupScreen game={game} mode={mode} rules={rules} onStart={start} />
      </>
    );
  }

  const Board = BOARDS[gameId];

  return (
    <>
      {helmet}
      <div className="max-w-[1600px] mx-auto px-4 pt-6">
        <Link
          to={exitPath}
          className="inline-flex items-center gap-2 bg-white border-[3px] border-black px-3 py-1.5 font-black uppercase text-xs tracking-widest shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] transition-all"
        >
          <ArrowLeftIcon /> Change game
        </Link>
      </div>
      <Suspense fallback={<Loading />}>
        {gameId === 'air-hockey' ? (
          <AirHockeyLocal
            mode={mode}
            difficulty={session.difficulty}
            names={session.players.map((p) => p.name)}
            exitPath={exitPath}
          />
        ) : (
          <GameSessionContext.Provider value={session}>
            <Board />
          </GameSessionContext.Provider>
        )}
      </Suspense>
      {handoff && <HandoffOverlay name={handoff} onReady={() => setHandoff(null)} />}
    </>
  );
}
