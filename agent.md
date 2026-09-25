# Project context for AI agents

This is a proof-of-concept game platform where JEV (TypeSafe AI's System One model) acts as the decision engine for classic games. The AI returns typed, probability-weighted choices — no text generation, no reasoning output. Code owns the game loop; JEV supplies the move.

## How it works

The server (`server/index.js`) exposes two POST endpoints: `/move` for Snake and `/sudoku-move` for Sudoku. Both endpoints build a structured natural-language state string, call `client.systemOne` with a `choice` question, and return the answer plus probabilities, confidence, and latency to the frontend.

The Vue 3 frontend polls these endpoints on a configurable interval (the speed slider). The `JevPanel` component renders the raw JEV output after each call.

## Key files

- `server/index.js` — all JEV logic: state serialization, flood fill, constraint extraction, API calls
- `src/views/SnakeGame.vue` — snake game state, grid encoding (`S`/`1`/`2..n`/`A`/`E`), move application
- `src/views/SudokuGame.vue` — sudoku puzzles, MRV cell selection, candidate computation
- `src/components/JevPanel.vue` — displays JEV answer: choice badge, probability bars, confidence gauge, state preview, copy button
- `src/components/GameShell.vue` — shared game layout (score, speed slider, game-over overlay, JevPanel)
- `src/components/GameGrid.vue` — generic grid renderer, takes a `cellClass(r, c)` callback

## Grid encoding (Snake)

| Value | Meaning |
|-------|---------|
| `S` | Free cell |
| `1` | Snake head |
| `2`, `3`, `4`… | Body segments, numbered head→tail |
| `A` | Apple |
| `E` | Enemy |

## JEV state design

Snake: full grid + head/apple coordinates + flood-fill reachable cell count per valid direction. The reachable count is computed server-side so JEV can distinguish traps from open paths.

Sudoku: full grid + target cell + row/column/box contents. Only valid candidates (pre-filtered by rules) are offered as choice options.

## Dev setup

```bash
npm install
# edit .env → set TYPESAFE_API_KEY=your_key
npm run dev   # Vite on :5173, API on :3001
```

The server loads `.env` via `--env-file=.env` (Node 20.6+). Do not use `export` or `dotenv` — the flag handles it natively.
