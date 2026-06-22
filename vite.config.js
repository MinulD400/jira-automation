import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const jiraTarget = (env.VITE_JIRA_BASE_URL || 'https://your-domain.atlassian.net').replace(/\/$/, '')

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': '/src' },
    },
    server: {
      proxy: {
        '/api/jira': {
          target: jiraTarget,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/jira/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              // Ensure auth is forwarded
              if (req.headers.authorization) {
                proxyReq.setHeader('Authorization', req.headers.authorization)
              }
              // Strip cross-origin headers so Jira does not reject the request
              proxyReq.removeHeader('origin')
              proxyReq.removeHeader('referer')
            })
          },
        },
      },
    },
  }
})
