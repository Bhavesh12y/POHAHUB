import { useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const isHome = location.pathname === '/';
  const isInGameRoom = location.pathname.includes('/room/');

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isInGameRoom) {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? Your game progress will be lost.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isInGameRoom]);

  const handleNavigation = (e, path) => {
    if (isInGameRoom) {
      e.preventDefault();
      const confirmLeave = window.confirm('Are you sure you want to leave the game? You will be disconnected.');
      if (confirmLeave) {
        navigate(path);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col text-black font-sans relative overflow-x-hidden">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white border-b-[4px] border-black shadow-[0_4px_0px_rgba(0,0,0,1)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          
          {/* LOGO */}
          <Link
            to="/"
            onClick={(e) => handleNavigation(e, '/')}
            className="group flex items-center gap-3 cursor-pointer"
          >
            <div className="bg-[#facc15] text-black border-[3px] border-black px-3 py-1 shadow-[4px_4px_0px_#000] -rotate-3 transition-transform duration-200 group-hover:-rotate-1">
              <span className="text-[clamp(1.1rem,2.5vw,1.75rem)] font-black tracking-widest uppercase">PH</span>
            </div>

            <div className="flex flex-col justify-center min-w-0">
              <h1 className="text-[clamp(1.25rem,3vw,2.25rem)] font-black uppercase tracking-widest leading-none text-black">
                Pohahub
              </h1>
              <p className="text-[clamp(0.55rem,1.1vw,0.7rem)] font-black uppercase text-gray-600 tracking-wider mt-1">
                Multiplayer notebook arcade
              </p>
            </div>
          </Link>

          {/* BACK TO HUB BUTTON */}
          {!isHome && (
            <Link
              to="/"
              onClick={(e) => handleNavigation(e, '/')}
              className="bg-[#7dd3fc] text-black font-black tracking-widest uppercase border-[3px] border-black shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] px-4 py-2 text-xs sm:text-sm transition-all rounded-sm rotate-1"
            >
              Back to Hub
            </Link>
          )}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 relative z-10 w-full">
        <Outlet />
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t-[4px] border-black bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-black uppercase tracking-widest text-black">
          <p>(c) {new Date().getFullYear()} Pohahub</p>
          
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <span className="cursor-pointer hover:underline decoration-[3px] underline-offset-4">Terms & Conditions</span>
            <span className="cursor-pointer hover:underline decoration-[3px] underline-offset-4">Privacy Policy</span>
            <a
              href="https://www.instagram.com/bhavesh12z"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#ef4444] hover:text-black underline decoration-[3px] underline-offset-4 transition-colors"
            >
              Contact Us
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}