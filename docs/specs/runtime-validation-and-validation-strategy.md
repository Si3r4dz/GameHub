# GameHub Spec: Runtime Validation And Validation Strategy

## Status

- Status: Draft v1
- Type: Technical specification
- Source documents:
  - [docs/business-spec.md](/Users/jakubsieradzki/repos/yathzee/docs/business-spec.md)
  - [docs/specs/session-lifecycle-and-reconnect.md](/Users/jakubsieradzki/repos/yathzee/docs/specs/session-lifecycle-and-reconnect.md)
  - [docs/specs/client-server-protocol.md](/Users/jakubsieradzki/repos/yathzee/docs/specs/client-server-protocol.md)
  - [docs/specs/token-storage-and-restore.md](/Users/jakubsieradzki/repos/yathzee/docs/specs/token-storage-and-restore.md)

## 1. Purpose

This document defines how GameHub validates data at runtime across REST, Socket,
platform core, and game plugins.

It establishes:

- where validation is mandatory
- what kinds of validation exist
- how errors are classified and returned
- how plugin-specific schemas fit into the platform
- what minimum testing and logging standards are required

The aim is to prevent the platform from relying on implicit trust in external
input or loosely shaped internal output.

## 2. Why This Spec Exists

TypeScript only protects compile-time assumptions. It does not validate:

- HTTP request bodies
- query params
- route params
- socket payloads
- plugin-provided payloads
- serialized outputs emitted to clients

For a multiplayer platform, that is not enough.

Without runtime validation:

- reconnect and protocol flows become brittle
- plugin quality becomes inconsistent
- errors are harder to classify
- malformed payloads can leak into state or game logic

## 3. Goals

The validation system must:

- protect all public input boundaries
- keep the server authoritative
- use one shared validation strategy across platform and plugins
- distinguish malformed input from valid-but-rejected domain actions
- produce structured, testable errors
- reduce drift between protocol docs and implementation

The validation system must not:

- depend on ad hoc `if` trees distributed randomly across the codebase
- rely on client-side validation for correctness
- make plugin validation optional for public inputs

## 4. Validation Principles

## 4.1 Runtime Validation Is Mandatory At Public Boundaries

All externally supplied input must be validated at runtime before use.

This includes:

- REST request bodies
- REST query params
- REST route params
- Socket connect payloads
- Socket action payloads
- plugin configuration payloads

## 4.2 Server Validation Is Authoritative

The server is the source of truth.

Client-side validation may exist for UX, but it is not considered security,
protocol, or correctness validation.

## 4.3 One Shared Validation Model

The platform and all plugins must use the same validation approach and error
shape.

Plugins may extend schemas, but they must not invent a second validation
strategy with unrelated conventions.

## 4.4 Validation And Domain Authorization Are Different

The system must distinguish:

- malformed or unsupported input
- valid input that is not allowed in the current role or state

These are different classes of failure and must remain separate in code and
error reporting.

## 5. Validation Categories

GameHub uses four validation categories.

## 5.1 Structural Validation

Checks whether the payload shape is correct.

Examples:

- field exists
- field type is correct
- enum value is allowed
- string length constraints
- array/object structure

Typical errors:

- missing field
- wrong type
- invalid enum

## 5.2 Semantic Validation

Checks whether a structurally valid payload makes sense in isolation.

Examples:

- `totalRounds` is between 1 and 10
- `timeLimit` is within allowed bounds
- player name is not empty
- game type exists in registry

## 5.3 Authorization Validation

Checks whether the authenticated participant is allowed to perform the action.

Examples:

- only host can start game
- only player can submit answer
- player cannot edit another player's seat

## 5.4 State Validation

Checks whether the action is valid in the current session or game state.

Examples:

- cannot join a closed session
- cannot start a game with zero players
- cannot submit answer outside question phase
- cannot launch a new game while hub already has an active game

## 6. Validation Scope

## 6.1 Mandatory Input Validation

The following must always be validated:

- REST input
- Socket attach payloads
- Socket action payloads
- game configuration payloads
- plugin action payloads

## 6.2 Mandatory Output Validation

