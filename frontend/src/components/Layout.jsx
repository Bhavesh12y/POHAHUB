import { Outlet, Link, useLocation } from 'react-router-dom';

export default function Layout() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-hub-border bg-hub-surface/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-hub-accent to-hub-glow flex items-center justify-center text-lg shadow-glow group-hover:scale-105 transition-transform">
              🎮
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-hub-muted bg-clip-text text-transparent">
                POHAHUB
              </h1>
              <p className="text-xs text-hub-muted -mt-0.5">Multiplayer Gaming Hub</p>
            </div>
          </Link>

          {!isHome && (
            <Link
              to="/"
              className="text-sm text-hub-muted hover:text-hub-accent transition-colors"
            >
              ← Back to Hub
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-hub-border py-6 text-center text-sm text-hub-muted">
        <p>Authoritative server model · Real-time via Socket.io</p>
      </footer>
    </div>
  );
}
