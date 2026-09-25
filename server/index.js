import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { TypeSafeClient, choice } from "@typesafe-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const client = new TypeSafeClient();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === "production";

function buildSnakeGridString(grid) {
  return [
    "Here is a snake map.",
    '"S" = free cell (safe to enter).',
    '"1" = snake head.',
    '"2", "3", "4", ... = snake body segments in order from head to tail.',
    '"A" = apple (reach it to grow).',
    '"E" = enemy (touching one ends the game immediately).',
    "The snake cannot move through its own body or into an enemy.",
    "",
    ...grid.map((row) => row.join(" ")),
  ].join("\n");
}

const DELTAS = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };

function floodFill(grid, startR, startC) {
  const rows = grid.length, cols = grid[0].length;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const queue = [[startR, startC]];
  visited[startR][startC] = true;
  let count = 0;
  while (queue.length) {
    const [r, c] = queue.shift();
    count++;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
        const v = grid[nr][nc];
        if (v === "S" || v === "A") { visited[nr][nc] = true; queue.push([nr, nc]); }
      }
    }
  }
  return count;
}

async function askJevSnake(grid, validMoves, headPos, applePos) {
  const gridString = buildSnakeGridString(grid);
  const moveAnalysis = validMoves.map((dir) => {
    const [dr, dc] = DELTAS[dir];
    const nr = headPos[0] + dr, nc = headPos[1] + dc;
    const reachable = floodFill(grid, nr, nc);
    const dist = Math.abs(nr - applePos[0]) + Math.abs(nc - applePos[1]);
    return `  ${dir}: ${reachable} reachable cells, distance to apple = ${dist}`;
  }).join("\n");

  const context = [
    gridString, "",
    `Snake head: row ${headPos[0]}, col ${headPos[1]}.`,
    `Apple: row ${applePos[0]}, col ${applePos[1]}.`,
    `Valid moves: ${validMoves.join(", ")}.`, "",
    "Move analysis (low reachable = likely trap):",
    moveAnalysis, "",
    "IMPORTANT: prioritize survival. Avoid moves with very few reachable cells even if closer to apple.",
  ].join("\n");

  const t0 = Date.now();
  const res = await client.systemOne({
    state: context,
    questions: {
      move: choice(
        "Which direction? Prefer most reachable cells. Only sacrifice space if apple is directly reachable safely.",
        Object.fromEntries(validMoves.map((m) => [m, null]))
      ),
    },
  });
  const latency = Date.now() - t0;
  const answer = res.answers.move;
  return { move: answer.choice, probabilities: answer.probabilities, confidence: answer.confidence, latency, fullPrompt: context, gridPreview: gridString.slice(0, 400) };
}

function buildSudokuGridString(grid) {
  const lines = [];
  for (let r = 0; r < 9; r++) {
    const row = grid[r].map((v) => v === 0 ? "." : String(v));
    lines.push(`${row.slice(0, 3).join(" ")} | ${row.slice(3, 6).join(" ")} | ${row.slice(6, 9).join(" ")}`);
    if (r === 2 || r === 5) lines.push("------+-------+------");
  }
  return lines.join("\n");
}

async function askJevSudoku(grid, cell, candidates) {
  const [r, c] = cell;
  const boxR = Math.floor(r / 3) * 3, boxC = Math.floor(c / 3) * 3;
  const rowVals = grid[r].filter(Boolean).sort().join(", ");
  const colVals = grid.map((row) => row[c]).filter(Boolean).sort().join(", ");
  const boxVals = [];
  for (let br = boxR; br < boxR + 3; br++) for (let bc = boxC; bc < boxC + 3; bc++) if (grid[br][bc]) boxVals.push(grid[br][bc]);
  boxVals.sort();

  const context = [
    "Sudoku grid (. = empty):",
    buildSudokuGridString(grid), "",
    `Deciding cell: row ${r}, col ${c}.`,
    `Row ${r} contains: ${rowVals || "nothing yet"}.`,
    `Column ${c} contains: ${colVals || "nothing yet"}.`,
    `3×3 box contains: ${boxVals.join(", ") || "nothing yet"}.`,
    `Valid candidates for this cell: ${candidates.join(", ")}.`,
    "Choose the digit that fits the standard Sudoku constraints (each digit 1-9 must appear exactly once per row, column, and 3×3 box).",
  ].join("\n");

  const t0 = Date.now();
  const res = await client.systemOne({
    state: context,
    questions: {
      digit: choice(
        "Which digit should go in this cell?",
        Object.fromEntries(candidates.map((d) => [String(d), null]))
      ),
    },
  });
  const latency = Date.now() - t0;
  const answer = res.answers.digit;
  return { digit: parseInt(answer.choice), probabilities: answer.probabilities, confidence: answer.confidence, latency, fullPrompt: context, gridPreview: buildSudokuGridString(grid) };
}

async function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  if (IS_PROD && req.method === "GET" && !req.url.startsWith("/move") && !req.url.startsWith("/sudoku-move")) {
    const distDir = path.join(__dirname, "../dist");
    const filePath = req.url === "/" ? "index.html" : req.url.slice(1);
    try {
      const content = fs.readFileSync(path.join(distDir, filePath));
      const mime = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml" }[path.extname(filePath)] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": mime });
      res.end(content);
    } catch {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(fs.readFileSync(path.join(distDir, "index.html")));
    }
    return;
  }

  if (req.method === "POST" && req.url === "/move") {
    try {
      const { grid, validMoves, headPos, applePos } = JSON.parse(await readBody(req));
      const result = await askJevSnake(grid, validMoves, headPos, applePos);
      console.log(`[SNAKE] move=${result.move} conf=${result.confidence.toFixed(2)} ${result.latency}ms`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      console.error("[SNAKE ERROR]", err.message);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === "POST" && req.url === "/sudoku-move") {
    try {
      const { grid, cell, candidates } = JSON.parse(await readBody(req));
      const result = await askJevSudoku(grid, cell, candidates);
      console.log(`[SUDOKU] digit=${result.digit} conf=${result.confidence.toFixed(2)} ${result.latency}ms`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      console.error("[SUDOKU ERROR]", err.message);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`JEV API server → http://localhost:${PORT}`);
  if (!process.env.TYPESAFE_API_KEY) console.warn("WARNING: TYPESAFE_API_KEY not set");
});
