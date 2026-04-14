# GameHub Spec: Token, Storage And Restore

## Status

- Status: Draft v1
- Type: Technical specification
- Source documents:
  - [docs/business-spec.md](/Users/jakubsieradzki/repos/yathzee/docs/business-spec.md)
  - [docs/specs/session-lifecycle-and-reconnect.md](/Users/jakubsieradzki/repos/yathzee/docs/specs/session-lifecycle-and-reconnect.md)
  - [docs/specs/client-server-protocol.md](/Users/jakubsieradzki/repos/yathzee/docs/specs/client-server-protocol.md)

## 1. Purpose

This document defines how GameHub stores and uses participant credentials on the
client and how the server interprets them for restore and reconnect flows.

It formalizes:

- `resumeToken` scope and lifecycle
- client storage responsibilities
- restore decision rules
- invalidation behavior
- hub-to-game credential behavior

This spec exists to make reconnect reliable and predictable instead of relying
on ad hoc page-level conventions.

## 2. Decisions Used In This Draft

This draft uses the following decisions:

- one durable `resumeToken` per participant per session
- token scope is one concrete session
- hub and game use separate tokens
- durable credentials live in `localStorage`
- temporary UI context may live in `sessionStorage`
- invalid restore credentials are auto-cleared by the client
- sessions may expire after inactivity
- storage structure and key naming are part of the contract
- silent restore runs only when session match is unambiguous
- one active context per domain is supported for now

## 3. Goals

The restore model must:

- survive page refresh and browser tab recreation
- restore the same participant identity
- work consistently for host and player
- support both hub and game domains
- keep client storage understandable and debuggable

The restore model must not:

- infer identity from UI state
- rely on `playerIndex`
- silently keep invalid tokens forever
- blur the security boundary between hub and game sessions

## 4. Core Model

## 4.1 Token Definition

A `resumeToken` is an opaque secret issued by the server that proves the client
may restore one specific participant identity inside one specific session.

Properties:

- opaque
- unguessable
- server-authoritative
- session-scoped
- role-neutral from storage perspective

## 4.2 Token Scope

Each token is valid for exactly one session.

That means:

- a hub token is valid only for one `hubId`
- a game token is valid only for one `gameId`
- the same human participant may have one hub token and one game token at the
  same time if a game was launched from a hub

## 4.3 Token Stability

For the lifetime of a session participant, the `resumeToken` remains stable.

The token is not rotated:

- on reconnect
- on page refresh
- on normal socket re-attach

The token becomes invalid only when:

- the participant is removed
- the session closes
- the session expires
- the server invalidates it for a defined security reason in a future spec

## 5. Session Identity Model

A restoreable participant record conceptually includes:

```ts
type Domain = 'hub' | 'game';

interface StoredSessionCredential {
  domain: Domain;
  sessionId: string;
  participantId: string;
  role: 'host' | 'player';
  resumeToken: string;
  protocolVersion: 1;
  savedAt: number;
}
```

This record is the minimum durable credential unit on the client.

## 6. Storage Responsibilities

## 6.1 localStorage

`localStorage` is the durable source of truth for restore credentials.

It must store:

- session-scoped `resumeToken`
- `participantId`
- session id
- role
- protocol version

It must not store:

- derived game state
- optimistic patch state
- UI-only navigation hints

## 6.2 sessionStorage

`sessionStorage` may be used only for temporary convenience state.

Examples:

- last screen intent
- temporary route hints
- non-authoritative navigation continuity

If `sessionStorage` is empty, restore must still work as long as durable
credentials exist in `localStorage`.

## 6.3 One Active Context Per Domain

At this stage the client supports one active stored credential per domain:

- one active hub credential
- one active game credential

This means the client does not need to support a list of simultaneous active hub
sessions or multiple active game sessions on one device.

## 7. Storage Keys

## 7.1 Contracted Keys

Recommended durable keys:

```ts
const STORAGE_KEYS = {
  activeHub: 'gamehub.activeHubSession',
  activeGame: 'gamehub.activeGameSession',
} as const;
```

