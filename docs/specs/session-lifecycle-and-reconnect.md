# GameHub Spec: Session Lifecycle And Reconnect

## Status

- Status: Draft v1
- Type: Technical specification
- Source documents:
  - [docs/business-spec.md](/Users/jakubsieradzki/repos/yathzee/docs/business-spec.md)
  - [ROADMAP.md](/Users/jakubsieradzki/repos/yathzee/ROADMAP.md)

## 1. Purpose

This document defines the lifecycle model for GameHub sessions and the rules
for participant identity, reconnect, and recovery after refresh or connection
loss.

Its goal is to remove ambiguity from multiplayer behavior before deeper
protocol, validation, and engine work begins.

This spec is intentionally earlier than the full protocol spec. It defines the
behavior the protocol must support, not every wire-level detail.

## 2. Why This Spec Exists

Today the platform already works, but session behavior is still implicit in the
implementation:

- player identity is token-based but not formally modeled
- reconnect exists in practice, but not as a defined platform contract
- `sessionStorage` is used in the client, which helps within a tab but is not a
  durable recovery model
- room lifecycle is represented too coarsely for long-term engine growth
- hub sessions and game sessions behave correctly enough, but their transitions
  are not described as a formal state machine

If this remains undocumented, future game additions will push more assumptions
into the core and reconnect behavior will keep being solved case by case.

## 3. Scope

This spec covers:

- hub session lifecycle
- game session lifecycle
- participant identity and presence model
- reconnect and restore behavior
- server rules for disconnect, reconnect, removal, and closure
- client storage and restore rules

This spec does not fully define:

- the final event envelope shape
- runtime validation schema library
- debug log format
- plugin API changes outside lifecycle concerns

Those belong to later technical specs.

## 4. Product Requirements Mapped

This spec directly supports:

- `BR-3 Stable 4-8 Player Experience`
- `BR-4 Session Continuity`
- `BR-5 Multi-Game Session Support`
- `BR-7 Host Control`
- `BR-10 Documentation-Driven Development`

## 5. Terminology

### Session

A top-level running instance owned by the server.

GameHub currently has two session types:

- `hub session`: persistent group context for a game night
- `game session`: one running game instance

### Participant

A host or player that belongs to a session and owns a stable identity within
that session.

### Presence

The current connectivity state of a participant from the product point of view.

### Resume token

An opaque secret that lets the client prove it should be re-associated with an
existing participant identity after refresh or reconnect.

### Transport connection

A single active socket connection. This is ephemeral and must not be confused
with participant identity.

## 6. Core Decisions

### D-1: Identity Is Stable, Connections Are Not

The platform must treat participant identity as durable within a session and
socket connections as replaceable attachments to that identity.

### D-2: Reconnect Uses Full-State Recovery

Reconnect must always be recoverable using a fresh full state from the server.
Incremental patches may improve responsiveness, but they are not the recovery
mechanism.

### D-3: Disconnect Does Not Mean Removal

A disconnected participant remains part of the session unless one of the
following happens:

- the host removes them
- the session is closed
- the server explicitly expires the session

### D-4: Hub Identity Is Reused Across Hub-Created Games

When a game is launched from a hub, the host and participating players keep the
same logical identity across the hub and that game session. The game session may
derive its own runtime state, but it must not invent a new human identity.

### D-5: Restore Credentials Must Survive Refresh

The client must persist resume credentials in a storage layer that survives page
refresh and tab recreation. `sessionStorage` alone is not sufficient as the
platform recovery contract.

## 7. Lifecycle Model

## 7.1 Hub Session Lifecycle

`hub session` is the durable multiplayer container for a game night.

Allowed states:

- `lobby`
- `launching_game`
- `game_active`
- `returning_to_lobby`
- `closed`

### State meanings

#### `lobby`

Default hub state.

- players may join
- players may reconnect
- host may remove players
- host may launch a game

#### `launching_game`

Short transitional state while the server creates a game from the selected hub
participants and publishes the transition.

- player roster is temporarily frozen
- new joins are rejected or deferred
- reconnect of existing participants is allowed

#### `game_active`

A hub-created game is active.

- `activeGameId` must be set
- the hub remains the parent container
- hub participants may reconnect to the hub even while the game is active

#### `returning_to_lobby`

Short transitional state after a game finishes and before the hub is fully back
to a stable lobby state.

This state exists so the system does not have to fake "instant lobby" while
cleanup and announcements are happening.

#### `closed`

The hub has ended and must reject new joins and reconnect attempts.

