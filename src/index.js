const http = require("http");
const fs = require("fs");
const path = require("path");
const { TypeSafeClient, choice } = require("@typesafe-ai/sdk");

const client = new TypeSafeClient();

function buildGridString(grid) {
  const legend = [
    "Here is a snake map.",
    '"S" = free cell (safe to enter).',
    '"1" = snake head.',
    '"2", "3", "4", ... = snake body segments in order from head to tail (the higher the number, the further from the head).',
    '"A" = apple (reach it to grow).',
    '"E" = enemy (touching one ends the game immediately).',
    "The snake cannot move through its own body or into an enemy.",
    "",
  ].join("\n");
  return legend + grid.map((row) => row.join(" ")).join("\n");
}

const DELTAS = { up: [-1,0], down: [1,0], left: [0,-1], right: [0,1] };

function floodFill(grid, startR, startC) {
  const rows = grid.length, cols = grid[0].length;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const queue = [[startR, startC]];
  visited[startR][startC] = true;
  let count = 0;
  while (queue.length) {
    const [r, c] = queue.shift();
    count++;
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = r+dr, nc = c+dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
        const v = grid[nr][nc];
        if (v === "S" || v === "A") { visited[nr][nc] = true; queue.push([nr, nc]); }
      }
    }
  }
  return count;
}

function manhattan(r1, c1, r2, c2) { return Math.abs(r1-r2) + Math.abs(c1-c2); }

async function askJev(grid, validMoves, headPos, applePos) {
  const gridString = buildGridString(grid);

  // Per-move analysis: reachable cells + distance to apple
  const moveAnalysis = validMoves.map((dir) => {
    const [dr, dc] = DELTAS[dir];
    const nr = headPos[0]+dr, nc = headPos[1]+dc;
    const reachable = floodFill(grid, nr, nc);
    const dist = manhattan(nr, nc, applePos[0], applePos[1]);
    return `  ${dir}: ${reachable} reachable cells after move, Manhattan distance to apple = ${dist}`;
  }).join("\n");

  const context = [
    gridString,
    "",
    `Snake head is at row ${headPos[0]}, col ${headPos[1]} (cell "1").`,
    `Apple is at row ${applePos[0]}, col ${applePos[1]} (cell "A").`,
    `Valid moves from head: ${validMoves.join(", ")}.`,
    "",
    "Move analysis (reachable = open space accessible after that step — low means likely trapped):",
    moveAnalysis,
    "",
    "IMPORTANT: prioritize survival over apple distance. A move with very few reachable cells is a trap — avoid it even if it is closer to the apple.",
  ].join("\n");

  const t0 = Date.now();
  const criteria = Object.fromEntries(validMoves.map((m) => [m, null]));
  const res = await client.systemOne({
    state: context,
    questions: {
      move: choice(
        "Which direction should the snake move? Prefer the move with the most reachable cells (avoid traps). Only sacrifice space if the apple is directly reachable safely.",
        criteria
      ),
    },
  });
  const latency = Date.now() - t0;
  const answer = res.answers.move;
  return {
    move: answer.choice,
    probabilities: answer.probabilities,
    confidence: answer.confidence,
    latency,
    fullPrompt: context,
    gridPreview: gridString.slice(0, 400),
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/") {
    const html = fs.readFileSync(path.join(__dirname, "index.html"));
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
    return;
  }

  if (req.method === "POST" && req.url === "/move") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { grid, validMoves, headPos, applePos } = JSON.parse(body);
        const result = await askJev(grid, validMoves, headPos, applePos);
        console.log(`[JEV] move=${result.move} confidence=${result.confidence.toFixed(2)} latency=${result.latency}ms`);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error("[JEV ERROR]", err.message);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Snake + JEV running at http://localhost:${PORT}`);
  if (!process.env.TYPESAFE_API_KEY) {
    console.warn("WARNING: TYPESAFE_API_KEY not set");
  }
});
