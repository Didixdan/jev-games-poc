<template>
  <div class="app">
    <nav class="nav">
      <span class="nav-brand">JEV Games</span>
      <RouterLink
        v-for="game in games"
        :key="game.path"
        :to="game.path"
        class="nav-link"
        :class="{ active: $route.path === game.path }"
      >{{ game.label }}</RouterLink>
    </nav>
    <div class="page">
      <RouterView />
    </div>
  </div>
</template>

<script setup>
const games = [
  { path: '/', label: '🐍 Snake' },
  { path: '/sudoku', label: '🔢 Sudoku' },
]
</script>

<style scoped>
@reference "tailwindcss";
.app {
  @apply min-h-screen bg-gray-950 text-gray-100;
}
.nav {
  @apply flex items-center gap-1 px-6 py-3 border-b border-gray-800 bg-gray-900;
}
.nav-brand {
  @apply text-sm font-bold text-gray-400 mr-4 tracking-widest uppercase;
}
.nav-link {
  @apply px-4 py-1.5 rounded text-sm font-medium transition-colors text-gray-400 hover:text-white hover:bg-gray-800;
}
.nav-link.active {
  @apply bg-gray-700 text-white;
}
.page {
  @apply p-6;
}
</style>
