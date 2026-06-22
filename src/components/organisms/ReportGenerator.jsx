import { useState } from 'react'
import PropTypes from 'prop-types'
import {
  Sparkles, RefreshCw, AlertCircle, FileText,
  CalendarDays, Calendar, ClipboardList, TrendingUp, Clock,
} from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/atoms/Button'
import { Spinner } from '@/components/atoms/Spinner'
import { ReportCard } from '@/components/molecules/ReportCard'
import { PeriodSelector } from '@/components/molecules/PeriodSelector'
import { useJiraWorklogs } from '@/hooks/useJiraWorklogs'
import { useReportGeneration } from '@/hooks/useReportGeneration'

const TABS = [
  { id: 'daily',   label: 'Daily',   icon: CalendarDays, description: 'Day-by-day summary of what was accomplished' },
  { id: 'weekly',  label: 'Weekly',  icon: Calendar,     description: 'Week-by-week progress and milestones' },
  { id: 'monthly', label: 'Monthly', icon: FileText,      description: 'Executive summary for the full month' },
]

export function ReportGenerator({ config }) {
  const now = new Date()
  const [year, setYear]             = useState(now.getFullYear())
  const [month, setMonth]           = useState(now.getMonth())
  const [activeTab, setActiveTab]   = useState('daily')
  const [fetching, setFetching]     = useState(false)
  const [generating, setGenerating] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)

  const { data: worklogs = [], isFetching, error: fetchError, refetch } =
    useJiraWorklogs({ config, year, month, enabled: false })

  const {
    byDate, weeks, workdays,
    dailyDescriptions, weeklyDescriptions, monthlyDescription,
    loading, errors,
    generateDaily, generateWeekly, generateMonthly, generateAll,
  } = useReportGeneration({ worklogs, config, year, month })

  async function handleFetch() {
    setFetching(true)
    await refetch()
    setHasFetched(true)
    setFetching(false)
  }

  async function handleGenerateTab() {
    setGenerating(true)
    if (activeTab === 'daily') await generateDaily()
    else if (activeTab === 'weekly') await generateWeekly()
    else await generateMonthly()
    setGenerating(false)
  }

  async function handleGenerateAll() {
    setGenerating(true)
    await generateAll()
    setGenerating(false)
  }

  const worklogsInPeriod = worklogs.length
  const activeDays       = Object.keys(byDate).length
  const totalHours       = Math.round(worklogs.reduce((s, w) => s + w.timeSpentSeconds, 0) / 3600)
  const activeTabMeta    = TABS.find((t) => t.id === activeTab)

  return (
    <div className="flex flex-col gap-6">

      {/* ── Control card ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Single top row: period picker + actions */}
        <div className="flex items-center gap-5 px-8 py-5">
          {/* Period controls */}
          <div className="flex-1">
            <PeriodSelector
              year={year}
              month={month}
              onChange={(y, m) => { setYear(y); setMonth(m); setHasFetched(false) }}
            />
          </div>

          {/* Vertical divider */}
          <div className="w-px self-stretch bg-slate-200" />

          {/* Action buttons — same height, same baseline */}
          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="secondary"
              size="lg"
              onClick={handleFetch}
              loading={fetching || isFetching}
              disabled={fetching || isFetching}
            >
              <RefreshCw className="w-4 h-4" />
              Fetch Worklogs
            </Button>

            {hasFetched && worklogsInPeriod > 0 && (
              <Button
                variant="primary"
                size="lg"
                onClick={handleGenerateAll}
                loading={generating}
                disabled={generating}
              >
                <Sparkles className="w-4 h-4" />
                Generate All
              </Button>
            )}
          </div>
        </div>

        {/* Stats strip — shown after a successful fetch */}
        {hasFetched && !fetchError && (
          <div className="border-t border-slate-100 grid grid-cols-3 divide-x divide-slate-100">
            {[
              { icon: ClipboardList, bg: 'bg-blue-50',   text: 'text-blue-600',   value: worklogsInPeriod,   label: 'Work Logs' },
              { icon: CalendarDays,  bg: 'bg-emerald-50', text: 'text-emerald-600', value: activeDays,         label: 'Active Days' },
              { icon: Clock,         bg: 'bg-violet-50',  text: 'text-violet-600',  value: `${totalHours}h`,   label: 'Logged Time' },
            ].map(({ icon: Icon, bg, text, value, label }) => (
              <div key={label} className="flex items-center gap-4 px-8 py-5">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${text}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
                  <p className="text-xs text-slate-400 mt-1.5">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Error banner ──────────────────────────────────────────────── */}
      {fetchError && (
        <div className="flex items-start gap-5 bg-red-50 border border-red-200 rounded-2xl px-7 py-6">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-red-800">Failed to fetch Jira worklogs</p>
            <p className="text-sm text-red-500 mt-1.5 break-words">{fetchError.message}</p>
            {fetchError.message.includes('401') && (
              <p className="text-xs text-red-400 mt-3 bg-red-100 rounded-lg px-3 py-2">
                401 Unauthorized — verify <code className="font-mono">VITE_JIRA_EMAIL</code> and{' '}
                <code className="font-mono">VITE_JIRA_TOKEN</code> in your .env, then restart{' '}
                <code className="font-mono">npm run dev</code>.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Tab navigation — always visible ───────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-slate-100">
          {TABS.map(({ id, label, icon: Icon, description }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-4 py-4 px-6 transition-all duration-150 cursor-pointer group ${
                activeTab === id ? 'bg-blue-600' : 'hover:bg-slate-50'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                activeTab === id
                  ? 'bg-white/20'
                  : 'bg-slate-100 group-hover:bg-blue-50'
              }`}>
                <Icon className={`w-5 h-5 ${activeTab === id ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`} />
              </div>
              <div className="text-left min-w-0">
                <p className={`text-sm font-semibold ${activeTab === id ? 'text-white' : 'text-slate-700'}`}>
                  {label}
                </p>
                <p className={`text-xs mt-0.5 truncate ${activeTab === id ? 'text-blue-200' : 'text-slate-400'}`}>
                  {description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading ───────────────────────────────────────────────────── */}
      {(fetching || isFetching) && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-28 gap-5">
          <Spinner size="lg" />
          <div className="text-center">
            <p className="text-slate-700 font-semibold text-base">Fetching worklogs from Jira…</p>
            <p className="text-slate-400 text-sm mt-1.5">This may take a moment for large months</p>
          </div>
        </div>
      )}

      {/* ── Empty / ready state ───────────────────────────────────────── */}
      {!hasFetched && !fetching && !isFetching && !fetchError && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-28 gap-6 text-center px-10">
          <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center">
            <TrendingUp className="w-9 h-9 text-blue-400" />
          </div>
          <div className="max-w-md">
            <p className="text-slate-800 font-bold text-xl">Select a period &amp; fetch worklogs</p>
            <p className="text-slate-400 text-sm mt-3 leading-relaxed">
              Choose a month above and click{' '}
              <strong className="text-slate-600">Fetch Worklogs</strong>.
              Then pick a tab — <strong className="text-slate-600">Daily</strong>,{' '}
              <strong className="text-slate-600">Weekly</strong>, or{' '}
              <strong className="text-slate-600">Monthly</strong> — and generate
              your AI-written report summaries.
            </p>
          </div>
        </div>
      )}

      {/* ── Report content ────────────────────────────────────────────── */}
      {hasFetched && !fetchError && !fetching && !isFetching && (
        <div className="flex flex-col gap-5">

          {/* Section header card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between px-8 py-5">
            <div>
              <p className="text-base font-bold text-slate-800">{activeTabMeta?.label} Reports</p>
              <p className="text-sm text-slate-400 mt-1">
                {activeTabMeta?.description} · {format(new Date(year, month, 1), 'MMMM yyyy')}
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={handleGenerateTab}
              loading={generating}
              disabled={generating || worklogsInPeriod === 0}
            >
              <Sparkles className="w-4 h-4" />
              Generate {activeTabMeta?.label}
            </Button>
          </div>

          {/* Daily — one Gemini call fills all cards */}
          {activeTab === 'daily' && (
            <div className="flex flex-col gap-4">
              {workdays.map((date) => {
                const entries = byDate[date] || []
                return (
                  <ReportCard
                    key={date}
                    title={format(new Date(`${date}T00:00:00`), 'EEEE, MMMM d')}
                    subtitle={date}
                    badge={entries.length > 0
                      ? { label: `${entries.length} log${entries.length === 1 ? '' : 's'}`, variant: 'green' }
                      : { label: 'No logs', variant: 'slate' }}
                    description={dailyDescriptions[date]}
                    worklogs={entries}
                    isLoading={loading.daily && entries.length > 0}
                    error={errors.daily}
                  />
                )
              })}
            </div>
          )}

          {/* Weekly — one Gemini call fills all cards */}
          {activeTab === 'weekly' && (
            <div className="flex flex-col gap-4">
              {weeks.map((week, i) => {
                const wDays   = workdays.filter((d) => d >= week.startDate && d <= week.endDate)
                const entries = wDays.flatMap((d) => byDate[d] || [])
                return (
                  <ReportCard
                    key={week.startDate}
                    title={`Week ${i + 1}`}
                    subtitle={week.label}
                    badge={entries.length > 0
                      ? { label: `${entries.length} logs`, variant: 'blue' }
                      : { label: 'No logs', variant: 'slate' }}
                    description={weeklyDescriptions[week.startDate]}
                    worklogs={entries}
                    isLoading={loading.weekly && entries.length > 0}
                    error={errors.weekly}
                  />
                )
              })}
            </div>
          )}

          {/* Monthly — one Gemini call */}
          {activeTab === 'monthly' && (
            <ReportCard
              title={format(new Date(year, month, 1), 'MMMM yyyy')}
              subtitle="Full month executive summary"
              badge={{ label: `${worklogsInPeriod} total logs`, variant: 'purple' }}
              description={monthlyDescription}
              worklogs={worklogs}
              isLoading={loading.monthly}
              error={errors.monthly}
            />
          )}
        </div>
      )}
    </div>
  )
}

ReportGenerator.propTypes = {
  config: PropTypes.shape({
    jiraBaseUrl: PropTypes.string.isRequired,
    jiraEmail: PropTypes.string.isRequired,
    jiraToken: PropTypes.string.isRequired,
    groqKey: PropTypes.string.isRequired,
  }).isRequired,
}
