/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' : GitHub Pages / Cloudflare Pages / 사내 폴더 어디에 올려도 동작
export default defineConfig({
  base: './',
  plugins: [react()],
  test: { include: ['src/**/*.test.ts', 'tests/**/*.test.ts'] },
})