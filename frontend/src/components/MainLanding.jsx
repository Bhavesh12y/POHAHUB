import { Link } from 'react-router-dom';

const GAMES = [
  {
    id: 'connect-four',
    title: 'Connect 4',
    description: 'Drop discs and connect four in a row to win.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/Logo%20(1).png',
    path: '/games/connect-four',
    available: true,
    headerColor: 'bg-[#c4b5fd]', // violet-300
    buttonColor: 'bg-[#fdba74]', // orange-300
    tilt: '-rotate-1',
  },
  {
    id: 'tic-tac-toe',
    title: 'Tic Tac Toe',
    description: 'Outsmart your opponent in this classic 3x3 grid.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/original-c03c34a74dba4bb1c8010bec8c06e719.png',
    path: '/games/tic-tac-toe',
    available: true,
    headerColor: 'bg-[#f9a8d4]', // pink-300
    buttonColor: 'bg-[#facc15]', // yellow-300
    tilt: 'rotate-1',
  },
  {
    id: 'scribble',
    title: 'Scribble',
    description: 'Draw, guess, and score points in real-time.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/scribble.png',
    path: '/games/scribble',
    available: true,
    headerColor: 'bg-[#7dd3fc]', // sky-300
    buttonColor: 'bg-[#86efac]', // green-300
    tilt: '-rotate-1',
  },
  {
    id: 'snake-and-ladder',
    title: 'Snake & Ladder',
    description: 'Roll the dice, climb ladders, dodge snakes.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/sal.png',
    path: '/games/snake-and-ladder',
    available: true,
    headerColor: 'bg-[#86efac]', // green-300
    buttonColor: 'bg-[#f9a8d4]', // pink-300
    tilt: 'rotate-1',
  },
  {
    id: 'tambola',
    title: 'Tambola',
    description: 'Mark numbers on your ticket and claim prizes.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/tambols.png',
    path: '/games/tambola',
    available: true,
    headerColor: 'bg-[#fecaca]', // red-200
    buttonColor: 'bg-[#7dd3fc]', // sky-300
    tilt: '-rotate-1',
  },
  {
    id: 'ludo',
    title: 'Ludo',
    description: 'Race your tokens home in this classic board game.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/Logo%20(1).png',
    path: '/games/ludo',
    available: false,
    headerColor: 'bg-[#facc15]', // yellow-300
    buttonColor: 'bg-[#e5e7eb]', // gray-200
    tilt: 'rotate-1',
  },
];

export default function MainLanding() {
  return (
    <div className="relative min-h-screen overflow-hidden font-sans text-black">
      <style>{`
        @keyframes sketch-pop {
          0% {
            opacity: 0;
            transform: translateY(30px) rotate(-3deg) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) rotate(0deg) scale(1);
          }
        }

        .animate-sketch-pop {
          animation: sketch-pop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          opacity: 0;
        }
      `}</style>

      <div className="relative max-w-7xl mx-auto px-5 py-14 sm:py-20 z-10 w-full">
        <section className="mb-12 sm:mb-16 animate-sketch-pop text-center sm:text-left">
          
          {/* Top Yellow Tag */}
          <div className="inline-block bg-[#facc15] border-[3px] border-black shadow-[4px_4px_0px_#000] px-4 py-2 mb-6 -rotate-1">
            <span className="text-sm sm:text-base font-black uppercase tracking-widest text-black">
              Rooms, rivalries, and ridiculous comebacks
            </span>
          </div>

          <h2 className="max-w-5xl text-[clamp(3rem,8vw,6rem)] font-black uppercase leading-[0.9] tracking-tighter">
            Pick a game.
            <span   className="block text-pink-400" >  Start the room.
</span>
          </h2>

          <p className="mt-6 max-w-2xl text-[clamp(1rem,2vw,1.4rem)] font-bold text-gray-700 leading-relaxed uppercase tracking-wider">
            A bright notebook arcade for quick multiplayer matches with friends.
          </p>
        </section>

        {/* THE FIX: 
          Changed from "xl:grid-cols-3" to "lg:grid-cols-3". 
          This forces 3 cards per row on almost all laptops, even when scaled.
        */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
          {GAMES.map((game, index) => {
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
                {/* Card Header */}
                <div className={`${game.headerColor} border-b-[4px] border-black px-5 py-4 flex items-center justify-between`}>
                  <h3 className="text-2xl lg:text-3xl font-black uppercase tracking-widest text-black leading-none">{game.title}</h3>
                </div>

                {/* Card Image */}
                <div className="m-5 mb-0 border-[3px] border-black bg-white shadow-[inset_2px_2px_0px_rgba(0,0,0,0.1)]">
                  <img
                    src={game.image}
                    alt={`${game.title} preview`}
                    className={`aspect-video w-full object-cover transition-transform duration-300 ${
                      game.available ? 'group-hover:scale-[1.05]' : 'grayscale'
                    }`}
                  />
                </div>

                {/* Card Body & Button */}
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
    </div>
  );
}