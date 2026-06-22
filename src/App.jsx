import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { ReportGenerator } from '@/components/organisms/ReportGenerator'
import { useConfig } from '@/hooks/useConfig'

const queryClient = new QueryClient()

function AppLayout() {
  const { config, isConfigured } = useConfig()

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-gradient-to-r from-blue-800 to-blue-600 shadow-xl">
        <div className="w-full px-10 py-5 flex items-center gap-6">
          <div className="w-11 h-11 rounded-2xl bg-white/20 ring-1 ring-white/30 flex items-center justify-center shrink-0">
            <span className="text-white font-extrabold text-sm tracking-widest">MCK</span>
          </div>

          <div className="flex flex-col">
            <p className="text-blue-200 text-[10px] font-semibold uppercase tracking-[0.2em] leading-none">
              Project Owner · MCK
            </p>
            <h1 className="text-white text-lg font-bold tracking-tight mt-1">
              Jira Report Generator
            </h1>
          </div>

          <div className="ml-auto flex items-center gap-2.5 text-blue-200 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span>AI-powered · Daily · Weekly · Monthly</span>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 w-full px-10 py-8">
        {isConfigured ? (
          <ReportGenerator config={config} />
        ) : (
          <div className="max-w-lg mx-auto mt-20 bg-white border border-amber-200 rounded-2xl shadow-sm p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Missing environment variables</p>
                <p className="text-xs text-slate-500 mt-0.5">Configure your .env file to get started</p>
              </div>
            </div>
            <pre className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 overflow-x-auto leading-relaxed">
{`VITE_JIRA_BASE_URL=https://your-domain.atlassian.net
VITE_JIRA_EMAIL=you@company.com
VITE_JIRA_TOKEN=your-jira-api-token
VITE_GEMINI_KEY=your-google-gemini-api-key`}
            </pre>
            <p className="text-xs text-slate-400 mt-4 text-center">
              Then restart:{' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">npm run dev</code>
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout />
    </QueryClientProvider>
  )
}
