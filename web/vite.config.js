import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: change 'gdg-leaderboard' to your exact GitHub repo name.
// This makes CSS/JS load correctly on GitHub Pages.
export default defineConfig({
  plugins: [react()],
  base: '/gdg-leaderboard/',
})