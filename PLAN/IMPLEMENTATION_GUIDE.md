# Anonymous Chat API — Implementation Guide

> **How to use this file:**
> At the start of every new session, say:
> `"Read IMPLEMENTATION_GUIDE.md and implement Part N — <part name>."`
> Everything you need is in this file. Do not deviate from the conventions below.

---

## Project Snapshot

| Item | Value |
|------|-------|
| Framework | NestJS (latest) |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL via Drizzle ORM |
| Cache / Pub-sub | Redis via ioredis |
| Real-time | Socket.io with `@socket.io/redis-adapter` |
| Base API path | `/api/v1` |
| Auth | Opaque Bearer token stored in Redis, 24h TTL |
| ID format | Prefixed nanoid: `usr_`, `room_`, `msg_` |
| Port | `3000` (configurable via `PORT` env var) |

---

## Project Structure (target)

```
src/
  app.module.ts
  main.ts
  common/
    filters/
      http-exception.filter.ts      # global error envelope
    interceptors/
      response.interceptor.ts       # global success envelope
    guards/
      session.guard.ts              # Bearer token → req.user
    exceptions/
      app.exception.ts              # base custom exception
    decorators/
      current-user.decorator.ts     # @CurrentUser()
  config/
    env.ts                          # typed env via @nestjs/config
  database/
    database.module.ts              # DrizzleModule (global)
    database.provider.ts
    schema/
      users.schema.ts
      rooms.schema.ts
      messages.schema.ts
      index.ts                      # re-exports all schemas
  redis/
    redis.module.ts                 # RedisModule (global)
    redis.service.ts
  auth/
    auth.module.ts
    auth.controller.ts              # POST /login
    auth.service.ts
    dto/
      login.dto.ts
  users/
    users.module.ts
    users.service.ts
  rooms/
    rooms.module.ts
    rooms.controller.ts
    rooms.service.ts
    dto/
      create-room.dto.ts
  messages/
    messages.module.ts
    messages.controller.ts
    messages.service.ts
    dto/
      create-message.dto.ts
      get-messages.dto.ts
  gateway/
    chat.gateway.ts
    gateway.module.ts
drizzle.config.ts
docker-compose.yml
.env.example
```

---

## Conventions (apply in every session)

### ID Generation
```ts
// Always use this pattern for all IDs
import { randomBytes } from 'crypto';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6);
const userId  = `usr_${nanoid()}`;
const roomId  = `room_${nanoid()}`;
const msgId   = `msg_${nanoid()}`;
```

### Response Envelope — Success
```json
{ "success": true, "data": { } }
```

### Response Envelope — Error
```json
{ "success": false, "error": { "code": "SNAKE_CASE", "message": "..." } }
```

### Error Codes (exhaustive list)
| HTTP | code | when |
|------|------|------|
| 400 | `VALIDATION_ERROR` | DTO validation fails |
| 401 | `UNAUTHORIZED` | missing / expired token |
| 403 | `FORBIDDEN` | not room creator |
| 404 | `ROOM_NOT_FOUND` | room id not in DB |
| 404 | `USER_NOT_FOUND` | (internal only) |
| 409 | `ROOM_NAME_TAKEN` | duplicate room name |
| 422 | `MESSAGE_TOO_LONG` | content > 1000 chars |
| 422 | `MESSAGE_EMPTY` | content empty after trim |

### Redis Key Schema
| Key | Type | TTL | Purpose |
|-----|------|-----|---------|
| `session:<token>` | String (JSON) | 86400s | `{ userId, username }` |
| `room:active:<roomId>` | Set | none | usernames of connected sockets |
| `socket:<socketId>` | String (JSON) | 3600s | `{ username, roomId }` |

### Environment Variables
```
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chatdb
REDIS_URL=redis://localhost:6379
```

---

## Completed Parts Tracker

Update this section as each part is done.

- [x] Part 1 — Project Setup
- [ ] Part 2 — Response Envelope & Error Handling
- [ ] Part 3 — Database Schema
- [ ] Part 4 — Redis Module
- [ ] Part 5 — Session / Auth System
- [ ] Part 6 — Users Module
- [ ] Part 7 — Auth Endpoint (POST /login)
- [ ] Part 8 — Rooms Module (REST)
- [ ] Part 9 — Messages Module (REST)
- [ ] Part 10 — WebSocket Gateway
- [ ] Part 11 — Documentation
- [ ] Part 12 — Deployment

