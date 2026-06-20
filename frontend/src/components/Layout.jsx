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
    <div className="min-h-screen flex flex-col text-ink font-sketch relative overflow-x-hidden">
      <header className="sticky top-0 z-50 bg-[#fdfdfd]/95 border-b-[3px] border-black">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <Link
            to="/"
            onClick={(e) => handleNavigation(e, '/')}
            className="group flex items-center gap-3 cursor-pointer"
          >
            <div className="sketch-border bg-yellow-300 px-3 py-2 -rotate-2 transition-transform duration-200 group-hover:rotate-1">
              <span className="text-2xl font-black tracking-wide">PH</span>
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-normal leading-none">
                Pohahub
              </h1>
              <p className="text-xs sm:text-sm font-bold uppercase text-gray-700">
                Multiplayer notebook arcade
              </p>
            </div>
          </Link>

          {!isHome && (
            <Link
              to="/"
              onClick={(e) => handleNavigation(e, '/')}
              className="sketch-button bg-sky-200 px-4 py-2 text-xs sm:text-sm"
            >
              Back to Hub
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 relative z-10">
        <Outlet />
      </main>

      <footer className="relative z-10 border-t-[3px] border-black bg-white/90 py-7 text-center">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-bold uppercase text-gray-800">
          <p>(c) {new Date().getFullYear()} Pohahub</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span>Terms & Conditions</span>
            <span>Privacy Policy</span>
            <a
              href="https://www.instagram.com/bhavesh12z"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-[3px] underline-offset-4 hover:text-pink-600"
            >
              Contact Us
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
