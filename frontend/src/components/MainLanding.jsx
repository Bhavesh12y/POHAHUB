import { Link } from 'react-router-dom';

const GAMES = [
  {
    id: 'connect-four',
    title: 'Connect 4',
    description: 'Drop discs and connect four in a row to win.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/Logo%20(1).png',
    path: '/games/connect-four',
    available: true,
    headerColor: 'bg-violet-300',
    buttonColor: 'bg-orange-300',
    tilt: '-rotate-1',
  },
  {
    id: 'tic-tac-toe',
    title: 'Tic Tac Toe',
    description: 'Outsmart your opponent in this classic 3x3 grid.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/original-c03c34a74dba4bb1c8010bec8c06e719.png',
    path: '/games/tic-tac-toe',
    available: true,
    headerColor: 'bg-pink-300',
    buttonColor: 'bg-yellow-300',
    tilt: 'rotate-1',
  },
  {
    id: 'scribble',
    title: 'Scribble',
    description: 'Draw, guess, and score points in real-time.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/scribble.png',
    path: '/games/scribble',
    available: true,
    headerColor: 'bg-sky-300',
    buttonColor: 'bg-green-300',
    tilt: '-rotate-1',
  },
  {
    id: 'snake-and-ladder',
    title: 'Snake & Ladder',
    description: 'Roll the dice, climb ladders, dodge snakes.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/sal.png',
    path: '/games/snake-and-ladder',
    available: true,
    headerColor: 'bg-green-300',
    buttonColor: 'bg-pink-300',
    tilt: 'rotate-1',
  },
  {
    id: 'tambola',
    title: 'Tambola',
    description: 'Mark numbers on your ticket and claim prizes.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/tambols.png',
    path: '/games/tambola',
    available: true,
    headerColor: 'bg-red-200',
    buttonColor: 'bg-sky-300',
    tilt: '-rotate-1',
  },
  {
    id: 'ludo',
    title: 'Ludo',
    description: 'Race your tokens home in this classic board game.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/Logo%20(1).png',
    path: '/games/ludo',
    available: false,
    headerColor: 'bg-yellow-300',
    buttonColor: 'bg-gray-200',
    tilt: 'rotate-1',
  },
];

export default function MainLanding() {
  return (
    <div className="relative min-h-screen text-ink overflow-hidden font-sketch">
      <style>{`
        @keyframes sketch-pop {
          0% {
            opacity: 0;
            transform: translateY(24px) rotate(-1deg);
          }
          100% {
            opacity: 1;
            transform: translateY(0) rotate(0deg);
          }
        }

        .animate-sketch-pop {
          animation: sketch-pop 0.55s ease-out forwards;
          opacity: 0;
        }
      `}</style>

      <div className="relative max-w-6xl mx-auto px-5 py-14 sm:py-20 z-10">
        <section className="mb-12 sm:mb-16 animate-sketch-pop">
          <div className="inline-block sketch-border bg-yellow-300 px-4 py-2 mb-5 -rotate-1">
            <span className="text-sm sm:text-base font-black uppercase">
              Rooms, rivalries, and ridiculous comebacks
            </span>
          </div>

          <h2 className="max-w-4xl text-5xl sm:text-7xl md:text-8xl font-black uppercase leading-[0.95] tracking-normal">
            Pick a game.
            <span className="block text-pink-600">Start the room.</span>
          </h2>

          <p className="mt-6 max-w-2xl text-lg sm:text-2xl font-bold text-gray-800 leading-relaxed">
            A bright notebook arcade for quick multiplayer matches with friends.
          </p>
        </section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {GAMES.map((game, index) => {
            const CardWrapper = game.available ? Link : 'div';
            const delay = `${(index + 1) * 90}ms`;

            return (
              <CardWrapper
                key={game.id}
                to={game.available ? game.path : undefined}
                style={{ animationDelay: delay }}
                className={`group animate-sketch-pop sketch-border flex min-h-full flex-col overflow-hidden bg-white transition-transform duration-200 ${game.tilt} ${
                  game.available
                    ? 'cursor-pointer hover:-translate-y-1 hover:rotate-0'
                    : 'cursor-not-allowed opacity-70'
                }`}
              >
                <div className={`${game.headerColor} border-b-[3px] border-black px-5 py-4`}>
                  <h3 className="text-3xl font-black uppercase leading-none">{game.title}</h3>
                </div>

                <div className="m-5 mb-0 border-[3px] border-black bg-[#fdfdfd]">
                  <img
                    src={game.image}
                    alt={`${game.title} preview`}
                    className={`h-44 w-full object-cover transition-transform duration-200 ${
                      game.available ? 'group-hover:scale-[1.03]' : ''
                    }`}
                  />
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <p className="text-base font-bold text-gray-800 leading-relaxed flex-1">
                    {game.description}
                  </p>

                  {game.available ? (
                    <span className={`sketch-button ${game.buttonColor} mt-5 inline-flex justify-center px-5 py-2 text-sm`}>
                      Play Now
                    </span>
                  ) : (
                    <span className="sketch-border mt-5 inline-flex justify-center bg-gray-200 px-5 py-2 text-sm font-black uppercase">
                      Coming Soon
                    </span>
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
