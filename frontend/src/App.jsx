import { Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import Landing from './components/Landing';
import Receptionist from './components/Receptionist';
import WaitingRoom from './components/WaitingRoom';

function App() {
  return (
    <SocketProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/receptionist" element={<Receptionist />} />
        <Route path="/waiting-room" element={<WaitingRoom />} />
      </Routes>
    </SocketProvider>
  );
}

export default App;