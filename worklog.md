# Doodle Duel — Multiplayer Drawing & Guessing Game

## Project Overview
A Skribbl-like real-time multiplayer drawing & guessing game built with Next.js 16, Socket.io, and TypeScript. Players join rooms, take turns drawing words while others guess in chat. Points awarded for fast correct guesses and good drawings.

## Architecture
- **Frontend**: Next.js 16 (port 3000) — single route `/` with view-state machine (lobby → room → game-over)
- **Backend mini-service**: Socket.io server on port 3003 (`mini-services/game-service/`)
- **Gateway**: Caddy routes `?XTransformPort=3003` to the socket service
- **State**: Zustand store on client; in-memory room state on the socket server

## Key Files
- `mini-services/game-service/index.ts` — Socket.io game server
- `src/lib/game-types.ts` — Shared TS types
- `src/lib/words.ts` — Word lists by category
- `src/lib/socket.ts` — Socket client singleton
- `src/hooks/use-game.ts` — Zustand store + socket event handlers
- `src/components/game/*` — Game UI components
- `src/app/page.tsx` — Main orchestrator

---
Task ID: 0
Agent: main
Task: Initial project scaffolding and planning

Work Log:
- Explored existing Next.js 16 project structure
- Installed socket.io and socket.io-client
- Designed architecture: mini-service on 3003 + Next.js on 3000
- Planned feature set: drawing tools, color palette, hints, emoji reactions, rounds, scoring, avatars, categories, mobile touch support

Stage Summary:
- Dependencies installed; ready to build game server and frontend

---
Task ID: 1
Agent: main
Task: Build complete Doodle Duel multiplayer game end-to-end

Work Log:
- Installed socket.io + socket.io-client
- Built game mini-service on port 3003 (mini-services/game-service/index.ts) with:
  - Room create/join/reconnect, player management, host migration
  - Game state machine: waiting -> choosing -> drawing -> round-end -> game-end
  - Word selection from 8 categories (Animals, Food, Objects, Nature, Fantasy, Sports, Movies, Challenge)
  - Progressive hint reveal system (masked word with letter reveals)
  - Round timer with 1s tick + hint scheduling
  - Scoring: guessers get 50 + order bonus + time bonus; drawer gets 40 per correct guess
  - Close-guess detection (Levenshtein-style)
  - Real-time drawing stroke broadcast (normalized 0..1 coords for resolution independence)
  - Canvas clear/undo broadcast
  - Emoji reactions broadcast
  - Settings updates (rounds, draw time, word mode, category, custom words, hints)
  - Player kick, disconnect handling with 30s reconnection grace
- Built frontend (Next.js 16):
  - src/lib/game-types.ts — full typed socket event contract
  - src/lib/words.ts — 8 word categories, avatars, colors
  - src/lib/socket.ts — singleton socket client via Caddy XTransformPort
  - src/hooks/use-game.ts — Zustand store with all game actions
  - src/components/game/drawing-canvas.tsx — high-DPI canvas with 8 tools (pen, brush, eraser, fill, line, rect, circle, spray), flood fill, undo/redo, real-time sync
  - src/components/game/toolbar.tsx — tool palette, 30 colors + custom picker, 5 brush sizes
  - src/components/game/players-panel.tsx — live player list with scores, drawer indicator, host crown
  - src/components/game/chat-panel.tsx — chat + guess panel with correct/close/system message styles
  - src/components/game/landing-view.tsx — hero, player setup (name/avatar/color), create/join room, settings, how-to-play
  - src/components/game/game-room-view.tsx — main game orchestrator with header (word/timer/round), canvas, toolbar, players, chat, mobile sheet, word picker
  - src/components/game/word-picker.tsx — animated word selection modal with countdown
  - src/components/game/overlays.tsx — floating emoji reactions, round-end overlay, correct-guess toast
- Verified end-to-end with agent-browser (2 sessions through Caddy port 81):
  - Alice created room MDA2E, Bob joined -> 2 players visible to both
  - Alice started game -> word picker appeared with 3 choices
  - Alice picked "Frog" -> drawing phase started, Alice saw word, Bob saw masked hint "_ _ _ _"
  - Bob guessed "Frog" -> "guessed the word!" message, scores updated (Bob 233, Alice 40)
  - Round transitioned to Bob's turn -> Bob became drawer with word "Alien", timer counting down
  - Bob drew on canvas -> Alice received strokes in real-time (verified 60 dark pixels synced)
  - Mobile viewport (390x844) tested — responsive layout with compact header and reactions bar
