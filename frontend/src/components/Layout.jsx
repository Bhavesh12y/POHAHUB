import { useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';




export function useDesktopScalingFix() {
  useEffect(() => {
    const applyReverseZoom = () => {
      // Ignore Mobile/Tablets
      if (window.innerWidth < 1024) {
        document.body.style.removeProperty('zoom');
        return;
      }

      const EXTRA_ZOOM_OUT = 0.90; 
      const pixelRatio = window.devicePixelRatio || 1;

      let targetZoom = EXTRA_ZOOM_OUT;

      if (pixelRatio > 1 && pixelRatio <= 2.5) {
        // Use decimals (e.g., 0.6) instead of percentages for better browser support
        targetZoom = (1 / pixelRatio) * EXTRA_ZOOM_OUT;
      }

      const targetElement = document.getElementById('root') || document.body;

      targetElement.style.zoom = targetZoom; 
      
      /* // Method B: The "Nuclear Option" (CSS Transform)
      // If you are on Firefox or 'zoom' STILL fails, comment out Method A above
      // and uncomment these lines. CSS Transform works universally on all browsers.
      
      targetElement.style.transform = `scale(${targetZoom})`;
      targetElement.style.transformOrigin = 'top left';
      // We have to expand the width/height container to compensate for the scale down
      targetElement.style.width = `${100 / targetZoom}%`;
      targetElement.style.height = `${100 / targetZoom}%`;
      */
    };

    applyReverseZoom();
    window.addEventListener('resize', applyReverseZoom);
    
    // Cleanup on unmount
    return () => window.removeEventListener('resize', applyReverseZoom);
  }, []);
}
export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  useDesktopScalingFix();

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
      <Analytics />

      <footer className="border-t-[4px] border-black bg-white mt-12">
        <div className="max-w-7xl mx-auto px-5 py-8 flex flex-col gap-6 text-sm font-black uppercase tracking-widest text-black">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p>(c) {new Date().getFullYear()} Pohahub</p>
            <nav aria-label="Legal pages" className="flex flex-wrap gap-4 sm:gap-6">
              <Link to="/about" className="hover:underline decoration-[3px] underline-offset-4">
                About
              </Link>
              <Link to="/contact" className="hover:underline decoration-[3px] underline-offset-4">
                Contact
              </Link>
              <Link to="/privacy-policy" className="hover:underline decoration-[3px] underline-offset-4">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:underline decoration-[3px] underline-offset-4">
                Terms
              </Link>
            </nav>
          </div>

          {!isInGameRoom && (
            <nav aria-label="Game guides" className="flex flex-wrap gap-4 sm:gap-6 text-xs">
              <Link to="/connect-4" className="hover:underline decoration-[3px] underline-offset-4">
                Connect 4 Guide
              </Link>
              <Link to="/tic-tac-toe" className="hover:underline decoration-[3px] underline-offset-4">
                Tic Tac Toe Guide
              </Link>
              <Link to="/scribble" className="hover:underline decoration-[3px] underline-offset-4">
                Scribble Guide
              </Link>
              <Link to="/snake-and-ladder" className="hover:underline decoration-[3px] underline-offset-4">
                Snake & Ladder Guide
              </Link>
              <Link to="/tambola" className="hover:underline decoration-[3px] underline-offset-4">
                Tambola Guide
              </Link>
              <Link to="/rock-paper-scissor" className="hover:underline decoration-[3px] underline-offset-4">
                Rock Paper Scissor Guide
              </Link>
              <Link to="/ludo" className="hover:underline decoration-[3px] underline-offset-4">
                Ludo Guide
              </Link>
              <Link to="/2048" className="hover:underline decoration-[3px] underline-offset-4">
                2048 Guide
              </Link>
              <Link to="/chess" className="hover:underline decoration-[3px] underline-offset-4">
                Chess Guide
              </Link>
            </nav>
          )}
        </div>
      </footer>
    </div>
  );
}