Critical outputs must also be validated before leaving the server.

This includes:

- REST create/join/get responses
- `hub:state`
- `game:state`
- structured error payloads

This requirement exists to ensure the implementation does not drift from the
documented contract.

## 6.3 Optional Output Validation

Lower-risk optimization outputs may be validated more lightly at first.

Examples:

- small patch payloads
- temporary debug payloads

However, once a patch becomes a stable public contract, it should receive formal
schema coverage.

## 7. Validation Boundaries

## 7.1 REST Boundary

Before any REST handler performs domain logic, it must validate:

- route params
- query params
- request body

After domain logic completes, the handler must validate the response payload
before sending it.

## 7.2 Socket Boundary

Before any socket event performs domain logic, it must validate:

- event payload shape
- protocol version where relevant
- session identity fields

After processing, critical socket outputs must be validated before emit.

## 7.3 Plugin Boundary

Before a plugin handler receives config or action input, the platform must
validate the corresponding payload using the plugin's registered schema.

Plugins must not receive raw unvalidated payloads from the outside world.

## 8. Schema Strategy

## 8.1 Runtime-First Schemas

GameHub should use a runtime-first schema strategy that can also support
TypeScript type inference or alignment.

The key architectural rule is:

- schema definitions are the source of runtime truth
- TypeScript types should be derived from schemas or remain aligned with them

## 8.2 No Hand-Written Ad Hoc Validation As Primary Strategy

Hand-written `if/else` validation is allowed only as a local supplement for
state and authorization rules, not as the main structural validation layer.

Structural validation must come from formal schemas.

## 8.3 Shared Schemas Across REST And Socket

If two protocol surfaces represent the same semantic payload, they should reuse
the same schema definitions.

Examples:

- participant identity object
- session state payloads
- standardized error payloads
- connect payload shape

This avoids duplicate drift between REST and Socket implementations.

## 9. Plugin Validation Contract

## 9.1 Required Plugin Schemas

Every public plugin entry point must have a schema.

At minimum, plugins must provide schemas for:

- game configuration payload
- action payloads that the plugin accepts

If a plugin exposes multiple actions, it must define validation per action.

## 9.2 Missing Schema Rule

If a plugin introduces a new public action or config payload without a schema,
that is an architectural error.

It must be treated as invalid platform integration, not an acceptable omission.

## 9.3 Plugin State Serialization

Plugins may continue to own role-aware serialization of their game state, but
the outer `game:state` envelope and critical emitted response shape must still
be validated by the platform.

In later phases, plugin-specific state output schemas may also be formalized.

## 10. Error Classification

## 10.1 Validation Errors

Validation errors happen when input or output does not match the required shape
or semantic contract.

Recommended error family examples:

- `error.invalidPayload`
- `error.invalidQuery`
- `error.invalidParams`
- `error.protocolVersionUnsupported`
- `error.invalidConfig`

## 10.2 Domain Rejection Errors

Domain rejection errors happen when input is structurally valid but cannot be
accepted due to current role, state, or business rules.

Examples:

- `error.hostOnly`
- `error.invalidToken`
- `error.sessionClosed`
- `error.gameAlreadyActive`
- `error.actionNotAllowedInState`

## 10.3 Output Contract Errors

These occur when the server is about to emit a payload that does not match the
declared contract.

Recommended error family example:

- `error.invalidServerOutput`

This should be treated as an internal defect and logged with high severity.

## 11. Error Shape

All validation-related failures must use a structured format.

Recommended shape:

```ts
interface ValidationErrorDetails {
  path?: string;
  reason: string;
  expected?: string;
  received?: unknown;
}

interface StructuredErrorPayload {
  protocolVersion: 1;
  code: string;
  details?: ValidationErrorDetails[] | Record<string, unknown>;
}
```

Rules:

- `code` is always mandatory
- `details` are optional
- details are for logging and client handling, not raw UI copy

## 12. Validation Flow

## 12.1 Request Validation Pipeline

Recommended processing sequence:

1. Validate protocol wrapper/envelope if applicable
2. Validate structural shape
3. Validate semantic constraints
4. Validate participant authorization
5. Validate state preconditions
6. Execute domain logic
7. Validate output
8. Emit or return response

## 12.2 Failure Stop Rule

If validation fails at any stage:

- processing stops immediately
- no state mutation occurs
- structured error is returned or emitted
- failure is logged appropriately

## 13. Platform Areas Requiring Schemas

The platform must provide schemas for at least:

- create hub request/response
- join hub request/response
- get hub response
- create game request/response
- join game request/response
- get game response
- hub connect payload
- game connect payload
- standardized socket error payload
- `hub:state`
- `game:state`
- presence event payload

## 14. Plugin Areas Requiring Schemas

Each plugin must provide schemas for:

- configuration payload
- every public `game:action` payload it consumes

Examples:

- Yahtzee:
  - `configure`
  - `score:update`
  - `next-round`
- Quiz:
  - `configure`
  - `start-quiz`
  - `answer`
  - `next-question`

Actions with no payload should still declare an explicit empty schema rather
than relying on absence by convention.

## 15. Output Validation Rules

## 15.1 State Payloads

Critical state payloads must be validated before being sent:

- `hub:state`
- `game:state`

This guards against contract drift and accidental internal corruption.

## 15.2 Error Payloads

All emitted or returned error payloads must conform to the standardized error
schema.

## 15.3 Patch Payloads

Patch payloads may start with lighter validation coverage, but they should still
have declared shapes if they are considered stable platform features.

## 16. Logging And Observability

## 16.1 Required Logging

Validation failures must be observable.

Minimum logging requirements:

- error code
- domain (`rest`, `hub`, `game`, `plugin`)
- route or event name
- participant id if available
- session id if available
- validation stage
- failure details

## 16.2 Severity Guidance

Recommended severity levels:

- malformed external input: warning
- repeated malformed input from same actor: warning or elevated
- output contract failure: error
- missing plugin schema: error during startup or registration

## 17. Client Validation

## 17.1 Allowed Client Validation

Client-side validation is allowed for:

- better forms UX
- preventing obviously empty submissions
- faster local messaging before sending

## 17.2 Forbidden Assumption

Client validation must never be treated as sufficient for:

- authorization
- protocol acceptance
- state transition correctness

The server must enforce the real rules.

## 18. Testing Requirements

## 18.1 Minimum Validation Tests

Every validation-critical path should have tests for:

- valid input accepted
- missing required field rejected
- wrong type rejected
- invalid enum rejected
- unauthorized action rejected
- invalid state rejected
- output contract conformance for critical state payloads

## 18.2 Plugin Test Requirement

Every plugin action schema must have at least:

- one positive test
- one malformed-payload test
- one invalid-state or invalid-role test where applicable

## 18.3 Startup Integrity Test

The platform should have a test or startup integrity check that confirms all
registered plugins expose required schemas for their public actions.

## 19. Mapping To Current Codebase

This spec implies the following evolution from the current implementation:

- REST handlers should stop trusting raw request payloads directly
- socket handlers should validate attach and action payloads before use
- plugin action handling should not accept untyped raw `unknown` without schema
  gating
- current mixed error responses should converge on structured domain codes
- critical outputs like `game:state` and `hub:state` should be validated before
  emit
- validation logic should move out of route/page-specific ad hoc checks into a
  shared schema layer

## 20. Acceptance Criteria

This spec is satisfied when:

- every public REST input is runtime-validated
- every public Socket input is runtime-validated
- plugin public actions cannot exist without schemas
- malformed payloads are rejected before domain logic runs
- domain rejection errors remain separate from malformed-input errors
- critical state outputs are validated before being returned or emitted
- validation failures are logged in a structured way
- minimum test coverage exists for platform and plugin validation paths

## 21. Follow-Up Specs

This document should directly feed:

- concrete schema implementation plan
- error code catalog
- plugin authoring guide
- multiplayer test strategy
- core refactor plan for validated protocol types

## 22. Open Questions

These are intentionally deferred:

- the exact schema library choice
- the exact directory layout for schema definitions
- whether patch payloads should eventually reach full schema coverage
