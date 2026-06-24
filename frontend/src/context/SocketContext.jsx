import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [queueState, setQueueState] = useState({
    queue: [],
    currentToken: null,
    avgConsultationTime: 15,
    tokenCounter: 0,
    queueOpen: true,
    queuePauseReason: null,
    queuePauseDelay: 0
  });

  useEffect(() => {
    const newSocket = io('http://localhost:3000', {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('state-update', (data) => {
      setQueueState(data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const addPatient = (patientData) => {
    if (socket) socket.emit('add-patient', patientData);
  };

  const callNext = () => {
    if (socket) socket.emit('call-next');
  };

  const setAvgTime = (minutes) => {
    if (socket) socket.emit('set-avg-time', minutes);
  };

  const toggleQueue = () => {
    if (socket) socket.emit('toggle-queue');
  };

  const pauseQueue = (reason) => {
    if (socket) socket.emit('pause-queue', { reason });
  };

  const resumeQueue = () => {
    if (socket) socket.emit('resume-queue');
  };

  return (
    <SocketContext.Provider value={{ socket, queueState, addPatient, callNext, setAvgTime, toggleQueue, pauseQueue, resumeQueue }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}