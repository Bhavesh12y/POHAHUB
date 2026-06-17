import { Link } from 'react-router-dom';

const GAMES = [
  {
    id: 'connect-four',
    title: 'Connect 4',
    description: 'Drop discs and connect four in a row to win.',
    icon: '🔴',
    path: '/games/connect-four',
    available: true,
    gradient: 'from-red-500/20 to-yellow-500/20',
    accent: 'border-red-500/40 hover:border-red-400',
  },
  {
    id: 'snake-and-ladder',
    title: 'Snake & Ladder',
    description: 'Roll the dice, climb ladders, dodge snakes.',
    icon: '🐍',
    path: '/games/snake-and-ladder',
    available: false,
    gradient: 'from-green-500/20 to-emerald-500/20',
    accent: 'border-green-500/40',
  },
  {
    id: 'ludo',
    title: 'Ludo',
    description: 'Race your tokens home in this classic board game.',
    icon: '🎲',
    path: '/games/ludo',
    available: false,
    gradient: 'from-blue-500/20 to-cyan-500/20',
    accent: 'border-blue-500/40',
  },
  {
    id: 'tambola',
    title: 'Tambola',
    description: 'Mark numbers on your ticket and claim prizes.',
    icon: '🎱',
    path: '/games/tambola',
    available: false,
    gradient: 'from-purple-500/20 to-pink-500/20',
    accent: 'border-purple-500/40',
  },
];

export default function MainLanding() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-hub-accent/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-hub-glow/10 rounded-full blur-3xl animate-pulse-slow" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-16">
        <section className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-hub-card border border-hub-border text-sm text-hub-muted mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live multiplayer · Server-authoritative
          </div>

          <h2 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight">
            Play Together,
            <span className="block bg-gradient-to-r from-hub-accent via-hub-glow to-pink-400 bg-clip-text text-transparent">
              Anywhere
            </span>
          </h2>

          <p className="text-lg text-hub-muted max-w-2xl mx-auto">
            Choose a game, create a room, share the code with friends, and jump into real-time
            matches. The server validates every move — no cheating, just fun.
          </p>
        </section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {GAMES.map((game) => {
            const CardWrapper = game.available ? Link : 'div';

            return (
              <CardWrapper
                key={game.id}
                to={game.available ? game.path : undefined}
                className={`glass-card p-6 flex flex-col transition-all duration-300 border ${game.accent} ${
                  game.available
                    ? 'hover:scale-[1.03] hover:shadow-glow cursor-pointer'
                    : 'opacity-60 cursor-not-allowed'
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${game.gradient} flex items-center justify-center text-2xl mb-4`}
                >
                  {game.icon}
                </div>

                <h3 className="text-lg font-bold mb-2">{game.title}</h3>
                <p className="text-sm text-hub-muted flex-1">{game.description}</p>

                <div className="mt-4 pt-4 border-t border-hub-border">
                  {game.available ? (
                    <span className="text-sm font-semibold text-hub-accent">Play Now →</span>
                  ) : (
                    <span className="text-sm text-hub-muted">Coming Soon</span>
                  )}
                </div>
              </CardWrapper>
            );
          })}
        </section>
      </div>
    </div>
  );
}
