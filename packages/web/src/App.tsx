import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { LauncherPage } from './pages/LauncherPage';
import { LobbyPage } from './pages/LobbyPage';
import { JoinPage } from './pages/JoinPage';
import { GamePage } from './pages/GamePage';
import { HubPage } from './pages/HubPage';
import { HubJoinPage } from './pages/HubJoinPage';
import { HubLobbyPage } from './pages/HubLobbyPage';

export function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LauncherPage />} />
          {/* Hub routes */}
          <Route path="/hub/:hubId" element={<HubPage />} />
          <Route path="/hub/:hubId/join" element={<HubJoinPage />} />
          <Route path="/hub/:hubId/lobby" element={<HubLobbyPage />} />
          {/* Game routes (legacy + hub) */}
          <Route path="/game/:gameId" element={<LobbyPage />} />
          <Route
            path="/game/:gameId/play"
            element={<GamePage mode="host" />}
          />
          <Route path="/join/:gameId" element={<JoinPage />} />
          <Route
            path="/join/:gameId/play"
            element={<GamePage mode="controller" />}
          />
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
}
