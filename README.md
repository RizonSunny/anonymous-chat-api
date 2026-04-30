# Anonymous Chat API

A real-time anonymous chat API built with NestJS, PostgreSQL (via Drizzle ORM), Redis, and Socket.io. Users authenticate with a username only — no passwords — and can create rooms, send messages, and chat live via WebSockets.

## Prerequisites

- Node.js 20+
- Docker and Docker Compose

## Setup

```bash
git clone <repo>
cp .env.example .env
docker compose up -d
npm install
npm run migration:run
npm run start:dev
```

The server starts on `http://localhost:3000`. All REST endpoints are under `/api/v1`.

## Environment Variables

| Name | Default | Description |
|------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/chatdb` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |

## REST API

### Auth

```
POST /api/v1/login
Content-Type: application/json

{ "username": "alice" }
```

Returns a `sessionToken` to use as a Bearer token on all subsequent requests. Calling login again with the same username returns the same user with a new token.

### Rooms

```
GET    /api/v1/rooms
POST   /api/v1/rooms          { "name": "general" }
GET    /api/v1/rooms/:id
DELETE /api/v1/rooms/:id
```

Only the creator of a room can delete it.

### Messages

```
GET  /api/v1/rooms/:id/messages?limit=50&before=<cursor>
POST /api/v1/rooms/:id/messages   { "content": "hello" }
```

`GET` returns messages in ascending order. Use `nextCursor` from the response as `before=` for the next page.

### Response Envelope

All responses follow a consistent envelope:

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "SNAKE_CASE_CODE", "message": "Human-readable description" } }
```

## WebSocket

Connect to the `/chat` namespace with your token and a room ID:

```js
// Browser snippet
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/chat', {
  query: { token: '<sessionToken>', roomId: '<roomId>' },
});

socket.on('room:joined',      ({ activeUsers }) => { /* string[] of usernames */ });
socket.on('room:user_joined', ({ username, activeUsers }) => { ... });
socket.on('room:user_left',   ({ username, activeUsers }) => { ... });
socket.on('message:new',      ({ id, username, content, createdAt }) => { ... });
socket.on('room:deleted',     ({ roomId }) => { /* room was deleted, disconnect */ });
```

Using [wscat](https://github.com/websockets/wscat):

```bash
wscat -c "ws://localhost:3000/chat?token=<token>&roomId=<roomId>"
```

To leave a room explicitly, emit `room:leave` before closing the connection.

## Running in Production

```bash
npm run build && npm run start:prod
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for scaling notes and deployment options.
