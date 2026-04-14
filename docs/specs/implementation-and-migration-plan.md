# GameHub Spec: Implementation And Migration Plan

## Status

- Status: Draft v1
- Type: Technical implementation plan
- Source documents:
  - [ROADMAP.md](/Users/jakubsieradzki/repos/yathzee/ROADMAP.md)
  - [docs/business-spec.md](/Users/jakubsieradzki/repos/yathzee/docs/business-spec.md)
  - [docs/specs/session-lifecycle-and-reconnect.md](/Users/jakubsieradzki/repos/yathzee/docs/specs/session-lifecycle-and-reconnect.md)
  - [docs/specs/client-server-protocol.md](/Users/jakubsieradzki/repos/yathzee/docs/specs/client-server-protocol.md)
  - [docs/specs/token-storage-and-restore.md](/Users/jakubsieradzki/repos/yathzee/docs/specs/token-storage-and-restore.md)
  - [docs/specs/runtime-validation-and-validation-strategy.md](/Users/jakubsieradzki/repos/yathzee/docs/specs/runtime-validation-and-validation-strategy.md)
  - [docs/specs/plugin-api-and-game-authoring-contract.md](/Users/jakubsieradzki/repos/yathzee/docs/specs/plugin-api-and-game-authoring-contract.md)

## 1. Purpose

This document translates the current specification set into an implementation
sequence for the existing repository.

Its goal is to move GameHub from the current working prototype/platform state to
the new architecture without breaking Yahtzee and Quiz during the migration.

## 2. Non-Negotiable Migration Rule

The migration must preserve working gameplay for existing games.

Hard rule:

- no regression for Yahtzee and Quiz after each migration milestone

That means:

- no big-bang rewrite
- no parallel replacement platform that diverges for too long
- no removal of existing behavior before the replacement is active

## 3. Migration Strategy

The strategy is additive first, convergent second.

Sequence:

1. introduce new primitives and contracts
2. adapt platform code to use them
3. adapt existing games to the new contract
4. remove transitional legacy assumptions

This allows the codebase to stay runnable while architecture improves.

## 4. Delivery Principles

- Preserve current feature scope while refactoring foundations
- Prefer adapters over disruptive rewrites
- Ship state and protocol improvements before advanced gameplay work
- Keep `playerIndex` as ordering/UI during migration, but stop treating it as identity
- Use full-state reconnect as the safety net for all rollout steps

## 5. Implementation Phases

## Phase 0: Safety Net And Inventory

Purpose:

- prepare the repository for a safe migration

Deliverables:

- document current flows and state assumptions in code comments or internal notes
- add minimal regression checks for:
  - create/join quick game
  - create/join hub
  - start Yahtzee
  - start Quiz
  - reconnect after refresh in existing flow
- identify all current usages of:
  - `playerIndex` as identity
  - `sessionStorage` as restore authority
  - unvalidated public payloads

Success criteria:

- current platform behavior is reproducible
- critical regressions can be detected quickly

## Phase 1: Shared Client Credential Store

Purpose:

- replace ad hoc page-level storage logic with one domain-aware credential layer

Deliverables:

- add a shared frontend storage abstraction for:
  - active hub credential
  - active game credential
  - optional temporary session hints
- move restore logic out of individual pages into shared helpers/hooks
- introduce `localStorage` as durable credential source of truth
- keep compatibility shims for existing session keys temporarily where needed

Expected file impact:

- `packages/web/src/hooks/*`
- `packages/web/src/pages/*`
- possible new `packages/web/src/lib/session-store.ts`

Success criteria:

- host and player restore paths work from shared logic
- refresh no longer depends on `sessionStorage` alone

## Phase 2: Participant Identity Foundation

Purpose:

- introduce stable participant identity without breaking current seat/order logic

Deliverables:

- add `participantId` to hub and game participant models
- preserve `playerIndex` for display/order only
- update REST create/join responses to include:
  - `protocolVersion`
  - `participantId`
  - `role`
  - `resumeToken`
- ensure hub-created game participants preserve identity mapping from hub

Expected file impact:

- `packages/core/src/types.ts`
- `packages/server/src/store.ts`
- `packages/server/src/hub-store.ts`
- `packages/server/src/routes/*.ts`

Success criteria:

- reconnect and remove flows no longer depend on `playerIndex` alone
- existing games still receive ordering information they need

## Phase 3: Socket Attach And Full-State Recovery Cleanup

Purpose:

- align realtime flows with the new protocol and restore model

Deliverables:

- normalize `hub:connect` and `game:connect` payloads around:
  - `protocolVersion`
  - `sessionId`
  - `resumeToken`
- ensure successful attach always returns full authoritative state
- make reconnect path deterministic for:
  - host
  - hub player
  - quick-game player
  - hub-created game player
- implement newest-socket-wins rebinding rule

Expected file impact:

- `packages/server/src/socket.ts`
- `packages/web/src/hooks/useSocketConnection.ts`
- `packages/web/src/hooks/useHubConnection.ts`
- `packages/web/src/hooks/useGameState.ts`
- `packages/web/src/hooks/useHubState.ts`

Success criteria:

- refresh and reconnect restore the same participant identity
- old sockets do not create duplicate effective participants

## Phase 4: Runtime Validation Foundations

Purpose:

- add validation to critical public boundaries before further refactors

Deliverables:

- choose and install the runtime schema approach
- add shared schema layer for:
  - create/join requests
  - connect payloads
  - critical state responses
  - standardized errors
