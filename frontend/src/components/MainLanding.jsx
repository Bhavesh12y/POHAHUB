import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { emitWithAck } from '../lib/socket.js';

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
    image: 'https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/Logo%20(1).png',
    path: '/games/ludo',
    available: false,
    headerColor: 'bg-[#facc15]',
    buttonColor: 'bg-[#e5e7eb]',
    tilt: 'rotate-1',
  },
];

export default function MainLanding() {
  const navigate = useNavigate();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinMode, setJoinMode] = useState(''); // '' | 'scan' | 'nearby'
  const [nearbyStatus, setNearbyStatus] = useState('');

  // Handle successful QR Scan
  const handleScan = (result) => {
    if (result && result[0]) {
      try {
        const urlObj = new URL(result[0].rawValue);
        setShowJoinModal(false);
        setJoinMode('');
        // Navigates purely within React Router (fast, no reload)
        navigate(urlObj.pathname + urlObj.search); 
      } catch (e) {
        setNearbyStatus('INVALID QR CODE SCANNED');
      }
    }
  };

  // Handle Nearby Radar Search
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
          // Ask the server if any active room is broadcasting near these coordinates
          const res = await emitWithAck('room:find_nearby', {
            lat: position.coords.latitude,
            lng: position.coords.longitude
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
            setNearbyStatus('NO NEARBY ROOMS FOUND.');
          }
        } catch (err) {
          setNearbyStatus('ERROR CONNECTING TO RADAR.');
        }
      },
      (error) => {
        setNearbyStatus('LOCATION PERMISSION DENIED.');
      },
      { enableHighAccuracy: true }
    );
  };

  const closeMenu = () => {
    setShowJoinModal(false);
    setJoinMode('');
    setNearbyStatus('');
  };

  return (
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

      {/* TOP ACTION BAR */}
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-50">
        <button 
          onClick={() => setShowJoinModal(true)}
          className="bg-black text-white px-6 py-3 font-black uppercase tracking-widest border-[3px] border-transparent shadow-[4px_4px_0px_rgba(0,0,0,0.3)] hover:bg-gray-800 transition-all rounded-sm hover:-translate-y-1 rotate-1"
        >
          JOIN EXISTING ROOM
        </button>
      </div>

      <div className="relative max-w-7xl mx-auto px-5 py-24 sm:py-28 z-10 w-full">
        <section className="mb-12 sm:mb-16 animate-sketch-pop text-center sm:text-left">
          
          {/* Top Yellow Tag */}
          <div className="inline-block bg-[#facc15] border-[3px] border-black shadow-[4px_4px_0px_#000] px-4 py-2 mb-6 -rotate-1">
            <span className="text-sm sm:text-base font-black uppercase tracking-widest text-black">
              Rooms, rivalries, and ridiculous comebacks
            </span>
          </div>

          <h2 className="max-w-5xl text-[clamp(3rem,8vw,6rem)] font-black uppercase leading-[0.9] tracking-tighter">
            Pick a game.
            <span className="block text-pink-400">Start the room.</span>
          </h2>

          <p className="mt-6 max-w-2xl text-[clamp(1rem,2vw,1.4rem)] font-bold text-gray-700 leading-relaxed uppercase tracking-wider">
            A bright notebook arcade for quick multiplayer matches with friends.
          </p>
        </section>

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

      {/* THE MODAL: JOIN EXISTING ROOM */}
      {showJoinModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white border-[4px] border-black shadow-[12px_12px_0px_#000] p-6 sm:p-10 max-w-md w-full rounded-xl -rotate-1 relative">
            
            <button 
              onClick={closeMenu}
              className="absolute top-4 right-4 bg-red-400 text-black border-[3px] border-black w-10 h-10 flex items-center justify-center font-black rounded-full shadow-[2px_2px_0px_#000] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none"
            >
              X
            </button>

            <h2 className="text-2xl sm:text-3xl font-black uppercase mb-6 tracking-tighter">
              Join Match
            </h2>

            {!joinMode && (
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => setJoinMode('scan')}
                  className="bg-sky-300 border-[3px] border-black p-5 text-lg font-black uppercase shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all rounded"
                >
                  SCAN QR CODE
                </button>
                <button 
                  onClick={handleFindNearby}
                  className="bg-purple-300 border-[3px] border-black p-5 text-lg font-black uppercase shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all rounded"
                >
                  FIND NEARBY PLAYER
                </button>
              </div>
            )}

            {joinMode === 'scan' && (
              <div className="flex flex-col items-center">
                <div className="w-full aspect-square border-[4px] border-black shadow-[6px_6px_0px_#000] rounded-lg overflow-hidden mb-4 bg-gray-200">
                  <Scanner onScan={handleScan} />
                </div>
                <p className="font-bold text-gray-500 uppercase tracking-widest text-sm mb-4">
                  POINT CAMERA AT HOSTS SCREEN
                </p>
                {nearbyStatus && <p className="text-red-500 font-black uppercase">{nearbyStatus}</p>}
              </div>
            )}

            {joinMode === 'nearby' && (
              <div className="text-center py-8">
                <div className="inline-block w-16 h-16 border-8 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-6"></div>
                <p className="font-black text-lg uppercase tracking-widest text-purple-600">
                  {nearbyStatus}
                </p>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}