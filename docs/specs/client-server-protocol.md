# GameHub Spec: Client-Server Protocol

## Status

- Status: Draft v1
- Type: Technical specification
- Source documents:
  - [docs/business-spec.md](/Users/jakubsieradzki/repos/yathzee/docs/business-spec.md)
  - [ROADMAP.md](/Users/jakubsieradzki/repos/yathzee/ROADMAP.md)
  - [docs/specs/session-lifecycle-and-reconnect.md](/Users/jakubsieradzki/repos/yathzee/docs/specs/session-lifecycle-and-reconnect.md)

## 1. Purpose

This document defines the client-server protocol for GameHub across REST and
Socket transport boundaries.

It specifies:

- protocol structure and conventions
- session bootstrap flows
- hub and game event groups
- snapshot and patch rules
- error handling rules
- presence and heartbeat expectations

This spec is intended to turn current behavior into an explicit contract that
future engine and game work must follow.

## 2. Decisions Used In This Draft

This draft follows the currently recommended direction:

- hub and game use separate event sets
- both share one common protocol convention
- authoritative recovery is always full-state based
- `participantId` is the identity key
- `playerIndex` is not an identity key
- protocol versioning exists from the start
- errors use domain codes, not free-form text
- patches are optional optimization, not authoritative truth
- REST bootstrap and Socket flows are part of one protocol spec

## 3. Goals

The protocol must:

- support fast session creation and joining
- support stable reconnect and restore
- separate transport concerns from game logic
- allow role-aware state serialization
- remain understandable enough for contributors adding new games

The protocol must not:

- depend on client-local derived state for correctness
- rely on incremental events for recovery
- use UI ordering fields as identity

## 4. Protocol Model

GameHub uses two communication layers:

- REST for bootstrap and non-realtime entry flows
- Socket for authenticated realtime state, actions, presence, and transitions

There are two domain channels:

- `hub`
- `game`

These are separate domains, but they share one protocol convention.

## 5. Shared Protocol Convention

## 5.1 Versioning

Every protocol message that crosses the socket boundary must be associated with
one protocol version.

Current version:

```ts
type ProtocolVersion = 1;
```

Recommended rule:

- REST responses expose `protocolVersion`
- first successful socket state response also includes `protocolVersion`
- client must reject unsupported future versions

This is light versioning, not full backward compatibility machinery.

## 5.2 Envelope

Socket events may stay domain-named for ergonomics, but the payload structure
must follow one envelope convention.

Recommended conceptual shape:

```ts
type Domain = 'hub' | 'game' | 'platform';

interface ProtocolEnvelope<TPayload> {
  protocolVersion: 1;
  domain: Domain;
  type: string;
  sessionId: string;
  sentAt: number;
  payload: TPayload;
}
```

Notes:

- `sessionId` means the current hub id or game id, depending on domain
- `type` is the semantic message type inside the domain
- transport event names may still be stable domain event names such as
  `hub:state` or `game:state`

## 5.3 Identity Fields

Protocol payloads must use:

- `participantId` for identity
- `role` for authorization context
- `playerIndex` only where ordering or seat position is needed

The protocol must not treat `playerIndex` as a stable identifier.

## 5.4 Error Format

All protocol-visible errors must use domain error codes.

Recommended shape:

```ts
interface ProtocolErrorPayload {
  code: string;
  message?: string;
  details?: Record<string, unknown>;
}
```

Rules:

- `code` is mandatory
- `message` is optional debug context, not UI text
- UI localization maps from `code`

Examples:

- `error.invalidToken`
- `error.sessionNotFound`
- `error.hostOnly`
- `error.maxPlayers`
- `error.playerRemoved`
- `error.protocolVersionUnsupported`

## 6. Session Bootstrap

Bootstrap starts over REST. Realtime state starts over Socket.

## 6.1 REST Responsibilities

REST is responsible for:

- create session
- join session
- initial restore lookup if needed in future
- non-realtime administrative commands where appropriate

Socket is responsible for:

- authenticated attachment to a live session
- authoritative state delivery
- presence
- realtime actions and transitions

## 6.2 REST Endpoints In Scope

Current and target bootstrap surface:

### Hub

- `POST /api/hub`
- `POST /api/hub/:hubId/join`
- `GET /api/hub/:hubId`
- `DELETE /api/hub/:hubId/players/:playerId`
- `POST /api/hub/:hubId/games`
- `POST /api/hub/:hubId/finish-game`

### Game

- `GET /api/game-types`
- `POST /api/games`
- `POST /api/games/:gameId/join`
- `GET /api/games/:gameId`

## 6.3 REST Response Rules

Every successful create/join/get response should include:

- `protocolVersion`
- session identifier
- role context where relevant

Join/create responses should include resume credentials.

Recommended examples:

```ts
interface CreateHubResponse {
  protocolVersion: 1;
  hubId: string;
  participantId: string;
  role: 'host';
  resumeToken: string;
}

interface JoinHubResponse {
  protocolVersion: 1;
  hubId: string;
  participantId: string;
  role: 'player';
  resumeToken: string;
}

interface CreateGameResponse {
  protocolVersion: 1;
  gameId: string;
  participantId: string;
  role: 'host';
  resumeToken: string;
}

interface JoinGameResponse {
  protocolVersion: 1;
  gameId: string;
  participantId: string;
  role: 'player';
  resumeToken: string;
}
```

