import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const apiBase = env.VITE_API_BASE || 'http://localhost:21380'

  return {
    plugins: [vue()],
    server: {
      proxy: {
        '/api': apiBase,
        '/clash': apiBase,
        '/singbox': apiBase,
        '/base64': apiBase,
      },
    },
  }
})
