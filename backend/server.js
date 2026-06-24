const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Serve static files from the public folder (one level up from backend/)
app.use(express.static(path.join(__dirname, '..', 'public')));

// In-memory queue state
let queue = [];
let currentToken = null;
let avgConsultationTime = 15; // default 15 minutes
let tokenCounter = 0;
let queueOpen = true;
let queuePauseReason = null; // null | 'doctor-late' | 'lunch-break' | 'clinic-closed'
let queuePauseDelay = 0; // extra minutes to add to wait times

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Send current state to newly connected client
  socket.emit('state-update', {
    queue,
    currentToken,
    avgConsultationTime,
    tokenCounter,
    queueOpen,
    queuePauseReason,
    queuePauseDelay
  });

  // Receptionist: Add a new patient
  socket.on('add-patient', (data) => {
    const patientName = data.name || '';
    const phone = data.phone || '';
    if (!queueOpen) {
      socket.emit('queue-error', 'Queue is closed. Start the queue to add patients.');
      return;
    }
    tokenCounter++;
    const newPatient = {
      token: tokenCounter,
      name: patientName || `Patient ${tokenCounter}`,
      phone: phone,
      joinedAt: Date.now()
    };
    queue.push(newPatient);
    io.emit('state-update', {
      queue,
      currentToken,
      avgConsultationTime,
      tokenCounter,
      queueOpen,
      queuePauseReason,
      queuePauseDelay
    });
  });

  // Receptionist: Call next token
  socket.on('call-next', () => {
    // Block calling next during ANY pause (doctor-late, lunch-break, clinic-closed)
    if (queuePauseReason) {
      socket.emit('queue-error', 'Queue is paused. Resume the queue to call next patient.');
      return;
    }
    if (!queueOpen) {
      socket.emit('queue-error', 'Queue is closed. Start the queue to call next patient.');
      return;
    }
    if (queue.length > 0) {
      currentToken = queue.shift();
      io.emit('state-update', {
        queue,
        currentToken,
        avgConsultationTime,
        tokenCounter,
        queueOpen,
        queuePauseReason,
        queuePauseDelay
      });
    }
  });

  // Receptionist: Set average consultation time
  socket.on('set-avg-time', (minutes) => {
    avgConsultationTime = parseInt(minutes) || 5;
    io.emit('state-update', {
      queue,
      currentToken,
      avgConsultationTime,
      tokenCounter,
      queueOpen,
      queuePauseReason,
      queuePauseDelay
    });
  });

  // Receptionist: Pause queue with a reason
  socket.on('pause-queue', (data) => {
    const { reason } = data;
    queuePauseReason = reason;
    
    if (reason === 'doctor-late') {
      queuePauseDelay = 45;
      queueOpen = true; // still open, just delayed
    } else if (reason === 'lunch-break') {
      queuePauseDelay = 60;
      queueOpen = true; // still open, just delayed
    } else if (reason === 'clinic-closed') {
      queuePauseDelay = 0;
      queueOpen = false; // closed for the day
      // Reset queue for next day — clear patients and reset token counter
      queue = [];
      currentToken = null;
      tokenCounter = 0;
    }
    
    io.emit('state-update', {
      queue,
      currentToken,
      avgConsultationTime,
      tokenCounter,
      queueOpen,
      queuePauseReason,
      queuePauseDelay
    });
  });

  // Receptionist: Resume queue (clear pause)
  socket.on('resume-queue', () => {
    queuePauseReason = null;
    queuePauseDelay = 0;
    queueOpen = true;
    io.emit('state-update', {
      queue,
      currentToken,
      avgConsultationTime,
      tokenCounter,
      queueOpen,
      queuePauseReason,
      queuePauseDelay
    });
  });

  // Receptionist: Toggle queue open/closed (simple version)
  socket.on('toggle-queue', () => {
    queueOpen = !queueOpen;
    if (queueOpen) {
      queuePauseReason = null;
      queuePauseDelay = 0;
    }
    io.emit('state-update', {
      queue,
      currentToken,
      avgConsultationTime,
      tokenCounter,
      queueOpen,
      queuePauseReason,
      queuePauseDelay
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Queue Cure server running on http://localhost:${PORT}`);
});