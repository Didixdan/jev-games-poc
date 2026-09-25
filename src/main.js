import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import SnakeGame from './views/SnakeGame.vue'
import SudokuGame from './views/SudokuGame.vue'
import './style.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: SnakeGame },
    { path: '/sudoku', component: SudokuGame },
  ],
})

createApp(App).use(router).mount('#app')
