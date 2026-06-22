import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { ReportGenerator } from '@/components/organisms/ReportGenerator'
import { useConfig } from '@/hooks/useConfig'

const queryClient = new QueryClient()

function AppLayout() {
  const { config, isConfigured } = useConfig()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm tracking-wide">MCK</span>
          </div>
          <div>
            <p className="text-xs text-slate-400 leading-none">Project Owner</p>
            <p className="text-sm font-semibold text-slate-800 leading-tight">MCK</p>
          </div>
          <div className="w-px h-8 bg-slate-200 mx-2" />
          <div>
            <p className="text-xs text-slate-400 leading-none">Tool</p>
            <p className="text-sm font-semibold text-slate-700 leading-tight">Jira Report Generator</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {isConfigured ? (
          <ReportGenerator config={config} />
        ) : (
          <div className="max-w-lg mx-auto mt-16 bg-amber-50 border border-amber-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-amber-800">Missing environment variables</p>
                <p className="text-sm text-amber-700 mt-1 mb-3">
                  Create a <code className="bg-amber-100 px-1 rounded">.env</code> file in the project root with:
                </p>
                <pre className="bg-amber-100 rounded-lg p-3 text-xs text-amber-900 overflow-x-auto">
{`VITE_JIRA_BASE_URL=https://your-domain.atlassian.net
VITE_JIRA_EMAIL=you@company.com
VITE_JIRA_TOKEN=your-jira-api-token
VITE_OPENAI_KEY=sk-...`}
                </pre>
                <p className="text-xs text-amber-600 mt-3">
                  Then restart: <code className="bg-amber-100 px-1 rounded">npm run dev</code>
                </p>
              </div>
            </div>
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
