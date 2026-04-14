# GameHub Roadmap

This roadmap defines the next product and engine milestones for GameHub.
It is intentionally strategic: it describes where the platform should go,
why those changes matter, and in what order they should land.

The business context and product intent live in
[`docs/business-spec.md`](docs/business-spec.md).

## Current Baseline

The repository already has a usable modular LAN party-game platform:

- Fastify + Socket.io multiplayer server
- Hub mode for game-night sessions
- Quick Game mode for one-off sessions
- Local mode for single-screen play
- Token-based join flow with QR support
- Plugin architecture for server and client game modules
- Two working games: Yahtzee and Quiz
- Polish and English localization support

This means the project is beyond raw prototype stage. The next phase is not
"add more screens" but "stabilize the engine and formalize the product".

## 90-Day Goal

After the next 90 days, GameHub should be:

- stable for 4-8 players on a LAN
- resilient to refresh and temporary disconnects
- structured so new games mostly live in `games/*`
- ready for a third, more demanding party game
- documented like a serious open source project

## Phase 1: Reliability And Room Lifecycle

Priority: stability over feature expansion.

### Outcomes

- refresh does not effectively kick players out of a session
- reconnect works in hub and in active game sessions
- server state remains predictable under 6-8 concurrent players
- room and game lifecycle become explicit instead of implicit

### Deliverables

- Formal room/session state model for hub and game instances
- Explicit lifecycle states:
  - `lobby`
  - `starting`
  - `in_game`
  - `round_result`
  - `game_result`
  - `closed`
- Durable player identity model:
  - `playerId`
  - `sessionToken` / `resumeToken`
  - restore strategy on client
- Heartbeat and disconnect handling:
  - ping/pong or equivalent liveness check
  - disconnect timeout
  - distinction between temporary disconnect and intentional leave
- Snapshot-first recovery path:
  - server can always send full room state
  - reconnect path does not depend on incremental patches only
- Debug support:
  - event log
  - room snapshot dump
  - fake client script for load/reconnect testing

### Notes For This Repository

- The current token model and `sessionStorage` flow are a starting point, not
  the final reconnect system.
- The existing `phase: 'lobby' | 'playing' | 'finished'` contract in core is
  too coarse for long-term engine behavior.
- Socket event processing is currently pragmatic and direct; Phase 1 should
  make lifecycle behavior explicit before deeper abstractions are added.

## Phase 2: Engine Architecture And Protocol Hardening

Priority: clear separation between platform concerns and game logic.

### Outcomes

- the core engine has a stable contract for games
- payloads are validated at runtime
- the protocol is documented and consistent
- the server stops carrying accidental game-specific assumptions
- adding a new game requires minimal core changes

### Deliverables

- Shared protocol package or clearly isolated protocol layer
- Unified event envelope for room/game events
- Runtime validation for inbound actions and critical server payloads
- Standardized game lifecycle vocabulary
- Formal game contract covering:
  - initial state creation
  - action/event handling
  - optional tick/timer behavior
  - player-specific view serialization
  - finish conditions
- Basic event history or replay foundation
- Documentation set for contributors:
  - architecture overview
  - protocol overview
  - plugin authoring guide
  - local development guide

### Notes For This Repository

- The existing plugin model in `@gamehub/core` is already the right direction.
- Phase 2 should evolve that model rather than replace it blindly.
- The target is not event sourcing for its own sake; the target is a reliable,
  testable multiplayer engine with predictable boundaries.

## Phase 3: Advanced Game Stress Test

Priority: prove the engine with a more complex game than Yahtzee and Quiz.

### Candidate

`Power Quiz Lite` / `Wiedza to Potega lite`

### Outcomes

- third game implemented on the shared engine
- one game exercises hidden info, round modifiers, and cross-player targeting
- the engine proves it can handle more than forms + scores + timer

### Suggested Scope

Start with a deliberately small version:

- question phase
- fastest or strongest answer earns an advantage
- attacker selects target
- attacker selects one modifier
- next round starts with the modifier applied

Initial modifiers:

- `freeze`
- `slime`
- `bugs`

### Constraints

- modifiers should exist as round state, not as ad hoc client hacks
- server remains authoritative for timing and scoring
- client owns the visual representation of effects

## What We Are Explicitly Not Doing Yet

To keep scope under control, avoid these in this stage:

- accounts and login
- WAN/internet multiplayer
- persistent backend complexity
- micro-optimizations before reliability work
- diff-sync sophistication as a substitute for solid snapshots
- monetization or platform integrations
- anti-cheat beyond basic server authority

## Top Technical Priorities

1. Reconnect and session recovery
2. Explicit room lifecycle
3. Unified event envelope and protocol discipline
4. Runtime validation
5. Debugging and deterministic inspection tools

## Documentation Milestones

The roadmap is not complete unless it produces durable documentation.

Required documents to add during this cycle:

- Business specification
- Architecture overview
- Room lifecycle specification
- Client/server protocol specification
- Reconnect and identity specification
- Plugin authoring guide
- Testing strategy for multiplayer flows

## Planning Principle

GameHub should be built as a platform from the start, but not overengineered.

That means:

- solve current multiplayer risks before expanding feature count
- prefer explicit contracts over implicit behavior
- keep game logic in game modules
- let business intent drive technical documentation
- make every new document usable as input to implementation, review, and QA
