# GameHub Spec: Plugin API And Game Authoring Contract

## Status

- Status: Draft v1
- Type: Technical specification
- Source documents:
  - [docs/business-spec.md](/Users/jakubsieradzki/repos/yathzee/docs/business-spec.md)
  - [docs/specs/client-server-protocol.md](/Users/jakubsieradzki/repos/yathzee/docs/specs/client-server-protocol.md)
  - [docs/specs/runtime-validation-and-validation-strategy.md](/Users/jakubsieradzki/repos/yathzee/docs/specs/runtime-validation-and-validation-strategy.md)

## 1. Purpose

This document defines the formal contract between GameHub and game plugins.

It describes:

- what a plugin is in GameHub
- what a plugin must declare
- which responsibilities belong to the platform and which belong to the game
- what a new game package must include to be considered valid
- what minimum quality and testing rules apply to new games

The goal is to ensure that new games extend the platform instead of bypassing
it or forcing game-specific behavior into core code.

## 2. Why This Spec Exists

GameHub is not meant to be a one-off application with multiple screens. It is a
platform for local multiplayer party games.

That means a new game should mostly be a new module, not a partial rewrite of:

- protocol handling
- reconnect logic
- room lifecycle
- validation behavior
- launcher metadata

Without a clear plugin contract:

- each new game will invent its own integration style
- core will gradually absorb game-specific assumptions
- authoring quality will vary too much between games

## 3. Core Decisions Used In This Draft

This draft assumes:

- a plugin is a full product module with a defined contract
- one shared plugin model serves all games for now
- the platform keeps one common plugin shape
- some plugin capabilities are optional, but the core contract is mandatory
- lifecycle hooks are standardized
- validation schemas are part of the contract
- plugin may emit optional patches, but patches are never authoritative truth
- product metadata is mandatory
- plugin declares supported platform modes
- plugin authoring includes testing and quality expectations
- the contract must support current games and somewhat more advanced party games

## 4. What A Plugin Is

A GameHub plugin is the unit of game integration into the platform.

A plugin is not just a React component or just a handler bundle.

A plugin is a package that defines:

- product metadata
- supported modes and capabilities
- initial game state creation
- game configuration input
- action handling
- optional ticking behavior
- role-aware game-state serialization
- client rendering entry points
- validation schemas

## 5. Platform Responsibility Vs Plugin Responsibility

## 5.1 Platform Responsibilities

The platform is responsible for:

- session and participant identity
- reconnect and restore
- REST and socket transport handling
- protocol envelopes
- authorization context attachment
- session lifecycle orchestration
- storage and token semantics
- validation infrastructure
- launcher and hub integration

## 5.2 Plugin Responsibilities

The plugin is responsible for:

- game-specific state model
- game-specific configuration
- game-specific actions
- game-specific scoring, rules, and progression
- game-specific visibility rules inside `gameState`
- host/controller/summary UI
- plugin-level validation schemas
- optional patch payloads for UX optimization

## 5.3 Important Boundary Rule

The platform must not know the internal rules of a game.

The plugin must not reimplement platform concerns like:

- participant identity
- reconnect storage
- protocol versioning
- session attachment

## 6. Plugin Contract Overview

Every plugin package must export:

- one server plugin definition
- one client plugin definition

The package may also export:

- shared types
- translation dictionaries
- helpers used by both server and client

## 7. Required Product Metadata

Every plugin must declare product metadata.

Recommended shape:

```ts
interface GamePluginMetadata {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  icon: string;
  color: string;
  supportedModes: Array<'hub' | 'quick' | 'local'>;
}
```

Rules:

- `id` must be stable and unique
- metadata is mandatory, not optional decoration
- launcher and game selection surfaces rely on this contract
- supported modes must be explicit

## 8. Supported Modes

Plugins must declare which platform modes they support.

Supported mode flags:

- `hub`
- `quick`
- `local`

This allows the platform to:

- hide incompatible games in certain contexts
- avoid unsupported flows
- keep product expectations explicit

Games must not be assumed to work in every mode by default.

## 9. Server Plugin Contract

## 9.1 Core Hook Set

The server side of a plugin must follow a standard hook model.

Recommended conceptual contract:

```ts
interface GameServerPlugin<
  TGameState = unknown,
  TConfig = unknown,
  TActionMap extends Record<string, unknown> = Record<string, unknown>,
> {
  metadata: GamePluginMetadata;

  createInitialState(): TGameState;

  getConfigSchema(): RuntimeSchema<TConfig>;
  getActionSchemas(): {
    [K in keyof TActionMap]: RuntimeSchema<TActionMap[K]>;
  };

  configure?(args: {
    state: TGameState;
    config: TConfig;
    participants: SessionParticipantRef[];
  }): TGameState;

  handleAction<K extends keyof TActionMap>(args: {
    state: TGameState;
    action: K;
    payload: TActionMap[K];
    actor: PluginActorContext;
    participants: SessionParticipantRef[];
    helpers: PluginServerHelpers;
  }): PluginActionResult<TGameState>;

  serializeForRole(args: {
    state: TGameState;
    role: 'host' | 'player';
    participantId: string;
    playerIndex: number | null;
  }): unknown;

  tick?(args: {
    state: TGameState;
    now: number;
    participants: SessionParticipantRef[];
    helpers: PluginServerHelpers;
  }): PluginTickResult<TGameState>;

  isFinished?(state: TGameState): boolean;
}
```

This is a conceptual contract, not a literal final signature requirement.

## 9.2 Required Server Responsibilities

Every server plugin must provide:

- initial state
- metadata
- config schema
- action schemas
- action handling
- role-aware serialization

Optional server features:

- `configure`
- `tick`
- `isFinished`

## 9.3 Standardized Hooks

The platform expects these responsibilities to exist in a standard way:

- `createInitialState`
- config handling
- action handling
- serialization
- optional tick progression
- optional finish check

Games should not invent alternate entry points for these responsibilities.

## 10. Client Plugin Contract

## 10.1 Core Client Contract

Recommended conceptual contract:

```ts
interface GameClientPlugin {
  metadata: GamePluginMetadata;
  HostView: React.ComponentType<GameViewProps>;
  ControllerView: React.ComponentType<GameViewProps>;
  SummaryView?: React.ComponentType<GameViewProps>;
  locales?: Record<string, Record<string, string>>;
  getMiniScoreboardData?: (
    gameState: unknown,
    participants: ClientParticipantView[],
  ) => MiniScoreboardData;
}
```

## 10.2 Client Responsibilities

The client plugin is responsible for:

- rendering host view
- rendering player/controller view
- rendering optional summary/result view
- registering plugin-local translations if present
- interpreting plugin `gameState`

The client plugin is not responsible for:

- socket attachment
- reconnect bootstrap
- session storage logic
- identity authentication

## 11. Validation As Part Of The Plugin Contract

## 11.1 Config Schema Is Mandatory

If the plugin supports configuration, it must expose an explicit runtime schema.

If the plugin has no meaningful configuration, it must still expose an explicit
empty-object or no-config schema rather than relying on undocumented absence.

## 11.2 Action Schemas Are Mandatory

Every public game action must have a declared schema.

This includes actions with:

- complex payloads
- simple payloads
- empty payloads

No public game action may exist without schema coverage.

## 11.3 Missing Schema Rule

Missing schema for a plugin action or config is an architectural defect.

The plugin should fail integration checks or startup registration rather than
silently participating with unvalidated public inputs.

## 12. Role-Aware Serialization

Plugins own the serialization of their internal `gameState` for different roles.

That means the plugin may hide information for:

- players
- host
- future spectator role if added later

However:

- the platform owns the outer protocol envelope
- the platform owns participant identity and session metadata
- the plugin only decides the shape of `gameState` visibility

This supports both current games and more advanced games with hidden info,
targeting, modifiers, or role asymmetry.

## 13. Patch And Optimization Contract

## 13.1 Patch Support

Plugins may emit patch-like optimization payloads.

These are allowed for:

- smooth counters
- timer ticks
- small UI updates
- high-frequency but low-risk display changes

## 13.2 Patch Rule

Plugin-emitted patches are never authoritative.

The authoritative truth remains:

- server-side state
- full `game:state` snapshot after reconnect or important transitions

## 13.3 Patch Quality Requirement

If a plugin emits patches, it must ensure:

- patch payloads have explicit shapes
- client can safely recover without them
- full state eventually supersedes patch drift

## 14. Advanced Game Support

The plugin API should not be optimized only for current Yahtzee and Quiz needs.

It must also be able to support games with:

- hidden information
- target selection
- round modifiers
- richer phase progression
- timed interactions

This does not mean adding game-type subclasses now.

It means the one common plugin contract should be broad enough to avoid a
rewrite when a more complex third game arrives.

## 15. File And Package Structure

## 15.1 Recommended Package Layout

Recommended plugin package structure:

```text
games/
  your-game/
    package.json
    tsconfig.json
    src/
      index.ts
      shared/
        types.ts
        constants.ts
      server/
        plugin.ts
        state.ts
        actions.ts
        serialization.ts
        schemas.ts
      client/
        plugin.ts
        HostView.tsx
        ControllerView.tsx
        SummaryView.tsx
        locales/
          pl.ts
          en.ts
        components/
```

## 15.2 Structure Rules

Rules:

- shared types should not be duplicated across server and client
- schemas should be explicit and discoverable
- plugin entry points should be easy to locate
- package layout should be consistent enough for contributors

## 16. Integration Rules

## 16.1 Registration

A plugin becomes available only when:

- it is exported from its package entry point
- the server registers its server definition
- the client registry can load its client definition

## 16.2 Platform Compatibility Checks

Before a plugin is considered valid, the platform should be able to check:

- metadata exists
- supported modes exist
- config schema exists
- action schemas exist
- required client/server entry points exist

## 17. Quality Checklist For A New Game

Before a plugin is considered acceptable, it should satisfy this checklist:

- metadata complete
- supported modes declared
- initial state defined
- config schema defined
- action schemas defined
- role-aware serialization implemented
- host view implemented
- controller view implemented
- summary view considered and implemented if relevant
- translations provided for required locales
- reconnect works without custom hacks
- plugin does not assume `playerIndex` is identity
- plugin does not bypass platform validation

## 18. Testing Requirements

## 18.1 Minimum Plugin Test Coverage

Every plugin should have tests for:

- initial state creation
- config validation
- valid action accepted
- malformed action rejected
- invalid role/state action rejected
- serialization differences where hidden info exists
- finish condition where applicable

## 18.2 UI-Level Expectations

The exact amount of UI testing may vary, but every plugin should at least be
manually or automatically verified for:

- host view renders with valid state
- controller view renders with valid state
- summary view renders if present

## 18.3 Tick-Based Games

If a plugin uses `tick`, it should also have tests covering:

- no unintended state mutation outside defined transitions
- correct progression across time boundaries
- correct finish behavior if tick may end a game

## 19. Anti-Patterns

The following patterns are explicitly discouraged:

- plugin logic requiring direct access to socket internals
- plugin logic depending on browser storage
- plugin identity based on `playerIndex`
- plugin-specific ad hoc validation unrelated to platform conventions
- plugin requiring core code changes for standard gameplay actions
- plugin using patches as the only way clients stay correct

## 20. Mapping To Current Codebase

This spec implies the following evolution from the current repository:

- current plugin definitions should converge on clearer metadata and supported
  mode declarations
- validation schemas should move into explicit plugin-owned definitions
- game logic should remain in `games/*` instead of leaking into server routes or
  socket orchestration
- current Yahtzee and Quiz implementations should be treated as reference
  migrations toward this contract, not as accidental final shape

## 21. Acceptance Criteria

This spec is satisfied when:

- a new game can be added mostly by creating a package under `games/*`
- the plugin declares metadata, modes, schemas, and rendering entry points
- plugin public inputs cannot exist without validation
- plugin state can be serialized differently by role
- plugin may use patches without becoming dependent on them
- the platform can reject incomplete plugin integration before runtime use
- contributors can follow one consistent package structure for new games

## 22. Follow-Up Specs And Plans

This document should feed:

- plugin registration integrity checks
- implementation plan / migration plan
- plugin authoring guide for contributors
- Power Quiz Lite game spec

## 23. Open Questions

These are intentionally deferred:

- whether spectator becomes a first-class role in v1 or later
- whether plugin output schemas should be fully formalized per game state in the
  next implementation phase
- whether future advanced games need specialized optional capability interfaces