## 7. Socket Authentication And Attach

## 7.1 Authentication Principle

A socket is not part of a hub or game session until it successfully attaches
using a valid `resumeToken`.

## 7.2 Attach Events

Separate attach events are allowed and recommended:

- `hub:connect`
- `game:connect`

Recommended payload:

```ts
interface ConnectPayload {
  protocolVersion: 1;
  sessionId: string;
  resumeToken: string;
}
```

Rules:

- client sends attach after socket connect or reconnect
- server validates session and token
- server rebinds the socket to the existing participant identity
- server responds with full state on success
- server responds with protocol error on failure

## 7.3 Duplicate Connection Rule

If the same participant attaches from a new socket while another socket is still
bound, the newest authenticated socket becomes authoritative.

The old socket must be detached or disconnected.

## 8. State Delivery Model

## 8.1 Full State Is Authoritative

The server must always be able to send a full authoritative state.

Full state is mandatory:

- after successful socket attach
- after reconnect
- after lifecycle transitions that materially change session structure
- whenever the server determines client state may be stale

## 8.2 Patches Are Optional

Patches exist to improve UI responsiveness, not to define truth.

Rules:

- client may apply patches optimistically
- client must accept later full state as authoritative
- protocol correctness must not depend on every patch arriving in order forever

## 8.3 Role-Aware State Serialization

There is one logical state event per domain, but payload may differ by role.

That means:

- host and player both receive `hub:state` or `game:state`
- the server may serialize different payload content depending on role
- hidden information is a serialization concern, not a separate event family

## 9. Hub Domain Protocol

## 9.1 Hub State Event

Transport event:

- `hub:state`

Recommended payload:

```ts
interface HubStatePayload {
  protocolVersion: 1;
  hubId: string;
  participantId: string;
  role: 'host' | 'player';
  lifecycleState: 'lobby' | 'launching_game' | 'game_active' | 'returning_to_lobby' | 'closed';
  mode: 'multiplayer' | 'local';
  activeGameId: string | null;
  participants: Array<{
    participantId: string;
    displayName: string;
    role: 'host' | 'player';
    presence: 'connected' | 'disconnected';
  }>;
  gameHistory: Array<{
    gameId: string;
    gameType: string;
    gameName: string;
    finishedAt: string;
    participantIds: string[];
  }>;
}
```

## 9.2 Hub Events

Recommended server-to-client events:

- `hub:state`
- `hub:participant-joined`
- `hub:participant-presence`
- `hub:participant-removed`
- `hub:game-created`
- `hub:game-finished`
- `hub:error`

Recommended client-to-server events:

- `hub:connect`

Notes:

- hub actions like create game or remove player may remain REST-driven
- if moved to sockets later, they must still follow the same envelope rules

## 9.3 Hub Event Payload Principles

`hub:participant-joined`

- include `participantId`, `displayName`, `role`

`hub:participant-presence`

- include `participantId`, `presence`

`hub:participant-removed`

- include `participantId`

`hub:game-created`

- include `gameId`, `gameType`

`hub:game-finished`

- include `gameId`

## 10. Game Domain Protocol

## 10.1 Game State Event

Transport event:

- `game:state`

Recommended payload:

```ts
interface GameStatePayload<TGameState = unknown> {
  protocolVersion: 1;
  gameId: string;
  gameType: string;
  participantId: string;
  role: 'host' | 'player';
  lifecycleState: 'lobby' | 'starting' | 'in_game' | 'round_result' | 'game_result' | 'closed';
  playerIndex: number | null;
  participants: Array<{
    participantId: string;
    displayName: string;
    role: 'host' | 'player';
    playerIndex: number | null;
    presence: 'connected' | 'disconnected';
  }>;
  gameState: TGameState;
}
```

Notes:

- `playerIndex` is included for ordering and seat mapping
- `participantId` remains the identity key
- `gameState` is plugin-serialized and may vary by role

## 10.2 Game Events

Recommended server-to-client events:

- `game:state`
- `game:state-patch`
- `game:participant-joined`
- `game:participant-presence`
- `game:error`

Recommended client-to-server events:

- `game:connect`
- `game:action`

## 10.3 Game Action Event

Transport event:

- `game:action`

Recommended payload:

```ts
interface GameActionPayload<TPayload = unknown> {
  protocolVersion: 1;
  action: string;
  requestId: string;
  payload: TPayload;
}
```

Rules:

- `action` is game-specific or platform-reserved
- `requestId` is required for tracing and idempotency handling in future
- server validates actor identity from socket attachment, not from payload

The client must not send `participantId` or `playerIndex` as proof of authority.
Those may appear in payload only as target references where the action semantics
require them.

## 10.4 Reserved Platform-Level Game Actions

Reserved actions owned by the platform:

- `start`
- `finish-game`
- `remove-player`

Game plugins may define their own actions, for example:

