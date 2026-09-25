<template>
  <GameShell
    title="🐍 Snake × JEV"
    :score="score"
    :game-over="gameOver"
    :final-score="score"
    :running="running"
    :speed="speed"
    :jev-answer="jevAnswer"
    :jev-history="jevHistory"
    @start="toggleStart"
    @reset="resetGame"
    @speed-change="onSpeedChange"
  >
    <GameGrid :rows="ROWS" :cols="COLS" :cell-class="cellClass" />
    <template #gameover-actions>
      <button @click="copyLastPrompt" class="copy-last-btn" :class="{ copied: copiedLast }">
        {{ copiedLast ? 'Copied!' : 'Copy last prompt' }}
      </button>
    </template>
  </GameShell>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import GameShell from '../components/GameShell.vue'
import GameGrid from '../components/GameGrid.vue'

const ROWS = 16, COLS = 21
const DIRECTIONS = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }
const BODY_STOPS = ['bg-green-500','bg-green-600','bg-green-700','bg-green-800','bg-green-900','bg-green-950']
const DIR_ICONS = { up: '↑', down: '↓', left: '←', right: '→' }
const MOVE_COLORS = { up: 'bg-blue-800 text-blue-200', down: 'bg-purple-800 text-purple-200', left: 'bg-orange-800 text-orange-200', right: 'bg-cyan-800 text-cyan-200' }

const grid = ref([])
const snake = ref([])
const score = ref(0)
const gameOver = ref(false)
const running = ref(false)
const speed = ref(800)
const jevAnswer = ref(null)
const jevHistory = ref([])
const copiedLast = ref(false)
let intervalId = null
let lastFullPrompt = ''

function initGrid() {
  grid.value = Array.from({ length: ROWS }, () => Array(COLS).fill('S'))
  const midR = Math.floor(ROWS / 2), midC = Math.floor(COLS / 2)
  snake.value = [[midR, midC], [midR, midC + 1], [midR, midC + 2]]
  redrawSnake()
  for (let i = 0; i < 4; i++) placeRandom('E')
  placeRandom('A')
  score.value = 0
  gameOver.value = false
}

function redrawSnake() {
  snake.value.forEach(([r, c], i) => { grid.value[r][c] = i === 0 ? '1' : String(i + 1) })
}

function placeRandom(value) {
  let r, c
  do { r = Math.floor(Math.random() * ROWS); c = Math.floor(Math.random() * COLS) }
  while (grid.value[r][c] !== 'S')
  grid.value[r][c] = value
}

function cellClass(r, c) {
  const val = grid.value[r]?.[c]
  if (val === 'S') return 'bg-gray-900'
  if (val === '1') return 'bg-green-300 rounded-sm'
  if (val === 'A') return 'bg-red-500'
  if (val === 'E') return 'bg-yellow-500'
  const idx = parseInt(val) - 2
  return BODY_STOPS[Math.min(idx, BODY_STOPS.length - 1)]
}

function getValidMoves() {
  const [hr, hc] = snake.value[0]
  return Object.entries(DIRECTIONS)
    .filter(([, [dr, dc]]) => {
      const nr = hr + dr, nc = hc + dc
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return false
      const v = grid.value[nr][nc]
      return v === 'S' || v === 'A'
    })
    .map(([dir]) => dir)
}

function applyMove(dir) {
  const [dr, dc] = DIRECTIONS[dir]
  const [hr, hc] = snake.value[0]
  const nr = hr + dr, nc = hc + dc
  if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || grid.value[nr][nc] === 'E') {
    endGame(); return
  }
  const grow = grid.value[nr][nc] === 'A'
  if (!grow) {
    const [tr, tc] = snake.value.pop()
    grid.value[tr][tc] = 'S'
  }
  snake.value.unshift([nr, nc])
  redrawSnake()
  if (grow) { score.value++; placeRandom('A') }
}

function endGame() {
  gameOver.value = true
  clearInterval(intervalId)
  running.value = false
}

async function tick() {
  if (gameOver.value) return
  const validMoves = getValidMoves()
  if (validMoves.length === 0) { endGame(); return }
  const headPos = snake.value[0]
  let applePos = null
  outer: for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (grid.value[r][c] === 'A') { applePos = [r, c]; break outer }
  try {
    const res = await fetch('/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grid: grid.value, validMoves, headPos, applePos }),
    })
    const result = await res.json()
    if (result.error) { console.error(result.error); return }
    lastFullPrompt = result.fullPrompt || ''
    jevAnswer.value = { ...result, choice: result.move }
    const ts = new Date().toLocaleTimeString('en', { hour12: false })
    jevHistory.value.unshift({
      ts,
      label: DIR_ICONS[result.move] + ' ' + result.move,
      labelClass: MOVE_COLORS[result.move] || 'bg-gray-700 text-gray-200',
      confidence: result.confidence,
    })
    if (jevHistory.value.length > 50) jevHistory.value.pop()
    applyMove(result.move)
  } catch (e) {
    console.error('fetch error', e)
  }
}

function toggleStart() {
  if (gameOver.value) { resetGame(); return }
  if (running.value) { clearInterval(intervalId); running.value = false }
  else { intervalId = setInterval(tick, speed.value); running.value = true }
}

function resetGame() {
  clearInterval(intervalId)
  running.value = false
  jevHistory.value = []
  jevAnswer.value = null
  initGrid()
}

function onSpeedChange(ms) {
  speed.value = ms
  if (running.value) { clearInterval(intervalId); intervalId = setInterval(tick, ms) }
}

function copyLastPrompt() {
  if (!lastFullPrompt) return
  navigator.clipboard.writeText(lastFullPrompt).then(() => {
    copiedLast.value = true
    setTimeout(() => { copiedLast.value = false }, 2000)
  })
}

onUnmounted(() => clearInterval(intervalId))
initGrid()
</script>

<style scoped>
@reference "tailwindcss";
.copy-last-btn        { @apply px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded font-medium transition-colors text-sm; }
.copy-last-btn.copied { @apply bg-green-800; }
</style>
