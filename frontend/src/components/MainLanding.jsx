import { Link } from 'react-router-dom';

const GAMES = [
  {
    id: 'connect-four',
    title: 'Connect 4',
    description: 'Drop discs and connect four in a row to win.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/Logo%20(1).png',
    path: '/games/connect-four',
    available: true,
    accent: 'hover:border-gray-300/40 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]',
  },
  {
    id: 'tic-tac-toe',
    title: 'Tic Tac Toe',
    description: 'Outsmart your opponent in this classic 3x3 grid.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/Logo%20(1).png', // Replace with actual preview image later
    path: '/games/tic-tac-toe',
    available: true, // Set to false if it is under development
    accent: 'hover:border-gray-300/40 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]',
  },
  {
    id: 'snake-and-ladder',
    title: 'Snake & Ladder',
    description: 'Roll the dice, climb ladders, dodge snakes.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/Logo%20(1).png',
    path: '/games/snake-and-ladder',
    available: false,
    accent: 'hover:border-gray-500/20',
  },
  {
    id: 'ludo',
    title: 'Ludo',
    description: 'Race your tokens home in this classic board game.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/Logo%20(1).png',
    path: '/games/ludo',
    available: false,
    accent: 'hover:border-gray-500/20',
  },
  {
    id: 'tambola',
    title: 'Tambola',
    description: 'Mark numbers on your ticket and claim prizes.',
    image: 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/Logo%20(1).png',
    path: '/games/tambola',
    available: false,
    accent: 'hover:border-gray-500/20',
  },
];

export default function MainLanding() {
  return (
    <div className="relative min-h-screen text-gray-200 overflow-hidden font-sans">
      
      {/* --- INJECTED CSS FOR ENTRANCE ANIMATIONS --- */}
      <style>{`
        @keyframes float-in {
          0% {
            opacity: 0;
            transform: translateY(40px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-float-in {
          animation: float-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0; /* Keeps it hidden until the animation starts */
        }
      `}</style>

      <div className="relative max-w-6xl mx-auto px-6 py-24 z-10">
        
        {/* Hero Section - Floats in first */}
        <section className="text-center mb-20 animate-float-in">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs font-medium text-gray-400 mb-8 backdrop-blur-md shadow-xl">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse" />
            Feel Free To RageBait, We Won't Judge!
          </div>

          <h2 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tighter text-white drop-shadow-2xl">
            Play Together,
            <span className="block mt-2 bg-gradient-to-r from-gray-100 via-gray-400 to-gray-600 bg-clip-text text-transparent pb-2">
              Anywhere.
            </span>
          </h2>

          <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed font-light">
            Choose a game, create a room, share the code with friends, and jump into real-time
            matches.
          </p>
        </section>

        {/* Cards Section - Staggered floating entrance */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {GAMES.map((game, index) => {
            const CardWrapper = game.available ? Link : 'div';
            
            // Calculate a staggered delay for each card (e.g., 150ms, 300ms, 450ms...)
            const delay = `${(index + 1) * 150}ms`;

            return (
              <CardWrapper
                key={game.id}
                to={game.available ? game.path : undefined}
                style={{ animationDelay: delay }}
                className={`group animate-float-in relative flex flex-col bg-[#0a0a0c]/80 backdrop-blur-md border border-white/[0.05] rounded-2xl overflow-hidden transition-all duration-500 ease-out ${
                  game.accent
                } ${
                  game.available
                    ? 'hover:-translate-y-2 cursor-pointer'
                    : 'opacity-60 cursor-not-allowed grayscale'
                }`}
              >
                {/* Image Section */}
                <div className="relative h-48 w-full overflow-hidden bg-[#111]">
                  {/* Vignette Gradient to blend image into background */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/20 to-transparent z-10" />
                  
                  <img 
                    src={game.image} 
                    alt={`${game.title} preview`}
                    className={`w-full h-full object-cover transition-transform duration-700 ease-out z-0 ${
                      game.available ? 'group-hover:scale-110' : ''
                    }`}
                  />
                </div>

                {/* Content Section */}
                <div className="relative z-20 p-6 flex flex-col flex-1 -mt-4">
                  <h3 className="text-xl font-bold mb-2 text-gray-100 tracking-wide">{game.title}</h3>
                  <p className="text-sm text-gray-500 flex-1 leading-relaxed font-light">
                    {game.description}
                  </p>

                  <div className="mt-6 pt-5 border-t border-white/[0.05] flex items-center justify-between">
                    {game.available ? (
                      <>
                        <span className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors duration-300">
                          Play Now
                        </span>
                        <span className="text-gray-500 group-hover:text-white transition-all duration-300 group-hover:translate-x-1">
                          →
                        </span>
                      </>
                    ) : (
                      <span className="text-xs font-semibold tracking-widest uppercase text-gray-600">
                        Coming Soon
                      </span>
                    )}
                  </div>
                </div>
              </CardWrapper>
            );
          })}
        </section>
      </div>
    </div>
  );
}