import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': '/src' },
    },
    server: {
      proxy: {
        '/api/jira': {
          target: env.JIRA_BASE_URL || 'https://your-domain.atlassian.net',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/jira/, ''),
        },
      },
    },
  }
})