---

---

## Part 1 — Project Setup

**Session prompt:**
> "Read IMPLEMENTATION_GUIDE.md and implement Part 1 — Project Setup."

**What to build:**
Scaffold the entire NestJS project with all dependencies, configuration files, and Docker setup. No business logic yet — just a running server.

**Steps:**

1. **Scaffold NestJS**
   ```bash
   npx @nestjs/cli new anonymous-chat-api --package-manager npm --skip-git
   cd anonymous-chat-api
   ```

2. **Install all dependencies**
   ```bash
   npm install drizzle-orm pg
   npm install ioredis
   npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
   npm install @socket.io/redis-adapter
   npm install class-validator class-transformer
   npm install nanoid
   npm install @nestjs/config
   npm install -D drizzle-kit @types/pg
   ```

3. **Enable strict TypeScript** — in `tsconfig.json` set `"strict": true`

4. **Create `.env.example`**
   ```
   PORT=3000
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chatdb
   REDIS_URL=redis://localhost:6379
   ```
   Also create `.env` (same content, not committed).

5. **Create `docker-compose.yml`**
   ```yaml
   version: '3.8'
   services:
     postgres:
       image: postgres:16-alpine
       environment:
         POSTGRES_USER: postgres
         POSTGRES_PASSWORD: postgres
         POSTGRES_DB: chatdb
       ports:
         - '5432:5432'
       volumes:
         - pgdata:/var/lib/postgresql/data
     redis:
       image: redis:7-alpine
       ports:
         - '6379:6379'
   volumes:
     pgdata:
   ```

6. **Create `drizzle.config.ts`** at project root
   ```ts
   import type { Config } from 'drizzle-kit';
   export default {
     schema: './src/database/schema/index.ts',
     out: './drizzle',
     dialect: 'postgresql',
     dbCredentials: { url: process.env.DATABASE_URL! },
   } satisfies Config;
   ```

7. **Wire `ConfigModule`** in `app.module.ts` — `ConfigModule.forRoot({ isGlobal: true })`

8. **Set global prefix** in `main.ts` — `app.setGlobalPrefix('api/v1')`

9. **Enable `ValidationPipe`** globally in `main.ts`:
   ```ts
   app.useGlobalPipes(new ValidationPipe({
     whitelist: true,
     forbidNonWhitelisted: true,
     transform: true,
   }));
   ```

10. **Add npm scripts** to `package.json`:
    ```json
    "migration:generate": "drizzle-kit generate",
    "migration:run": "drizzle-kit migrate",
    "migration:studio": "drizzle-kit studio"
    ```

**Verify:** `docker compose up -d` → `npm run start:dev` → `GET http://localhost:3000/api/v1` returns 404 (not a crash).

---

## Part 2 — Response Envelope & Error Handling

**Session prompt:**
> "Read IMPLEMENTATION_GUIDE.md and implement Part 2 — Response Envelope & Error Handling."

**What to build:**
Global interceptor for success responses + global exception filter for errors. Every response must match the envelope contract from this point on.

**Files to create:**
- `src/common/interceptors/response.interceptor.ts`
- `src/common/filters/http-exception.filter.ts`
- `src/common/exceptions/app.exception.ts`

**`app.exception.ts`**
```ts
import { HttpException } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(status: number, public readonly code: string, message: string) {
    super({ code, message }, status);
  }
}
```

**`response.interceptor.ts`** — wraps any non-null response in `{ success: true, data: ... }`
```ts
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(map(data => ({ success: true, data })));
  }
}
```

**`http-exception.filter.ts`** — catches ALL exceptions, formats them:
- If it is an `AppException` → use its `code` and `message`
- If it is a `BadRequestException` from ValidationPipe → code = `VALIDATION_ERROR`, message = first validation message
- All other `HttpException` → map status to a sensible code
- Unknown errors → 500, code = `INTERNAL_ERROR`

**Register globally in `main.ts`:**
```ts
app.useGlobalInterceptors(new ResponseInterceptor());
app.useGlobalFilters(new HttpExceptionFilter());
```

