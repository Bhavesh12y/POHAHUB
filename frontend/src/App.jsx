import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { initAnalytics, trackPageView } from './lib/analytics.js';

const MainLanding = lazy(() => import('./components/MainLanding.jsx'));
const ComingSoon = lazy(() => import('./components/ComingSoon.jsx'));
const GameSeoPage = lazy(() => import('./pages/GameSeoPage.jsx'));
const TrustPage = lazy(() => import('./pages/TrustPage.jsx'));

const ConnectFourLanding = lazy(() => import('./games/connect-four/Landing.jsx'));
const ConnectFourBoard = lazy(() => import('./games/connect-four/Board.jsx'));
const TicTacToeLanding = lazy(() => import('./games/tictactoe/Landing.jsx'));
const TicTacToeBoard = lazy(() => import('./games/tictactoe/TicTacToeBoard.jsx'));
const SnakeLadderLanding = lazy(() => import('./games/snake-and-ladder/Landing.jsx'));
const SnakeAndLadderBoard = lazy(() => import('./games/snake-and-ladder/board.jsx'));
const LudoLanding = lazy(() => import('./games/ludo/Landing.jsx'));
const LudoBoard = lazy(() => import('./games/ludo/Board.jsx'));
const TambolaLanding = lazy(() => import('./games/tambola/Landing.jsx'));
const TambolaBoard = lazy(() => import('./games/tambola/board.jsx'));
const ScribbleLanding = lazy(() => import('./games/scribble/Landing.jsx'));
const ScribbleBoard = lazy(() => import('./games/scribble/Board.jsx'));
const SPSLanding = lazy(() => import('./games/stone-paper-scissor/Landing.jsx'));
const SPSBoard = lazy(() => import('./games/stone-paper-scissor/Board.jsx'));
const Game2048 = lazy(() => import('./games/2048/Game2048.jsx'));

function RouteFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="paper-panel bg-white px-8 py-6 text-center">
        <p className="font-black uppercase tracking-widest text-black">
          Loading...
        </p>
      </div>
    </div>
  );
}

function PageAnalytics() {
  const location = useLocation();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  return null;
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <PageAnalytics />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<MainLanding />} />

          <Route path="connect-4" element={<GameSeoPage slug="connect-4" />} />
          <Route path="tic-tac-toe" element={<GameSeoPage slug="tic-tac-toe" />} />
          <Route path="ludo" element={<GameSeoPage slug="ludo" />} />
          <Route path="chess" element={<GameSeoPage slug="chess" />} />
          <Route path="scribble" element={<GameSeoPage slug="scribble" />} />
          <Route path="snake-and-ladder" element={<GameSeoPage slug="snake-and-ladder" />} />
          <Route path="tambola" element={<GameSeoPage slug="tambola" />} />
          <Route path="rock-paper-scissor" element={<GameSeoPage slug="rock-paper-scissor" />} />
          <Route path="stone-paper-scissor" element={<GameSeoPage slug="rock-paper-scissor" />} />
          <Route path="2048" element={<GameSeoPage slug="2048" />} />

          <Route path="privacy-policy" element={<TrustPage page="privacy-policy" />} />
          <Route path="terms" element={<TrustPage page="terms" />} />
          <Route path="contact" element={<TrustPage page="contact" />} />
          <Route path="about" element={<TrustPage page="about" />} />

          <Route path="games/connect-four" element={<ConnectFourLanding />} />
          <Route path="games/connect-four/room/:roomCode" element={<ConnectFourBoard />} />

          <Route path="games/tic-tac-toe" element={<TicTacToeLanding />} />
          <Route path="games/tic-tac-toe/room/:roomCode" element={<TicTacToeBoard />} />

          <Route path="games/snake-and-ladder" element={<SnakeLadderLanding />} />
          <Route path="games/snake-and-ladder/room/:roomCode" element={<SnakeAndLadderBoard />} />

          <Route path="games/ludo" element={<LudoLanding />} />
          <Route path="games/ludo/room/:roomCode" element={<LudoBoard />} />

          <Route path="games/tambola" element={<TambolaLanding />} />
          <Route path="games/tambola/room/:roomCode" element={<TambolaBoard />} />

          <Route path="games/scribble" element={<ScribbleLanding />} />
          <Route path="games/scribble/room/:roomCode" element={<ScribbleBoard />} />

          <Route path="games/stone-paper-scissor" element={<SPSLanding />} />
          <Route path="games/stone-paper-scissor/room/:roomCode" element={<SPSBoard />} />

          <Route path="games/2048" element={<Game2048 />} />

          <Route
            path="*"
            element={<ComingSoon title="Page Not Found" subtitle="This route does not exist." />}
          />
        </Route>
      </Routes>
    </Suspense>
  );
}
