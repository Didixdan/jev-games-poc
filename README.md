# JEV Games — POC

A proof of concept using [JEV](https://docs.typesafe.ai) (TypeSafe AI's System One model) as the decision engine for classic games. The AI doesn't generate text — it returns typed, probability-weighted choices that the game loop consumes directly.

## Games

**Snake** — JEV decides the next move every tick. The grid is serialized as a labeled map (head, body segments, apple, enemies). Before asking JEV, the server runs a flood fill per valid direction and passes the reachable cell count alongside Manhattan distance to the apple, so JEV can reason about traps, not just proximity.

**Sudoku** — JEV fills the grid digit by digit. Each step picks the most constrained empty cell (fewest valid candidates), sends the current grid state with row/column/box constraints to JEV, and applies its answer.

## Architecture

```
server/index.js        Node.js API (ESM) — JEV calls, game logic helpers
src/
  views/
    SnakeGame.vue      Snake game state and loop
    SudokuGame.vue     Sudoku game state and loop
  components/
    GameShell.vue      Shared layout: score, speed slider, game-over overlay
    GameGrid.vue       Generic grid renderer (cellClass callback)
    JevPanel.vue       JEV results: choice badge, probability bars, confidence gauge, copy prompt
    HistoryLog.vue     Scrollable move history
  App.vue              Navigation
  main.js              Vue 3 + Vue Router entry point
```

The Vite dev server proxies `/move` and `/sudoku-move` to the Node API on port 3001.

## Stack

- **Frontend** — Vue 3 (SFC, Composition API), Vue Router, Tailwind CSS v4, Vite
- **Backend** — Node.js (ESM, no framework), `@typesafe-ai/sdk`
- **AI** — JEV via TypeSafe `systemOne` API, `choice` primitive

## Getting started

```bash
npm install
```

Copy `.env` and set your TypeSafe API key:

```bash
cp .env.example .env   # or just edit .env directly
# TYPESAFE_API_KEY=your_key_here
```

Run in development (hot-reload on both server and client):

```bash
npm run dev
# API  → http://localhost:3001
# App  → http://localhost:5173
```

Build for production:

```bash
npm run build
npm start   # serves dist/ + API on port 3000
```

## What JEV receives

Each game serializes its full state as structured text. For Snake, JEV sees the labeled grid, the head and apple coordinates, the list of valid moves, and a per-move analysis (reachable cells + distance). For Sudoku, it sees the grid, the target cell, and which digits are already present in its row, column, and box.

The `JevPanel` component displays JEV's raw output: the chosen option, probability distribution across all candidates, confidence score, latency, and the exact state string that was sent — with a copy button for pasting into the TypeSafe playground.
