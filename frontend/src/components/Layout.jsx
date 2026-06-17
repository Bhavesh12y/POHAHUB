import { Outlet, Link, useLocation } from 'react-router-dom';

export default function Layout() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-gray-200 font-sans selection:bg-gray-300 selection:text-black relative overflow-hidden">
      
      {/* --- INJECTED CSS FOR HIGH-MOTION ANIMATIONS --- */}
      <style>{`
        @keyframes sweep-1 {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(15vw, -20vh) scale(1.3); }
          66% { transform: translate(-10vw, 15vh) scale(0.8); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes sweep-2 {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-20vw, 15vh) scale(0.9); }
          66% { transform: translate(15vw, -10vh) scale(1.4); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes pulse-core {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.02; }
          50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.05; }
        }
        @keyframes grid-pan {
          0% { background-position: 0px 0px; }
          100% { background-position: 40px 40px; }
        }
        
        .animate-sweep-1 { animation: sweep-1 12s ease-in-out infinite; }
        .animate-sweep-2 { animation: sweep-2 15s ease-in-out infinite; }
        .animate-pulse-core { animation: pulse-core 8s ease-in-out infinite; }
        
        .bg-grid-pattern {
          background-size: 40px 40px;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.025) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
          mask-image: radial-gradient(ellipse at center, black 50%, transparent 90%);
          -webkit-mask-image: radial-gradient(ellipse at center, black 50%, transparent 90%);
          animation: grid-pan 3s linear infinite;
        }
      `}</style>

      {/* Premium Transparent Header */}
      <header className="border-b border-white/[0.05] bg-transparent sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          
          {/* Logo Section */}
          <Link to="/" className="flex items-center gap-4 group">
            <div className="relative w-11 h-11 rounded-xl bg-[#0a0a0c] border border-white/[0.08] flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.02)] group-hover:shadow-[0_0_20px_rgba(255,255,255,0.08)] group-hover:border-gray-500/50 transition-all duration-500 ease-out overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative grid grid-cols-2 gap-1 w-4 h-4 transform group-hover:rotate-90 transition-transform duration-700 ease-in-out">
                <div className="bg-gray-200 rounded-sm" />
                <div className="bg-gray-500 rounded-sm" />
                <div className="bg-gray-600 rounded-sm" />
                <div className="bg-gray-400 rounded-sm" />
              </div>
            </div>

            <div>
              <h1 className="text-xl font-extrabold tracking-[0.2em] uppercase bg-gradient-to-r from-gray-100 via-gray-300 to-gray-500 bg-clip-text text-transparent">
                Pohahub
              </h1>
              <p className="text-[10px] font-medium tracking-widest text-gray-500 uppercase mt-0.5">
                Multiplayer Hub
              </p>
            </div>
          </Link>

          {/* Navigation / Back Button */}
          {!isHome && (
            <Link
              to="/"
              className="group flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-gray-500 hover:text-white transition-colors duration-300"
            >
              <span className="text-gray-600 group-hover:-translate-x-1 transition-transform duration-300">
                ←
              </span>
              Back to Hub
            </Link>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10">
        <Outlet />
      </main>

      {/* Minimalist Footer */}
      <footer className="border-t border-white/[0.03] bg-[#050505]/40 backdrop-blur-md py-8 text-center relative z-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs font-light tracking-widest text-gray-600 uppercase">
            © {new Date().getFullYear()} Pohahub
          </p>
          <div className="flex items-center gap-3 text-xs font-light tracking-widest text-gray-600 uppercase">
            <span>Having Fun ?</span>
            <span className="w-1 h-1 rounded-full bg-gray-700" />
            <span>Send me a Maggie</span>
          </div>
        </div>
      </footer>
    </div>
  );
}