### Valid transitions

`lobby -> launching_game -> game_active -> returning_to_lobby -> lobby`

Also allowed:

- `lobby -> closed`
- `game_active -> closed`
- `returning_to_lobby -> closed`

## 7.2 Game Session Lifecycle

`game session` is the lifecycle for one concrete game instance.

Allowed states:

- `lobby`
- `starting`
- `in_game`
- `round_result`
- `game_result`
- `closed`

### State meanings

#### `lobby`

Pre-start state.

- participants may join or reconnect
- host may configure the game
- host may remove players where the mode allows it

#### `starting`

Short transitional state after the host starts the game but before active play
is considered fully underway.

This state exists to support:

- final roster locking
- consistent full-state delivery to all clients
- future ready checks or countdown logic

#### `in_game`

Main gameplay loop.

- gameplay actions are accepted
- reconnect is allowed
- participants keep their seat

#### `round_result`

Optional engine-visible state for games with explicit round breaks.

This should be used when the product needs a shared notion of "round ended" and
not only a plugin-private phase.

#### `game_result`

Final result state.

- final standings are visible
- reconnect must still be supported
- host may choose next action such as rematch, return to hub, or close

#### `closed`

No further participation is allowed.

### Valid transitions

Canonical path:

`lobby -> starting -> in_game -> round_result -> in_game -> game_result -> closed`

Allowed shortcuts:

- `lobby -> starting -> in_game -> game_result -> closed`
- `lobby -> closed`
- `in_game -> closed`
- `game_result -> lobby` only for an explicit rematch flow in a future spec

## 7.3 Participant Presence Lifecycle

Each participant has a presence state independent from the session lifecycle.

Allowed states:

- `connected`
- `disconnected`
- `removed`

### Rules

- `connected`: participant has an active authenticated socket
- `disconnected`: participant identity still exists, but no active socket is
  currently attached
- `removed`: participant is no longer part of the session and may not reconnect
  using the previous token

Valid transitions:

- `connected -> disconnected`
- `disconnected -> connected`
- `connected -> removed`
- `disconnected -> removed`

`removed -> connected` is never allowed.

## 8. Identity Model

## 8.1 Required identifiers

Every participant must have:

- `participantId`: stable identity inside the session
- `role`: `host` or `player`
- `resumeToken`: secret credential used for reconnect/restore
- `connectionId`: current socket binding, nullable

Recommended conceptual shape:

```ts
type ParticipantPresence = 'connected' | 'disconnected' | 'removed';

interface SessionParticipant {
  participantId: string;
  role: 'host' | 'player';
  displayName: string;
  resumeToken: string;
  connectionId: string | null;
  presence: ParticipantPresence;
  joinedAt: Date;
  lastSeenAt: Date;
  disconnectedAt: Date | null;
}
```

This does not force an immediate full refactor of the current in-memory store,
but the implementation must behave as if this model exists.

## 8.2 Identity rules for current product

### Hub

- host must have a stable hub identity
- each player must have a stable `participantId`
- reconnect to the hub must rebind to the same participant

### Quick Game

- host must have a stable game identity
- each player must have a stable game-specific `participantId`
- player seat must not be inferred only from `playerIndex`

### Hub-created game

- hub player identity is the source of truth
- game session may mirror hub participants, but must preserve the identity link
- participant mapping from hub to game must be explicit

## 9. Client Storage Model

## 9.1 Required storage behavior

Resume credentials must survive:

- page refresh
- browser tab recreation
- short offline periods on the same device

Therefore the authoritative restore credential must be stored in `localStorage`
or an equivalent durable client storage.

## 9.2 Storage separation

The client should distinguish:

- durable identity credentials
- transient UI navigation context

Recommended split:

- `localStorage`: resume credentials and participant identity references
- `sessionStorage`: optional route hints, temporary UI state, non-authoritative
  convenience keys

## 9.3 Clearing rules

Stored resume credentials must be cleared when:

- participant is removed from the session
- session is closed
- server responds that the token is invalid or expired
- user explicitly leaves the session in a future leave flow

## 10. Reconnect And Restore Flows

## 10.1 Transport reconnect without page refresh

Scenario:

- socket disconnects temporarily
- Socket.io reconnects automatically

Required behavior:

1. Client reconnects transport
2. Client re-authenticates using stored `resumeToken`
3. Server rebinds the transport to the existing participant identity
4. Server sends full current state
5. Presence becomes `connected`

## 10.2 Browser refresh on same route