- Lint passes clean (0 errors, 0 warnings)

Stage Summary:
- Game is fully playable end-to-end: create room, invite friends, take turns drawing/guessing, score points, win
- Real-time multiplayer verified working through Caddy gateway with XTransformPort=3003
- Mobile-responsive with bottom sheet for players/chat on small screens
- 8 drawing tools, 30+ colors, progressive hints, emoji reactions, leaderboard
- Production-ready; remaining ideas for future enhancement listed below

Unresolved / Future Enhancement Ideas:
- Sound effects (Web Audio API) for correct guess, tick, round end
- Confetti particle effect on correct guess (currently only toast)
- Save drawing gallery / replay system
- AI word suggestions using LLM skill
- Voice chat via WebRTC
- Persistent leaderboard via Prisma
- More game modes (team mode, speed mode, no-hints mode)

---
Task ID: 2
Agent: main
Task: Add global lobby matchmaking + real-time live drawing streaming + remove spray tool

Work Log:
- Removed spray tool from ToolType union, toolbar TOOLS array, and canvas drawStroke logic
- Added `isPublic: boolean` to Room type; createRoom now takes isPublic flag (private by default)
- Added `room:join-random` socket event with matchmaking: finds an open public room in 'waiting' phase (prefers rooms with more players), or creates a new public room if none exists
- Replaced single `draw:stroke` event with 3-event live streaming protocol:
  - `draw:stroke-start` (full DrawStroke with first point) — sent on pointerdown
  - `draw:stroke-point` (StrokePoint { strokeId, x, y }) — sent on each pointermove, streams incremental points
  - `draw:stroke-end` (strokeId) — sent on pointerup to finalize
- Rewrote drawing-canvas.tsx with offscreen "base canvas" architecture:
  - Base canvas holds all committed strokes; visible canvas composites base + live preview
  - Append tools (pen/brush/eraser): stream points incrementally; spectator draws segment-by-segment in real-time
  - Shape tools (line/rect/circle): spectator restores from base + redraws shape with updated endpoint on each point
  - Fill tool: single-shot, committed immediately
  - Added imperative handle methods: applyStrokeStart/Point/End, remoteUndo (no server echo), resetCanvas
  - try/catch around setPointerCapture for synthetic event robustness
- Updated Zustand store: added joinRandomRoom, sendStrokeStart/Point/End actions; live stream events stored as nonce-bumped signals (liveStrokeStart/Point/End, drawClearNonce, drawUndoNonce)
- Updated GameRoomView: consumes store stream events via effects that call canvas imperative methods; added "🌐 Global Lobby" / "🔒 Private Room" badge in header
- Added prominent "Quick Play — Join Global Lobby" CTA button on landing hero (gradient violet→fuchsia→rose) with loading state
- Lint passes clean (0 errors, 0 warnings)

Verification (agent-browser, 2 sessions through Caddy port 81):
- Quick Play matchmaking: both players clicked Quick Play → matched into SAME room USSYW (global lobby badge shown)
- Real-time streaming PROVEN with progressive pixel test:
  * A drew a stroke; B received 466 dark pixels matching A exactly (final sync)
  * Progressive mid-stroke test: B showed 256 dark pixels after 2 pointermoves (A had NOT released), then 616 after 4 moves (still not released) — proving points stream live point-by-point, not as a batch on pointerup
- Spray tool confirmed removed (7 tool buttons: Pen, Brush, Eraser, Fill, Line, Rectangle, Circle)
- No console/runtime errors

Stage Summary:
- Global lobby matchmaking works end-to-end (Quick Play → join/create public room)
- Real-time live drawing streaming works: spectators watch the line being drawn as it happens, point-by-point
- Spray tool removed from UI and types
- All three requested features delivered and verified

Unresolved / Notes:
- HMR (hot module replacement) during development can disrupt in-memory canvas refs and socket connections; this is dev-only and does not affect production
- Clear canvas button relies on tooltip-based selection in tests; the feature works via the toolbar's trash button in normal use