Recommended temporary keys:

```ts
const SESSION_KEYS = {
  lastHubRoute: 'gamehub.lastHubRoute',
  lastGameRoute: 'gamehub.lastGameRoute',
  localModeHint: 'gamehub.localModeHint',
} as const;
```

## 7.2 Stored Value Shape

Recommended JSON shape for `gamehub.activeHubSession`:

```json
{
  "domain": "hub",
  "sessionId": "ABC123",
  "participantId": "P-001",
  "role": "player",
  "resumeToken": "opaque-secret",
  "protocolVersion": 1,
  "savedAt": 1770000000000
}
```

Recommended JSON shape for `gamehub.activeGameSession`:

```json
{
  "domain": "game",
  "sessionId": "XYZ789",
  "participantId": "P-001",
  "role": "player",
  "resumeToken": "opaque-secret-2",
  "protocolVersion": 1,
  "savedAt": 1770000001000
}
```

## 8. Credential Issuance Rules

## 8.1 On Create

When the host creates a hub or quick game, the server returns:

- `sessionId`
- `participantId`
- `role: host`
- `resumeToken`
- `protocolVersion`

The client must immediately persist the credential record in `localStorage`.

## 8.2 On Join

When a player joins a hub or quick game, the server returns:

- `sessionId`
- `participantId`
- `role: player`
- `resumeToken`
- `protocolVersion`

The client must immediately persist the credential record in `localStorage`.

## 8.3 On Hub-To-Game Transition

When a game is launched from a hub:

- the game session must issue a distinct game-scoped `resumeToken`
- the game credential must be stored separately from the hub credential
- hub credential remains valid for the hub session

This preserves clean domain boundaries while allowing the same human user to
restore both contexts.

## 9. Restore Decision Logic

## 9.1 Silent Restore Principle

Silent restore is attempted only when the route and stored credential match
unambiguously.

This means:

- a hub page may auto-restore only from the stored active hub credential with
  the same `hubId`
- a game page may auto-restore only from the stored active game credential with
  the same `gameId`

The client must not guess across domains or session ids.

## 9.2 Route Match Rules

### Hub Route

For routes like:

- `/hub/:hubId`
- `/hub/:hubId/lobby`

restore is allowed only if:

- durable hub credential exists
- `credential.domain === 'hub'`
- `credential.sessionId === hubId`

### Game Route

For routes like:

- `/game/:gameId`
- `/game/:gameId/play`
- `/join/:gameId`
- `/join/:gameId/play`

restore is allowed only if:

- durable game credential exists
- `credential.domain === 'game'`
- `credential.sessionId === gameId`

## 9.3 Restore Flow

Required client flow:

1. Read the correct domain credential from `localStorage`
2. Validate basic shape locally
3. If session id matches route, attempt silent attach over socket
4. Wait for authoritative full state
5. If attach succeeds, continue into the correct view
6. If attach fails with a terminal credential error, clear local credential and
   fall back to join/create entry flow

## 10. Failure Classification

## 10.1 Terminal Failures

These invalidate the stored credential:

- `error.invalidToken`
- `error.playerRemoved`
- `error.sessionClosed`
- `error.sessionNotFound`
- `error.protocolVersionUnsupported`

Client behavior:

- remove the affected durable credential
- clear related temporary session keys
- return to join/create flow with a clear message

## 10.2 Non-Terminal Failures

These do not invalidate the stored credential automatically:

- temporary network error
- server unreachable
- transient socket reconnect failure

Client behavior:

- keep durable credential
- keep trying reconnect according to transport policy
- surface connection status to the user

## 11. Token Invalidation Rules

## 11.1 Participant Removal

When a host removes a player:

- the server immediately invalidates that player's token for that session
- further restore or attach attempts using that token must fail with the
  participant-removed error code

## 11.2 Session Closure

When a session closes:

- all tokens for that session become invalid
- further restore attempts must fail with a closed/not-found style domain error

