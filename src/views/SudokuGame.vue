<template>
  <GameShell
    title="🔢 Sudoku × JEV"
    :score="filled + ' / ' + totalEmpty"
    game-over-title="Solved!"
    :game-over="solved"
    :final-score="null"
    reset-label="New Puzzle"
    :running="running"
    :speed="speed"
    :jev-answer="jevAnswer"
    :jev-history="jevHistory"
    @start="toggleStart"
    @reset="resetGame"
    @speed-change="onSpeedChange"
  >
    <template #controls>
      <select v-model="selectedPuzzle" @change="resetGame" class="puzzle-select">
        <option v-for="(p, i) in PUZZLES" :key="i" :value="i">{{ p.label }}</option>
      </select>
    </template>

    <div
      class="sudoku-grid"
      :style="`display:grid; grid-template-columns: repeat(9, ${CELL}px)`"
    >
      <div
        v-for="idx in 81"
        :key="idx"
        :class="sudokuCellClass(Math.floor((idx-1)/9), (idx-1)%9)"
        :style="`width:${CELL}px; height:${CELL}px`"
        class="cell"
      >{{ grid[Math.floor((idx-1)/9)]?.[(idx-1)%9] || '' }}</div>
    </div>
  </GameShell>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import GameShell from '../components/GameShell.vue'

const CELL = 48

const PUZZLES = [
  { label: 'Easy', grid: [
    [5,3,0,0,7,0,0,0,0],[6,0,0,1,9,5,0,0,0],[0,9,8,0,0,0,0,6,0],
    [8,0,0,0,6,0,0,0,3],[4,0,0,8,0,3,0,0,1],[7,0,0,0,2,0,0,0,6],
    [0,6,0,0,0,0,2,8,0],[0,0,0,4,1,9,0,0,5],[0,0,0,0,8,0,0,7,9],
  ]},
  { label: 'Medium', grid: [
    [0,0,0,2,6,0,7,0,1],[6,8,0,0,7,0,0,9,0],[1,9,0,0,0,4,5,0,0],
    [8,2,0,1,0,0,0,4,0],[0,0,4,6,0,2,9,0,0],[0,5,0,0,0,3,0,2,8],
    [0,0,9,3,0,0,0,7,4],[0,4,0,0,5,0,0,3,6],[7,0,3,0,1,8,0,0,0],
  ]},
  { label: 'Hard', grid: [
    [0,0,0,0,0,0,0,1,2],[0,0,0,0,3,5,0,0,0],[0,0,0,6,0,0,0,7,0],
    [7,0,0,0,0,0,3,0,0],[0,0,0,4,0,0,8,0,0],[1,0,0,0,0,0,0,0,0],
    [0,0,0,1,2,0,0,0,0],[0,8,0,0,0,0,0,4,0],[0,5,0,0,0,0,6,0,0],
  ]},
  { label: 'Expert', grid: [
    [8,0,0,0,0,0,0,0,0],[0,0,3,6,0,0,0,0,0],[0,7,0,0,9,0,2,0,0],
    [0,5,0,0,0,7,0,0,0],[0,0,0,0,4,5,7,0,0],[0,0,0,1,0,0,0,3,0],
    [0,0,1,0,0,0,0,6,8],[0,0,8,5,0,0,0,1,0],[0,9,0,0,0,0,4,0,0],
  ]},
]

const selectedPuzzle = ref(0)
const grid = ref([])
const original = ref([])
const activeCell = ref(null)
const running = ref(false)
const speed = ref(1000)
const solved = ref(false)
const jevAnswer = ref(null)
const jevHistory = ref([])
let intervalId = null

const filled = computed(() => grid.value.flat().filter(Boolean).length - original.value.flat().filter(Boolean).length)
const totalEmpty = computed(() => original.value.flat().filter(v => !v).length)

function initGrid() {
  const src = PUZZLES[selectedPuzzle.value].grid
  original.value = src.map(row => [...row])
  grid.value = src.map(row => [...row])
  activeCell.value = null
  solved.value = false
  jevAnswer.value = null
  jevHistory.value = []
}

function sudokuCellClass(r, c) {
  const isOriginal = original.value[r]?.[c] !== 0
  const isActive = activeCell.value?.[0] === r && activeCell.value?.[1] === c
  const borderR = r % 3 === 2 && r !== 8 ? 'border-b-2 border-b-gray-500' : 'border-b border-b-gray-700'
  const borderC = c % 3 === 2 && c !== 8 ? 'border-r-2 border-r-gray-500' : 'border-r border-r-gray-700'
  const bg = isActive ? 'bg-indigo-900' : isOriginal ? 'bg-gray-800' : 'bg-gray-900'
  return [bg, isOriginal ? 'text-white' : 'text-green-400', borderR, borderC].join(' ')
}

function getCandidates(r, c) {
  const used = new Set()
  for (let i = 0; i < 9; i++) { used.add(grid.value[r][i]); used.add(grid.value[i][c]) }
  const boxR = Math.floor(r / 3) * 3, boxC = Math.floor(c / 3) * 3
  for (let br = boxR; br < boxR + 3; br++) for (let bc = boxC; bc < boxC + 3; bc++) used.add(grid.value[br][bc])
  used.delete(0)
  return [1,2,3,4,5,6,7,8,9].filter(d => !used.has(d))
}

function getMostConstrained() {
  let best = null, bestCount = 10
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid.value[r][c] !== 0) continue
      const cands = getCandidates(r, c)
      if (cands.length < bestCount) { bestCount = cands.length; best = { cell: [r, c], candidates: cands } }
    }
  }
  return best
}

async function tick() {
  if (solved.value) return
  const next = getMostConstrained()
  if (!next) { solved.value = true; clearInterval(intervalId); running.value = false; return }
  const { cell, candidates } = next
  if (candidates.length === 0) { console.warn('No candidates — puzzle may be invalid'); return }
  activeCell.value = cell
  try {
    const res = await fetch('/sudoku-move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grid: grid.value, cell, candidates }),
    })
    const result = await res.json()
    if (result.error) { console.error(result.error); return }
    jevAnswer.value = { ...result, choice: String(result.digit) }
    const ts = new Date().toLocaleTimeString('en', { hour12: false })
    jevHistory.value.unshift({ ts, label: `[${cell[0]},${cell[1]}] = ${result.digit}`, labelClass: 'bg-indigo-900 text-indigo-200', confidence: result.confidence })
    if (jevHistory.value.length > 50) jevHistory.value.pop()
    grid.value[cell[0]][cell[1]] = result.digit
  } catch (e) {
    console.error('sudoku fetch error', e)
  }
}

function toggleStart() {
  if (solved.value) { resetGame(); return }
  if (running.value) { clearInterval(intervalId); running.value = false }
  else { intervalId = setInterval(tick, speed.value); running.value = true }
}

function resetGame() {
  clearInterval(intervalId)
  running.value = false
  initGrid()
}

function onSpeedChange(ms) {
  speed.value = ms
  if (running.value) { clearInterval(intervalId); intervalId = setInterval(tick, ms) }
}

onUnmounted(() => clearInterval(intervalId))
initGrid()
</script>

<style scoped>
@reference "tailwindcss";
.sudoku-grid  { @apply border-2 border-gray-500 rounded-lg overflow-hidden inline-block; }
.cell         { @apply flex items-center justify-center font-mono text-sm font-bold; }
.puzzle-select { @apply px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300; }
</style>
