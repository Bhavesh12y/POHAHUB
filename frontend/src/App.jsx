import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import MainLanding from './components/MainLanding.jsx';
import ConnectFourLanding from './games/connect-four/Landing.jsx';
import ConnectFourBoard from './games/connect-four/Board.jsx';
import SnakeLadderLanding from './games/snake-and-ladder/Landing.jsx';
import LudoLanding from './games/ludo/Landing.jsx';
import TambolaLanding from './games/tambola/Landing.jsx';
import ComingSoon from './components/ComingSoon.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<MainLanding />} />
        <Route path="games/connect-four" element={<ConnectFourLanding />} />
        <Route path="games/connect-four/room/:roomCode" element={<ConnectFourBoard />} />
        <Route path="games/snake-and-ladder" element={<SnakeLadderLanding />} />
        <Route path="games/ludo" element={<LudoLanding />} />
        <Route path="games/tambola" element={<TambolaLanding />} />
        <Route path="*" element={<ComingSoon title="Page Not Found" subtitle="This route does not exist." />} />
      </Route>
    </Routes>
  );
}