- validate REST inputs before domain logic
- validate socket connect/action inputs before domain logic
- validate critical outputs before return/emit

Expected file impact:

- `packages/core` or a dedicated protocol/schema area
- `packages/server/src/routes/*.ts`
- `packages/server/src/socket.ts`

Success criteria:

- malformed payloads are rejected consistently
- critical outputs match declared contract

## Phase 5: Plugin Contract Refactor

Purpose:

- move existing games onto the formal plugin contract without changing product behavior

Deliverables:

- evolve plugin interfaces toward:
  - metadata
  - supported modes
  - config schema
  - action schemas
  - standardized action handling
  - role-aware serialization
- adapt Yahtzee and Quiz to expose explicit schema/config/action definitions
- preserve current HostView/ControllerView/SummaryView behavior

Expected file impact:

- `packages/core/src/plugin.ts`
- `games/yahtzee/src/*`
- `games/quiz/src/*`
- plugin loader and registry glue

Success criteria:

- both games still function
- both games comply with new plugin contract

## Phase 6: Lifecycle State Expansion

Purpose:

- bring session lifecycle closer to the formal spec

Deliverables:

- expand current coarse phase model with clearer lifecycle states
- separate hub lifecycle from game lifecycle where needed
- keep adapter mapping for current UI while transitions are updated
- ensure finished/return flows remain stable

Expected file impact:

- `packages/core/src/types.ts`
- `packages/server/src/socket.ts`
- `packages/server/src/routes/hub.ts`
- `packages/web/src/pages/*`

Success criteria:

- lifecycle transitions are explicit
- code no longer depends on ambiguous `playing/finished` shortcuts alone

## Phase 7: Cleanup And Legacy Removal

Purpose:

- remove migration shims once the new path is stable

Deliverables:

- remove obsolete storage keys and restore fallbacks
- remove identity assumptions based on `playerIndex`
- remove duplicated validation paths
- simplify route/page restore code after shared abstractions are in place

Success criteria:

- no transitional compatibility code remains where it no longer adds value
- platform behavior is simpler than before, not just more layered

## 6. Recommended Execution Order In Practice

Recommended immediate order:

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5
7. Phase 6
8. Phase 7

This order is deliberate:

- storage and identity must come before protocol cleanup
- protocol cleanup should come before plugin refactor pressure increases
- validation should land before too many new entry points are added

## 7. Yahtzee And Quiz Migration Rules

## 7.1 Yahtzee

Migration rule:

- keep Yahtzee state and scoring behavior stable while identity and validation move around it

Specific note:

- Yahtzee may continue using `playerIndex` for row/column ordering and score lookup during migration
- it must stop treating `playerIndex` as participant identity

## 7.2 Quiz

Migration rule:

- preserve timer and hidden-info behavior while moving it onto the new protocol and plugin contracts

Specific note:

- Quiz serialization remains the place where hidden information is enforced
- reconnect and attach behavior must not leak correct answers or stale state

## 8. Architectural Risks

Main risks during implementation:

- identity refactor breaks existing seat-based logic
- storage migration leaves stale credentials on devices
- protocol cleanup introduces half-old, half-new attach flows
- validation rollout blocks real flows because schemas are incomplete
- plugin refactor leaks platform logic into game packages or vice versa

## 9. Risk Controls

Recommended controls:

- keep compatibility adapters temporarily
- migrate one boundary at a time
- prefer “new field added” before “old field removed”
- add regression checks before large refactors
- land protocol/state/store changes in small reviewable slices

## 10. Milestone Gates

## Gate A: Restore Foundation Ready

Required before continuing past early platform work:

- durable client credential store exists
- host refresh works
- player refresh works
- hub and quick game both restore correctly

## Gate B: Identity Foundation Ready

Required before deeper plugin and lifecycle refactors:

- `participantId` is present in core models and protocol responses
- remove/reconnect logic no longer depends on `playerIndex`

## Gate C: Validation Foundation Ready

Required before adding more public actions or new games:

- critical REST and Socket boundaries are runtime-validated
- structured errors are in place

## Gate D: Plugin Contract Ready

Required before implementing a third game:

- Yahtzee and Quiz both run on the formalized plugin contract
- mode support and plugin metadata are explicit

## 11. Testing Strategy For The Migration

Minimum regression coverage after each major milestone:

- create quick game
- join quick game
- host reconnect
- player reconnect
- create hub
- join hub
- launch game from hub
- return after game finish
- Yahtzee score update still works
- Quiz answer/timer flow still works

This can start as a mix of:

- focused unit tests
- integration tests for server flows
- manual smoke checklist

## 12. Work Packaging Recommendation

Each implementation slice should be small enough to review independently.

Recommended PR/work chunk style:

- credential store introduction
- protocol response enrichment
- participant identity addition
- socket attach normalization
- validation foundations
- Yahtzee plugin migration
- Quiz plugin migration
- lifecycle expansion
- cleanup

Do not combine all of these into one branch.

## 13. Definition Of Done For This Migration

The migration is complete when:

- Yahtzee and Quiz both still work
- reconnect and refresh are based on durable credentials
- protocol responses are structured around participant identity
- runtime validation protects critical boundaries
- plugin contract is explicit and used by existing games
- transitional assumptions around `playerIndex` and page-level storage are removed

## 14. What Comes After

After this migration foundation is complete, the next sensible work is:

- Power Quiz Lite or another third game
- improved diagnostics and fake client testing
- stronger lifecycle richness where product value justifies it
