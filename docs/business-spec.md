# GameHub Business Specification

## Document Status

- Status: Draft v1
- Owner: Product / Architecture
- Purpose: source document for future technical specifications

This document defines the product intent, business requirements, scope,
constraints, and success criteria for GameHub. Technical documents should be
derived from this spec rather than invented ad hoc during implementation.

## 1. Product Summary

GameHub is a modular LAN multiplayer party-game platform designed for
small-group social play in homes, offices, and casual events.

One host device runs the game session and displays the shared game board.
Players join quickly on their own phones via QR code and use those phones as
controllers. Each game is implemented as a module on top of a shared platform,
so the product can grow from one game into a reusable party-game system.

## 2. Product Vision

Create a lightweight, local-first party-game platform that lets one person host
a fun, frictionless multiplayer session in under two minutes, without accounts,
downloads, or complicated setup.

The long-term product value is not a single game. It is a reusable multiplayer
engine and product shell that can support multiple social games with consistent
joining, hosting, reconnect, results, and session flow.

## 3. Problem Statement

Most local party games fail at least one of these requirements:

- they require every player to install an app or create an account
- they are hard to set up quickly in a social setting
- they do not handle reconnection well when a phone refreshes or drops Wi-Fi
- they are built as one-off games instead of a reusable platform

GameHub solves this by offering:

- instant join via LAN + QR
- browser-based phone controllers
- host-controlled shared screen play
- multiple games on one consistent platform

## 4. Product Goals

### Primary Goals

- Make joining a multiplayer session extremely fast and understandable
- Keep gameplay stable for 4-8 players on the same LAN
- Allow a host to run multiple games in one session without re-onboarding users
- Support both multiplayer and local single-screen play
- Make new games cheap to add through a stable platform contract

### Secondary Goals

- Make the repository understandable to contributors
- Establish a foundation for open source collaboration
- Enable future advanced party games without rewriting the platform

## 5. Non-Goals

The following are explicitly out of scope for the current phase:

- internet/WAN multiplayer
- user accounts and login
- cloud sync
- matchmaking
- payments or monetization
- app-store distribution
- heavy persistence requirements
- competitive anti-cheat systems

## 6. Target Users

### Host

The host is the person who starts the session on a laptop or tablet and manages
the game flow. The host expects:

- very low setup friction
- clear control of who is in the room
- confidence that players can reconnect
- a readable shared-screen experience

### Player

The player joins from a phone and wants:

- a fast join flow
- clear instructions
- responsive controls
- confidence that accidental refresh or reconnection will not ruin the session

### Organizer / Repeated User

This is the person who uses GameHub for recurring game nights, office parties,
or workshops. They care about:

- reliability
- predictable flow across multiple games
- variety of games on one platform

## 7. Core Product Principles

- Local-first: GameHub is optimized for same-network play, not remote play
- Zero-account: joining should not require identity setup
- Host-led: one device orchestrates the shared session
- Phone-as-controller: personal devices are input surfaces, not the main board
- Game modularity: platform and game logic should remain cleanly separated
- Server authority: game state and validation belong on the server
- Low-friction recovery: reconnect should feel like recovery, not re-entry

## 8. Core Use Cases

### Use Case 1: Quick Game

The host wants to start a single game immediately.

Success means:

- host selects a game
- players join via QR or local mode is used
- game starts with minimal steps
- game ends cleanly and can be restarted or exited

### Use Case 2: Game Night Hub

The host wants to run multiple games in one sitting without asking players to
rejoin each time.

Success means:

- players scan once
- players stay associated with the session
- host can launch another game from the hub
- players transition smoothly between games

### Use Case 3: Local Single-Screen Play

The host wants to use one device and manage all players manually.

Success means:

- host can add players directly
- game works without phone controllers
- the UX remains simple and fast

### Use Case 4: Recovery During Play

A player refreshes their browser or temporarily loses connection.

Success means:

- the player identity is restored automatically or with minimal friction
- the player returns to the same hub or game context
- the game state remains correct

## 9. Product Scope

### In Scope Now

- LAN multiplayer sessions
- QR-based joining
- Host screen + phone controller pattern
- Hub mode for multi-game sessions
- Quick Game mode
- Local mode
- Game plugins/modules
- Yahtzee and Quiz as reference games

### In Scope Next

- improved reconnect and session recovery
- explicit room lifecycle
- runtime validation
- event logging and debug visibility
- one more advanced game to validate engine flexibility

### Out Of Scope For Current Business Phase