- `score:update`
- `configure`
- `answer`
- `next-question`

## 11. Patch Protocol

## 11.1 Patch Role

`game:state-patch` is an optional optimization event.

It exists for:

- smoother UI updates
- lightweight counters and timers
- local perceived responsiveness

It does not exist for:

- authoritative recovery
- mandatory event sourcing

## 11.2 Patch Payload

Recommended minimum shape:

```ts
interface GameStatePatchPayload<TPatch = unknown> {
  protocolVersion: 1;
  gameId: string;
  patchType: string;
  patch: TPatch;
}
```

Rules:

- patch naming must be explicit
- patch application must be safe to ignore if a later full state arrives
- lifecycle-changing operations should usually trigger a full `game:state`

Examples of good patch use:

- timer tick
- answer count update
- single-cell score change

Examples where full state is preferred:

- reconnect
- end of round
- game finished
- player removal
- phase transition that changes structure or visible permissions

## 12. Presence And Heartbeat

## 12.1 Presence Contract

Presence is part of the protocol contract even if heartbeat implementation lives
at a lower transport layer.

Participant presence values exposed to clients:

- `connected`
- `disconnected`

`removed` is a server lifecycle state, not a normal visible presence value.

## 12.2 Heartbeat Principle

The transport layer must be able to detect dead connections and transition
participant presence to `disconnected` within a bounded time.

This spec does not lock the exact heartbeat implementation, but it requires:

- presence transitions are deterministic
- stale sockets are eventually detached
- reconnect leads to fresh full-state delivery

## 12.3 Presence Events

Recommended events:

- `hub:participant-presence`
- `game:participant-presence`

Payload shape:

```ts
interface PresencePayload {
  protocolVersion: 1;
  participantId: string;
  presence: 'connected' | 'disconnected';
}
```

## 13. Error Handling

## 13.1 Error Event Families

Each domain has its own error event:

- `hub:error`
- `game:error`

REST continues to use HTTP status codes plus structured error bodies.

## 13.2 Error Body

Recommended body:

```ts
interface ErrorPayload {
  protocolVersion: 1;
  code: string;
  details?: Record<string, unknown>;
}
```

## 13.3 Required Error Cases

The protocol must be able to represent at least:

- session not found
- invalid token
- unsupported protocol version
- unauthorized action
- host-only action rejected
- participant removed
- max players reached
- invalid payload
- game already active
- no players selected

## 14. REST Error Rules

REST errors must use:

- appropriate HTTP status
- structured error response body
- domain code

Recommended shape:

```ts
interface RestErrorResponse {
  protocolVersion: 1;
  error: {
    code: string;
    details?: Record<string, unknown>;
  };
}
```

Recommended mapping examples:

- `400` invalid input or action precondition
- `401` missing credential
- `403` unauthorized for that role
- `404` session or participant not found
- `409` state conflict

## 15. Serialization Rules For Hidden Information

The protocol must support hidden information without forking the domain event
surface.

Rule:

- the server serializes one role-aware state payload from one underlying session

Examples:

- quiz player does not receive the correct answer during question phase
- host may receive broader room or answer visibility
- spectators in the future may receive yet another view

This is compatible with the current plugin direction and should remain the
standard model.

## 16. Idempotency And Ordering

## 16.1 Current Requirement

The protocol is not fully event-sourced, but it should already prepare for safer
retries and diagnostics.

Therefore:

- client requests should include `requestId`
- server should be able to log request correlation
- reconnect correctness must not depend on patch ordering

## 16.2 Future Extension

This spec does not require a full room event queue implementation yet, but it
does not block one either.

A later spec may add:

- stronger ordering guarantees
- idempotency rules for selected actions
- replay/event history semantics

## 17. Mapping To Current Codebase

This spec implies the following evolution from the current code:

- `game:error` and `hub:error` payloads should move toward structured codes
- `game:connect` and `hub:connect` should authenticate with explicit
  `protocolVersion` and durable `resumeToken`
- `game:state` and `hub:state` should expose `participantId` and lifecycle state
- `playerIndex` should stop being treated as identity
- REST join/create responses should include structured role and identity data
- client storage should preserve reconnect credentials durably
- patch handling in the client should remain subordinate to full-state recovery

## 18. Acceptance Criteria

This spec is satisfied when:

- a client can create or join via REST and then attach via Socket using the same
  protocol model
- reconnect always results in a full authoritative state response
- errors are represented as structured codes across REST and Socket
- host and player receive one state event family per domain with role-aware
  serialization
- `participantId` exists in the protocol and is treated as the stable identity
- `playerIndex` is not required for reconnect correctness
- patch delivery failure cannot permanently corrupt client understanding of state

## 19. Follow-Up Specs

This protocol spec should feed:

- runtime validation specification
- token and client storage specification
- room event processing specification
- core types and store refactor plan
- multiplayer integration test plan

## 20. Open Questions

These are intentionally left open for later documents:

- whether spectators should be modeled as a first-class role now or later
- whether selected admin actions should move fully from REST to Socket
- whether protocol envelopes should be visible in transport event payloads
  immediately or introduced in a compatibility step