Scenario:

- user refreshes host or player page

Required behavior:

1. Client bootstrap reads durable resume credentials
2. If route matches the stored session identity, client attempts silent restore
3. Server validates token and rebinds participant
4. Server sends full state
5. If restore fails, client clears stale credentials and falls back to join flow

## 10.3 Open join URL on same device after prior participation

Scenario:

- player reopens the hub or game link after previously joining

Required behavior:

1. Client checks whether stored credentials match the requested session
2. If yes, attempt restore before showing join form
3. If restore succeeds, navigate directly into the appropriate waiting/play view
4. If restore fails, show join form

## 10.4 Hub to game transition

Scenario:

- host launches a game from the hub

Required behavior:

1. Hub remains the canonical participant source
2. Game session is created from selected hub participants
3. Each participant can join the game using their mapped identity
4. If a player reconnects during the game, the platform can restore both hub
   context and game context

## 10.5 Reconnect after host refresh

Scenario:

- host refreshes the page in hub or game view

Required behavior:

- host identity must restore the same authority
- host reconnect must not create a duplicate host session
- if the host reconnects while the game is active, control returns to the same
  hub/game context

## 11. Server Responsibilities

The server must:

- maintain participant identity separate from socket identity
- reject duplicate use of a removed token
- allow rebinding of an existing participant to a new socket
- emit authoritative full state after successful restore
- update presence transitions deterministically
- preserve a disconnected participant seat until explicit removal or session end

The server must not:

- create a new participant identity during reconnect
- rely on client-provided player index as identity
- assume that disconnect means leave

## 12. Client Responsibilities

The client must:

- store durable resume credentials after successful join
- attempt silent restore when appropriate
- handle stale-token failure by clearing invalid credentials
- treat full-state restore as authoritative over local optimistic state
- present connection loss and recovery clearly in the UI

The client must not:

- invent identity locally
- assume that route access alone implies authorization
- trust old local state after reconnect without server confirmation

## 13. Failure Handling Rules

## 13.1 Invalid token

If the server rejects a restore token:

- client clears stored credentials for that session
- client returns to join flow or a clear error state
- server does not create a new participant automatically

## 13.2 Removed participant reconnect attempt

If a removed participant tries to reconnect:

- server rejects the reconnect
- client clears stale credentials
- UI shows a clear "removed from session" message

## 13.3 Closed session reconnect attempt

If the session is closed:

- reconnect is rejected
- stored credentials are cleared
- UI shows that the session has ended

## 13.4 Duplicate active connection

If the same participant reconnects while an old socket still appears active:

- the newest authenticated connection becomes authoritative
- the old connection is detached or disconnected by the server
- the system must never treat this as two separate participants

## 14. Observability Requirements

This lifecycle model must be inspectable.

Minimum required diagnostics:

- session id
- participant id
- participant role
- presence state transitions
- reconnect attempts
- token validation failures
- session lifecycle transitions

This does not require a production-grade logging subsystem yet, but it must be
possible to reason about reconnect bugs from server-side output and reproducible
test scenarios.

## 15. Impact On Current Codebase

The following changes are implied by this spec:

- game players need a stable identity independent from `playerIndex`
- current client storage strategy must move away from `sessionStorage` as the
  sole source of restore truth
- core session phase types are too narrow and will need expansion or layering
- hub and game transitions should become explicit state changes rather than
  only side effects in route handlers and socket handlers
- reconnect logic should be expressed as platform behavior, not page-by-page
  local conventions

## 16. Acceptance Criteria

This spec is satisfied when all of the following are true:

- refreshing a player page restores the same participant identity
- refreshing the host page restores the same host authority
- reconnect after temporary connection loss restores the same participant
- disconnected players remain visible as disconnected, not silently deleted
- removed players cannot re-enter using old credentials
- hub-created games preserve participant identity from hub to game
- recovery always succeeds through a fresh full-state response from the server
- no flow depends on `playerIndex` alone as identity

## 17. Follow-Up Technical Specs

This document should directly feed:

- client/server protocol specification
- reconnect token and storage specification
- room lifecycle implementation plan
- core type refactor plan
- multiplayer recovery test plan

## 18. Open Questions

These questions should be resolved in follow-up docs, not by changing this spec
ad hoc during implementation:

- Should hub and game session state names share one enum or remain separate but
  mapped?
- Do we want resumable credentials per session only, or one local identity that
  can reference multiple active sessions?
- What session expiry policy should apply to inactive sessions in memory?
