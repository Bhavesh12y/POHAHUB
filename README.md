# Doozles

Centralized multiplayer gaming hub with an **authoritative server model**. The backend validates all game state; the frontend is a real-time rendering layer.

## Phase 1 — Connect 4 (Complete)

- Premium gateway UI with game selection
- Express + Socket.io room management
- Real-time room chat
- Server-side Connect 4 engine (6×7 board, win detection, draw detection)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Vite, Tailwind CSS, React Router |
| Backend | Node.js, Express |
| Real-time | Socket.io |
| Future | Redis (sessions), MongoDB/PostgreSQL (profiles) |

## Project Structure

```
Doozles/
├── frontend/          # React client
│   └── src/
│       ├── components/     # Layout, MainLanding
│       └── games/          # Per-game UI modules
└── backend/           # Authoritative game server
    └── src/
        ├── server.js
        ├── rooms/roomManager.js
        └── games/connectFour.js
```

## Getting Started

### Prerequisites

- Node.js 18+

### 1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Start the backend

```bash
cd backend
npm run dev
```

Server runs at `http://localhost:3001`.

### 3. Start the frontend

```bash
cd frontend
npm run dev
```

App runs at `http://localhost:5173`.

### 4. Play Connect 4

1. Open the hub and click **Connect 4**
2. Enter a username and **Create Room**
3. Share the 6-character room code with a friend (second browser/tab)
4. Second player joins with the code
5. Host clicks **Start Game**
6. Take turns dropping discs — server validates every move

## Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `room:create` | Client → Server | Create a new game room |
| `room:join` | Client → Server | Join by room code |
| `room:start` | Client → Server | Host starts the match |
| `room:update` | Server → Client | Full room + game state sync |
| `game:move` | Client → Server | Submit column drop |
| `chat:message` | Bidirectional | Room chat |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend port |
| `CLIENT_ORIGIN` | `http://localhost:5173` | CORS origin |
| `VITE_SERVER_URL` | `http://localhost:3001` | Frontend socket URL |

## Roadmap

- [x] Phase 1: Gateway + Connect 4
- [ ] Phase 2: Snake & Ladder
- [ ] Phase 3: Ludo
- [ ] Phase 4: Tambola
- [ ] Auth, Redis sessions, persistent leaderboards
