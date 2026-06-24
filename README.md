# Queue Cure

A real-time clinic queue management system. Receptionists manage patient tokens from a dashboard, and patients see live wait updates on a waiting-room display — all synced instantly over WebSockets.

**Live demo:** https://queue-cure-chi.vercel.app

---

## Features

- Add patients to the queue with name and phone number
- Call the next patient in line
- Set/adjust average consultation time (used to estimate wait times)
- Pause the queue for specific reasons — doctor running late, lunch break, or clinic closed for the day
- Resume the queue after a pause
- Toggle the queue open/closed
- Real-time state sync across all connected clients (receptionist view + waiting room display) with no page refresh

## Tech Stack

**Frontend**
- React (Vite)
- Socket.IO client

**Backend**
- Node.js + Express
- Socket.IO server

**Deployment**
- Frontend → Vercel
- Backend → Render

## Architecture

```
┌─────────────────┐         WebSocket          ┌──────────────────┐
│  React Frontend  │ ◄────────────────────────► │  Express Backend  │
│  (Vercel)        │      (Socket.IO)            │  (Render)         │
│                   │                             │                    │
│  - Landing        │                             │  In-memory queue   │
│  - Receptionist   │                             │  state (no DB)     │
│  - WaitingRoom    │                             │                    │
└─────────────────┘                             └──────────────────┘
```

All queue state lives in memory on the backend and is broadcast to every connected client whenever it changes. There is currently no database — state resets if the backend restarts.

## Project Structure

```
Queue_Cure/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Landing.jsx
│   │   │   ├── Receptionist.jsx
│   │   │   └── WaitingRoom.jsx
│   │   ├── context/
│   │   │   └── SocketContext.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── vite.config.js
├── backend/
│   └── server.js
└── README.md
```

## Socket Events

See [`socket-event-diagram.svg`](./socket-event-diagram.svg) for the full visual flow. Summary:

| Direction | Event | Payload | Purpose |
|---|---|---|---|
| Client → Server | `add-patient` | `{ name, phone }` | Add a new patient to the queue |
| Client → Server | `call-next` | — | Call the next token in line |
| Client → Server | `set-avg-time` | `minutes` | Update average consultation time |
| Client → Server | `pause-queue` | `{ reason }` | Pause queue (doctor-late / lunch-break / clinic-closed) |
| Client → Server | `resume-queue` | — | Clear pause and resume |
| Client → Server | `toggle-queue` | — | Open/close the queue |
| Server → Client | `state-update` | Full queue state | Broadcast latest state to all clients |
| Server → Client | `queue-error` | Error message | Sent to a client when an action is invalid |

## Running Locally

**Backend**
```bash
cd backend
npm install
npm start
```
Runs on `http://localhost:3000`

**Frontend**
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173`

Create a `frontend/.env` file with:
```
VITE_BACKEND_URL=http://localhost:3000
```

## Deployment

- **Backend (Render):** Root directory `backend`, build command `npm install`, start command `npm start`
- **Frontend (Vercel):** Root directory `frontend`, framework preset Vite, environment variable `VITE_BACKEND_URL` set to the deployed backend URL

## License

MIT