**Verify:** Hit any non-existent route → should return `{ success: false, error: { code: "...", message: "..." } }`.

---

## Part 3 — Database Schema

**Session prompt:**
> "Read IMPLEMENTATION_GUIDE.md and implement Part 3 — Database Schema."

**What to build:**
Drizzle schema for all three tables + a global DrizzleModule + run the first migration.

**Files to create:**
- `src/database/schema/users.schema.ts`
- `src/database/schema/rooms.schema.ts`
- `src/database/schema/messages.schema.ts`
- `src/database/schema/index.ts`
- `src/database/database.provider.ts`
- `src/database/database.module.ts`

**`users.schema.ts`**
```ts
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id:        text('id').primaryKey(),
  username:  text('username').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

**`rooms.schema.ts`**
```ts
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const rooms = pgTable('rooms', {
  id:        text('id').primaryKey(),
  name:      text('name').notNull().unique(),
  createdBy: text('created_by').notNull(),   // username string, not FK
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

**`messages.schema.ts`**
```ts
import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';

export const messages = pgTable('messages', {
  id:        text('id').primaryKey(),
  roomId:    text('room_id').notNull(),
  username:  text('username').notNull(),
  content:   text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('messages_room_created_idx').on(t.roomId, t.createdAt)]);
```

**`database.provider.ts`** — creates drizzle instance from `DATABASE_URL` env var using `pg` Pool.

**`database.module.ts`** — `@Global()` module that provides the drizzle db instance under the token `DRIZZLE_DB`. Export it so all modules can inject `@Inject('DRIZZLE_DB')`.

**Run migration:**
```bash
npm run migration:generate -- --name init
npm run migration:run
```

**Verify:** Connect to PostgreSQL → confirm all 3 tables + index exist.

---

## Part 4 — Redis Module

**Session prompt:**
> "Read IMPLEMENTATION_GUIDE.md and implement Part 4 — Redis Module."

**What to build:**
A global Redis module that provides a typed `RedisService` with all key operations needed by the rest of the app.

**Files to create:**
- `src/redis/redis.module.ts`
- `src/redis/redis.service.ts`

**`redis.module.ts`** — `@Global()` module. Creates an `ioredis` client from `REDIS_URL` and provides it + `RedisService`.

**`redis.service.ts`** — inject the ioredis client, expose these methods:

```ts
// Sessions
setSession(token: string, data: { userId: string; username: string }): Promise<void>
getSession(token: string): Promise<{ userId: string; username: string } | null>
deleteSession(token: string): Promise<void>

// Active users per room
addActiveUser(roomId: string, username: string): Promise<void>
removeActiveUser(roomId: string, username: string): Promise<void>
getActiveUsers(roomId: string): Promise<string[]>
getActiveUserCount(roomId: string): Promise<number>

// Socket metadata (for disconnect cleanup)
setSocketMeta(socketId: string, data: { username: string; roomId: string }): Promise<void>
getSocketMeta(socketId: string): Promise<{ username: string; roomId: string } | null>
deleteSocketMeta(socketId: string): Promise<void>

// Pub/sub
publish(channel: string, payload: object): Promise<void>
```

**Key schema (re-stated for clarity):**
- `session:<token>` → JSON string, TTL 86400
- `room:active:<roomId>` → Redis Set, no TTL
- `socket:<socketId>` → JSON string, TTL 3600

**Verify:** Write a temporary test in a controller or `onModuleInit` that sets and gets a key — remove after confirming.

---

## Part 5 — Session Guard & Auth Infrastructure

**Session prompt:**
> "Read IMPLEMENTATION_GUIDE.md and implement Part 5 — Session Guard & Auth Infrastructure."

**What to build:**
The `SessionGuard` that validates every request (except `/login`) + a `@CurrentUser()` decorator.

**Files to create:**
- `src/common/guards/session.guard.ts`
- `src/common/decorators/current-user.decorator.ts`

**`session.guard.ts`**
1. Read `Authorization` header → split on `Bearer ` → extract token
2. If missing → throw `AppException(401, 'UNAUTHORIZED', 'Missing or expired session token')`
3. Call `redisService.getSession(token)`
4. If null → throw same `AppException(401, ...)`
5. Attach to request: `request.user = { userId, username }`
6. Return `true`

**`current-user.decorator.ts`**
```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const CurrentUser = createParamDecorator(
  (_data, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);
```

**Register `SessionGuard` globally** in `app.module.ts` using `APP_GUARD` provider. Then exclude `/login` by adding a `@Public()` decorator or by checking the route metadata with a `Reflector`.

**Pattern for `@Public()` decorator:**
```ts
// src/common/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);
```
In `SessionGuard.canActivate`, check `reflector.get(IS_PUBLIC, context.getHandler())` → return true immediately if set.

**Verify:** `GET /api/v1/rooms` without token → `401 UNAUTHORIZED`. With a manually Redis-inserted session → `404` (no rooms yet, but no auth error).

---

## Part 6 — Users Module

**Session prompt:**
> "Read IMPLEMENTATION_GUIDE.md and implement Part 6 — Users Module."

**What to build:**
A simple `UsersService` for DB-level user operations. No controller — this is an internal service only.

**Files to create:**
- `src/users/users.module.ts`
- `src/users/users.service.ts`

**`users.service.ts`** methods:

```ts
findByUsername(username: string): Promise<User | null>
  // SELECT * FROM users WHERE username = $1

create(username: string): Promise<User>
  // INSERT INTO users (id, username) VALUES ($1, $2) RETURNING *
  // id = `usr_${nanoid()}`

findOrCreate(username: string): Promise<User>
  // findByUsername → if exists return it, else create()
```

**Return type shape** (what other services expect):
```ts
{ id: string; username: string; createdAt: Date }
```

**Verify:** No direct test here — verified as part of Part 7 login flow.

---

## Part 7 — Auth Endpoint (POST /login)

**Session prompt:**
> "Read IMPLEMENTATION_GUIDE.md and implement Part 7 — Auth Endpoint."

**What to build:**
`POST /api/v1/login` — the only public endpoint. Returns an existing or new user with a fresh session token.

**Files to create:**
- `src/auth/auth.module.ts`
- `src/auth/auth.controller.ts`
- `src/auth/auth.service.ts`
- `src/auth/dto/login.dto.ts`

**`login.dto.ts`**
```ts
import { IsString, Matches, Length } from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(2, 24)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'username may only contain letters, numbers, and underscores' })
  username: string;
}
```

**`auth.service.ts`** — `login(username: string)`:
1. `usersService.findOrCreate(username)` → get user
2. Generate token: `randomBytes(32).toString('hex')`
3. `redisService.setSession(token, { userId: user.id, username: user.username })`
4. Return `{ sessionToken: token, user: { id, username, createdAt } }`

**`auth.controller.ts`**
```ts
@Public()
@HttpCode(200)          // important: must be 200, not 201
@Post('login')
async login(@Body() dto: LoginDto) {
  return this.authService.login(dto.username);
}
```

**Verify:**
```bash
curl -X POST http://localhost:3000/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ali_123"}'
# → { success: true, data: { sessionToken: "...", user: { id: "usr_...", ... } } }

# Call again with same username → same user.id, new sessionToken
```

---

## Part 8 — Rooms Module (REST)

**Session prompt:**
> "Read IMPLEMENTATION_GUIDE.md and implement Part 8 — Rooms Module."

**What to build:**
All 4 rooms endpoints. All require auth (no `@Public()`).

**Files to create:**
- `src/rooms/rooms.module.ts`
- `src/rooms/rooms.controller.ts`
- `src/rooms/rooms.service.ts`
- `src/rooms/dto/create-room.dto.ts`

**`create-room.dto.ts`**
```ts
@IsString()
@Length(3, 32)
@Matches(/^[a-zA-Z0-9-]+$/, { message: 'name may only contain letters, numbers, and hyphens' })
name: string;
```

**`rooms.service.ts`** methods:

```ts
findAll(): Promise<Room[]>
  // SELECT all rooms, then merge activeUsers count from Redis for each

findById(id: string): Promise<Room>
  // SELECT * FROM rooms WHERE id = $1
  // null → throw AppException(404, 'ROOM_NOT_FOUND', `Room with id ${id} does not exist`)
  // merge activeUsers from Redis

create(name: string, createdBy: string): Promise<Room>
  // check uniqueness: SELECT id FROM rooms WHERE name = $1
  // if exists → throw AppException(409, 'ROOM_NAME_TAKEN', 'A room with this name already exists')
  // INSERT and return (no activeUsers field in create response)

delete(id: string, requestingUsername: string): Promise<void>
  // findById (throws 404 if not found)
  // check room.createdBy === requestingUsername → else throw AppException(403, 'FORBIDDEN', ...)
  // publish { roomId: id } to Redis channel `room:${id}:deleted`
  // DELETE messages WHERE room_id = id (in transaction)
  // DELETE rooms WHERE id = id (in transaction)
```

**`rooms.controller.ts`** routes:
```
GET    /rooms          → findAll()
POST   /rooms          → create(dto.name, currentUser.username)   @HttpCode(201)
GET    /rooms/:id      → findById(id)
DELETE /rooms/:id      → delete(id, currentUser.username)
```

**Room response shape:**
```ts
// GET /rooms and GET /rooms/:id
{ id, name, createdBy, activeUsers: number, createdAt }

// POST /rooms (no activeUsers)
{ id, name, createdBy, createdAt }

// DELETE /rooms/:id
{ deleted: true }
```

**Verify:**
```bash
TOKEN="<from login>"

# Create
curl -X POST http://localhost:3000/api/v1/rooms \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"general"}'

# List
curl http://localhost:3000/api/v1/rooms -H "Authorization: Bearer $TOKEN"

# Duplicate → 409
# Delete by non-creator → 403
```

---

## Part 9 — Messages Module (REST)

**Session prompt:**
> "Read IMPLEMENTATION_GUIDE.md and implement Part 9 — Messages Module."

**What to build:**
2 endpoints for message history and sending. Sending must publish to Redis — **not emit directly**.

**Files to create:**
- `src/messages/messages.module.ts`
- `src/messages/messages.controller.ts`
- `src/messages/messages.service.ts`
- `src/messages/dto/create-message.dto.ts`
- `src/messages/dto/get-messages.dto.ts`

**`create-message.dto.ts`**
```ts
@IsString()
@MinLength(1, { message: 'content must not be empty' })
@MaxLength(1000, { message: 'Message content must not exceed 1000 characters' })
content: string;
// trimming happens in service, not DTO
```

**`get-messages.dto.ts`**
```ts
@IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number)
limit: number = 50;

@IsOptional() @IsString()
before?: string;   // message ID cursor
```

**`messages.service.ts`** methods:

```ts
getMessages(roomId: string, limit: number, before?: string): Promise<MessagesPage>
  // 1. verify room exists (findRoomById from RoomsService or inline)
  // 2. if before provided:
  //      SELECT created_at FROM messages WHERE id = before → get cursor timestamp
  //      SELECT * FROM messages WHERE room_id = $roomId AND created_at < cursorTs
  //        ORDER BY created_at DESC LIMIT limit + 1
  //    else:
  //      SELECT * FROM messages WHERE room_id = $roomId
  //        ORDER BY created_at DESC LIMIT limit + 1
  // 3. hasMore = results.length > limit
  // 4. slice to limit, reverse to ASC order for response
  // 5. nextCursor = hasMore ? results[limit - 1].id : null
  // return { messages, hasMore, nextCursor }

sendMessage(roomId: string, username: string, content: string): Promise<Message>
  // 1. verify room exists → 404 if not
  // 2. trim content → if empty throw AppException(422, 'MESSAGE_EMPTY', ...)
  // 3. INSERT message with id = `msg_${nanoid()}`
  // 4. redisService.publish(`room:${roomId}:messages`, { id, roomId, username, content, createdAt })
  // 5. return the saved message (do NOT emit WS here)
```

**`messages.controller.ts`** routes:
```
GET  /rooms/:id/messages   → getMessages(id, dto.limit, dto.before)
POST /rooms/:id/messages   → sendMessage(id, currentUser.username, dto.content)  @HttpCode(201)
```

**Verify:**
```bash
# Send a message
curl -X POST http://localhost:3000/api/v1/rooms/$ROOM_ID/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"hello everyone"}'

# Get messages
curl "http://localhost:3000/api/v1/rooms/$ROOM_ID/messages?limit=10" \
  -H "Authorization: Bearer $TOKEN"

# Pagination: use nextCursor value as before= param
```

---

## Part 10 — WebSocket Gateway

**Session prompt:**
> "Read IMPLEMENTATION_GUIDE.md and implement Part 10 — WebSocket Gateway."

**What to build:**
The Socket.io `/chat` namespace gateway with full connection lifecycle + Redis pub/sub subscriptions for fan-out.

**Files to create:**
- `src/gateway/chat.gateway.ts`
- `src/gateway/gateway.module.ts`

**Adapter setup in `main.ts`** (add after creating the app):
```ts
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

const pubClient = new Redis(process.env.REDIS_URL);
const subClient = pubClient.duplicate();
const io = app.get(Server); // NestJS Socket.io server reference
io.adapter(createAdapter(pubClient, subClient));
```

Actually, the cleaner NestJS pattern is to configure the adapter inside the gateway using `afterInit`:
```ts
@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  afterInit(server: Server) {
    const pubClient = new Redis(process.env.REDIS_URL);
    const subClient = pubClient.duplicate();
    server.adapter(createAdapter(pubClient, subClient));
    // also subscribe to Redis channels here (see below)
  }
```

**`handleConnection(client: Socket)`:**
1. Extract `token` and `roomId` from `client.handshake.query`
2. Look up session: `redisService.getSession(token)` → if null: `client.emit('error', { code: 401 }); client.disconnect(); return;`
3. Look up room in DB → if not found: `client.emit('error', { code: 404 }); client.disconnect(); return;`
4. `redisService.addActiveUser(roomId, username)`
5. `redisService.setSocketMeta(client.id, { username, roomId })`
6. `client.join(roomId)` — join Socket.io room (used for local emit; adapter handles cross-instance)
7. `const activeUsers = await redisService.getActiveUsers(roomId)`
8. Emit to connecting client only: `client.emit('room:joined', { activeUsers })`
9. Broadcast to others in room: `client.to(roomId).emit('room:user_joined', { username, activeUsers })`

**`handleDisconnect(client: Socket)`:**
1. `const meta = await redisService.getSocketMeta(client.id)`
2. If null → return (already cleaned up or unknown socket)
3. `redisService.removeActiveUser(meta.roomId, meta.username)`
4. `redisService.deleteSocketMeta(client.id)`
5. `const activeUsers = await redisService.getActiveUsers(meta.roomId)`
6. `this.server.to(meta.roomId).emit('room:user_left', { username: meta.username, activeUsers })`

**`@SubscribeMessage('room:leave')` handler:**
1. Look up socket meta
2. Run same cleanup as disconnect
3. `client.leave(meta.roomId)`
4. `client.disconnect()`

**Redis pub/sub subscriptions (in `afterInit`):**
Create a dedicated ioredis subscriber client (separate from the adapter clients):
```ts
const subClient = new Redis(process.env.REDIS_URL);
subClient.psubscribe('room:*:messages', 'room:*:deleted');
subClient.on('pmessage', (_pattern, channel, messageStr) => {
  const payload = JSON.parse(messageStr);
  if (channel.endsWith(':messages')) {
    const roomId = channel.split(':')[1];
    this.server.to(roomId).emit('message:new', {
      id: payload.id,
      username: payload.username,
      content: payload.content,
      createdAt: payload.createdAt,
    });
  } else if (channel.endsWith(':deleted')) {
    const roomId = channel.split(':')[1];
    this.server.to(roomId).emit('room:deleted', { roomId });
  }
});
```

**Important rules:**
- Never track connections in JS `Map` or object — always Redis
- `client.to(roomId)` broadcasts to all in room **except** the sender
- `this.server.to(roomId)` broadcasts to **all** including sender
- `message:new` uses `this.server.to(roomId)` (all clients)
- `room:user_joined` uses `client.to(roomId)` (excluding connector)
- `room:user_left` uses `this.server.to(roomId)` (all remaining)

**Verify using a WebSocket client (e.g., Insomnia or a small HTML test page):**
1. Login → get token
2. Create a room → get roomId
3. Connect to `ws://localhost:3000/chat?token=<token>&roomId=<roomId>`
4. Should receive `room:joined` immediately
5. Connect a second client → first client should receive `room:user_joined`
6. `POST /rooms/:id/messages` → both clients should receive `message:new`
7. Disconnect second client → first should receive `room:user_left`

---

## Part 11 — Documentation

**Session prompt:**
> "Read IMPLEMENTATION_GUIDE.md and implement Part 11 — Documentation."

**What to build:**
`README.md` and `ARCHITECTURE.md` at the project root.

**`README.md` must include:**
- Project overview (one paragraph)
- Prerequisites: Node 20+, Docker, Docker Compose
- Setup steps:
  ```bash
  git clone <repo>
  cp .env.example .env
  docker compose up -d
  npm install
  npm run migration:run
  npm run start:dev
  ```
- Environment variables table (NAME | Default | Description)
- Running in production: `npm run build && npm run start:prod`
- WebSocket connection example (with wscat or browser snippet)

**`ARCHITECTURE.md` must include (per task requirements):**

1. **Architecture overview** — include a Mermaid diagram:
   ```
   Client → NestJS (REST + WS Gateway)
                ↓
         PostgreSQL (Drizzle)
                ↓
         Redis (sessions, active users, pub/sub)
                ↓
   NestJS Instance 2 ← Redis adapter → NestJS Instance 1
   ```

2. **Session strategy** — opaque 32-byte hex token, stored as `session:<token>` in Redis with 24h TTL. No JWT — avoids revocation complexity. On every authenticated request, Redis lookup validates and retrieves user context.

3. **Redis pub/sub fan-out** — when `POST /messages` is called on instance A, it publishes to `room:<roomId>:messages`. The Socket.io Redis adapter replicates the emit to all instances. Additionally, a raw psubscribe on `room:*:messages` translates REST-published events into WS emits.

4. **Concurrent user capacity** — reason through: each WS connection ~50KB memory, Node.js event loop bottleneck, Redis RTT ~1ms. Estimate 2,000–5,000 concurrent WS connections per instance on a 512MB container.

5. **10× scaling plan** — horizontal NestJS instances behind a load balancer (sticky sessions or stateless via Redis adapter), PG read replicas for message history, Redis Cluster for pub/sub throughput.

6. **Known limitations** — no message delivery guarantee (fire-and-forget pub/sub), Redis single point of failure, username uniqueness is the only identity (no account security), no rate limiting.

---

## Part 12 — Deployment

**Session prompt:**
> "Read IMPLEMENTATION_GUIDE.md and implement Part 12 — Deployment."

**What to build:**
Deploy to Render (or Railway). Confirm all endpoints and WebSocket work on the live URL.

**Steps (Render):**

1. Push source to a public GitHub repo

2. Create a `render.yaml` at project root:
   ```yaml
   services:
     - type: web
       name: anonymous-chat-api
       env: node
       buildCommand: npm install && npm run build && npm run migration:run
       startCommand: npm run start:prod
       envVars:
         - key: DATABASE_URL
           fromDatabase:
             name: chatdb
             property: connectionString
         - key: REDIS_URL
           fromService:
             name: chat-redis
             type: redis
             property: connectionString
         - key: PORT
           value: 10000
   
   databases:
     - name: chatdb
       plan: free
   
   redis:
     - name: chat-redis
       plan: free
   ```

3. Connect GitHub repo in Render dashboard → auto-deploy on push

4. After deployment, verify:
   ```bash
   BASE=https://<your-render-url>.onrender.com/api/v1
   curl -X POST $BASE/login -H "Content-Type: application/json" -d '{"username":"testuser"}'
   ```

5. Update `ARCHITECTURE.md` with the live URL

6. Mark all deliverables checklist items complete in `TASK.md`

---

## Cross-Cutting Reminders (read before every session)

1. **Never raw SQL** — all DB access through Drizzle query builder
2. **Never in-memory Maps for socket state** — always Redis
3. **Never emit `message:new` from the REST controller** — publish to Redis, let the gateway emit
4. **Always trim message content in the service** before validation check
5. **`POST /login` is 200**, not 201
6. **`POST /rooms` is 201**, `DELETE /rooms/:id` is 200
7. **`activeUsers` in room responses is a live Redis count**, never a DB column
8. **`nextCursor` must be `null` (not omitted, not `undefined`)** when there are no more pages
9. **WebSocket namespace is `/chat`** — not the default namespace
10. **Token query param for WS is `token`**, room is `roomId`