- public user profiles
- persistent player history across installations
- cloud-hosted rooms
- social features outside the game session itself

## 10. Business Requirements

### BR-1: Fast Session Creation

The system must allow a host to create a playable session in under two minutes
without requiring technical setup beyond opening the application.

### BR-2: Fast Join Flow

The system must let players join from a mobile browser using a QR code or a
short URL without requiring account creation.

### BR-3: Stable 4-8 Player Experience

The system must support stable local multiplayer sessions for 4-8 players on
standard consumer Wi-Fi.

### BR-4: Session Continuity

The system must preserve player participation across temporary disconnects and
browser refresh whenever feasible.

### BR-5: Multi-Game Session Support

The system must support a hub flow in which a group can move through multiple
games without repeating the entire join process.

### BR-6: Modular Game Delivery

The platform must support adding new games as modules with minimal changes to
shared engine code.

### BR-7: Host Control

The host must be able to manage session flow, start games, end games, and
resolve blocked states when needed.

### BR-8: Local Mode Support

The system must support a local mode for one-screen play where the host manages
players directly.

### BR-9: Understandable UX

The product must be understandable without lengthy explanation. New users
should be able to infer how to join, wait, play, and finish.

### BR-10: Documentation-Driven Development

The product must be documented in a way that supports deliberate technical
design rather than opportunistic implementation.

## 11. Product Requirements By Area

### Session And Identity

- A session must have a clear owner/host
- A player must have a stable identity within a session
- Re-entry should restore the same identity where possible
- Session state must be recoverable from the server

### Multiplayer Flow

- Joining, waiting, playing, result presentation, and return flow must be
  explicit states in the product model
- Players must receive only the information they are allowed to see
- The host must be able to observe room health and player presence

### Game Platform

- Each game must provide configuration, state creation, interaction handling,
  and player-specific display logic
- The platform must provide shared concerns such as identity, transport,
  lifecycle, and transition between screens

### Reliability

- The system must degrade gracefully under refreshes and temporary network loss
- The system must avoid silent state corruption
- The product must provide enough diagnostics to debug multiplayer issues

## 12. UX And Experience Requirements

- Primary interaction language for game UI is Polish
- Joining and waiting screens must be mobile-first
- Host views must be legible on laptop screens and TVs
- Important state transitions must be obvious:
  - joined
  - waiting
  - game starting
  - active round
  - round result
  - final result
- Players should never be unsure whether their input was accepted

## 13. Business Success Metrics

The following metrics define whether the current phase is successful:

- a host can create and start a session in under 2 minutes
- 4-8 players can complete a session without major technical intervention
- refresh/reconnect does not commonly remove a player from the game
- a second and third game can be launched without major platform rewrites
- contributors can understand how to add or modify a game

## 14. Risks

- Reconnect complexity may create hidden state bugs if not designed explicitly
- Incremental patches without strong recovery paths can produce drift
- New games may push game-specific logic into the core if contracts stay vague
- UI complexity can grow faster than platform discipline

## 15. Assumptions

- The primary environment is a shared local network
- Players are comfortable using a phone browser without installing an app
- The host device is more powerful and more stable than player devices
- Real fun value comes from low friction and social clarity, not graphical depth

## 16. Product Decisions Already Made

The following decisions are considered active unless explicitly revised:

- LAN-first architecture
- token-based session model rather than accounts
- host-controlled session flow
- server-authoritative game state
- plugin-based game architecture
- support for both hub mode and quick game mode
- support for both multiplayer and local mode

## 17. Open Business Questions

These questions should be answered before deeper technical design is finalized:

- Is GameHub primarily a party game hub, or a reusable local multiplayer engine
  that happens to ship with party games first?
- Should the short-term priority be reliability and reconnect, or visible game
  expansion to increase perceived product value?
- What level of persistence is desirable for repeat hosts:
  none, local-only, or lightweight file-based history?
- Is the target experience optimized more for home use, office socials, or both?

## 18. Technical Documents That Should Derive From This Spec

The next technical documents should use this file as input:

- Architecture overview
- Room lifecycle specification
- Session identity and reconnect specification
- Client/server protocol specification
- Validation strategy
- Plugin API and game authoring guide
- Multiplayer test strategy
- Power Quiz Lite game design and rules spec

## 19. Acceptance Of This Document

This document should be treated as accepted when:

- product direction is clear enough to guide engineering decisions
- scope boundaries are explicit
- success criteria are testable
- follow-up technical specs can be written without redefining the product