## 11.3 Session Expiry

If a session expires due to inactivity:

- all tokens for that session expire with it
- restore attempts fail as terminal failures

## 12. Session Expiry Policy

## 12.1 Requirement

GameHub needs a simple session expiry rule so memory-backed sessions do not live
forever and token validity has a clear boundary.

## 12.2 Recommended Policy

Recommended initial policy:

- active session does not expire while in active use
- closed session is immediately invalid
- inactive session may expire after a defined inactivity timeout

Recommended configuration direction:

- hub sessions: longer inactivity timeout
- quick games: shorter inactivity timeout
- active game launched from hub: tied to game lifecycle first, inactivity second

This spec does not hard-code exact durations yet. That should be decided in an
operational config or implementation plan.

## 13. Host And Player Rules

The same storage model applies to both host and player.

Rules:

- host uses durable restore just like player
- host authority is recovered from `role` plus server-side identity binding
- the client must not infer host authority only from route or UI mode

## 14. Domain Separation Rules

## 14.1 Hub Credential

A hub credential may restore:

- hub participation
- hub lobby presence

A hub credential may not directly restore:

- game participation in a game session

## 14.2 Game Credential

A game credential may restore:

- participation in that specific game session

A game credential may not be assumed to restore:

- hub presence
- another game session

## 15. Bootstrap Storage Rules

## 15.1 Write Rules

The client writes durable credential records only after successful create or join
response from the server.

The client may update `savedAt` on successful attach or restore, but must not
mutate the credential meaning.

## 15.2 Replace Rules

When writing a new active credential for a domain:

- replace the previous active credential for that same domain
- do not remove the credential from the other domain

Examples:

- creating a new quick game replaces active game credential
- joining a new hub replaces active hub credential
- launching a game from an existing hub preserves hub credential and writes a new
  game credential

## 16. Client API Expectations

The frontend should expose one small storage abstraction rather than direct
page-level key management.

Recommended conceptual API:

```ts
interface SessionCredentialStore {
  getActive(domain: 'hub' | 'game'): StoredSessionCredential | null;
  setActive(credential: StoredSessionCredential): void;
  clearActive(domain: 'hub' | 'game'): void;
  clearIfSessionMatches(domain: 'hub' | 'game', sessionId: string): void;
}
```

This avoids leaking storage details into each route component.

## 17. Security And Practical Constraints

This is not a hardened internet-facing auth system. It is a LAN session restore
mechanism.

Still, the implementation must respect these basic rules:

- tokens must be random and unguessable
- tokens must not be derived from participant names or session ids
- tokens must never be accepted outside their session scope
- removed or expired tokens must fail deterministically

## 18. Mapping To Current Codebase

This spec requires the current implementation to evolve in these ways:

- `sessionStorage` cannot remain the only restore storage
- join/create pages should stop owning credential logic individually
- restore should become domain-aware and shared
- current keys like `gamehub_token`, `gamehub_ctrl_token`,
  `gamehub_hub_token`, and related session keys should be replaced or wrapped by
  the structured store defined here
- hub and game credential separation should become explicit

## 19. Acceptance Criteria

This spec is satisfied when:

- refreshing a hub page can restore from `localStorage` without relying on
  `sessionStorage`
- refreshing a game page can restore from `localStorage` without relying on
  `sessionStorage`
- host and player both restore through the same credential model
- a removed participant cannot restore using an old token
- a hub token cannot be used to attach to a game session
- a game token cannot be used to attach to the hub session
- hub and game credentials can coexist on the same device
- client auto-clears terminally invalid credentials
- one active stored credential per domain is enough to support intended flows

## 20. Follow-Up Specs

This document should directly feed:

- runtime validation specification
- reconnect implementation plan
- frontend storage abstraction design
- session expiry operational policy
- multiplayer recovery tests

## 21. Open Questions

These are intentionally deferred:

- exact inactivity timeout durations
- whether host may explicitly "leave" while preserving session ownership
- whether a future multi-context client needs more than one active credential per
  domain
