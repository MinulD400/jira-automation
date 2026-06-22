import { useState } from 'react'
import PropTypes from 'prop-types'
import { Sparkles, RefreshCw, AlertCircle, FileText, CalendarDays, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/atoms/Button'
import { Spinner } from '@/components/atoms/Spinner'
import { Badge } from '@/components/atoms/Badge'
import { ReportCard } from '@/components/molecules/ReportCard'
import { PeriodSelector } from '@/components/molecules/PeriodSelector'
import { useJiraWorklogs } from '@/hooks/useJiraWorklogs'
import { useReportGeneration } from '@/hooks/useReportGeneration'

const TABS = [
  { id: 'daily', label: 'Daily', icon: CalendarDays },
  { id: 'weekly', label: 'Weekly', icon: Calendar },
  { id: 'monthly', label: 'Monthly', icon: FileText },
]

export function ReportGenerator({ config }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [activeTab, setActiveTab] = useState('daily')
  const [fetching, setFetching] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)

  const {
    data: worklogs = [],
    isFetching,
    error: fetchError,
    refetch,
  } = useJiraWorklogs({ config, year, month, enabled: false })

  const {
    byDate,
    weeks,
    workdays,
    dailyDescriptions,
    weeklyDescriptions,
    monthlyDescription,
    loading,
    errors,
    generateDaily,
    generateWeekly,
    generateMonthly,
    generateAll,
  } = useReportGeneration({ worklogs, config, year, month })

  async function handleFetch() {
    setFetching(true)
    await refetch()
    setHasFetched(true)
    setFetching(false)
  }

  async function handleGenerate() {
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

  return (
    <div className="flex flex-col gap-6">
      {/* Controls row */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <PeriodSelector
            year={year}
            month={month}
            onChange={(y, m) => {
              setYear(y)
              setMonth(m)
              setHasFetched(false)
            }}
          />
        </div>

        <div className="flex flex-col gap-3 justify-end">
          <Button
            variant="secondary"
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
              onClick={handleGenerateAll}
              loading={generating}
              disabled={generating}
            >
              <Sparkles className="w-4 h-4" />
              Generate All Reports
            </Button>
          )}
        </div>
      </div>

      {/* Fetch error */}
      {fetchError && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Failed to fetch Jira worklogs</p>
            <p className="text-red-500 mt-0.5">{fetchError.message}</p>
          </div>
        </div>
      )}

      {/* Stats bar */}
      {hasFetched && !fetchError && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-3 flex items-center gap-4 text-sm">
          <span className="text-slate-500">Fetched</span>
          <Badge variant="blue">{worklogsInPeriod} work logs</Badge>
          <Badge variant="slate">{Object.keys(byDate).length} active days</Badge>
          <span className="text-slate-400 ml-auto text-xs">
            {format(new Date(year, month, 1), 'MMMM yyyy')}
          </span>
        </div>
      )}

      {/* Tabs */}
      {hasFetched && !fetchError && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm self-start">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGenerate}
              loading={generating}
              disabled={generating || worklogsInPeriod === 0}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Reports
            </Button>
          </div>

          {activeTab === 'daily' && (
            <div className="flex flex-col gap-3">
              {workdays.map((date) => {
                const entries = byDate[date] || []
                const key = `day-${date}`
                const dayLabel = format(new Date(date + 'T00:00:00'), 'EEEE, MMM d')
                return (
                  <ReportCard
                    key={date}
                    title={dayLabel}
                    badge={entries.length > 0 ? { label: 'Worked', variant: 'green' } : { label: 'No logs', variant: 'slate' }}
                    description={dailyDescriptions[date]}
                    worklogs={entries}
                    isLoading={loading[key]}
                    error={errors[key]}
                  />
                )
              })}
            </div>
          )}

          {activeTab === 'weekly' && (
            <div className="flex flex-col gap-3">
              {weeks.map((week, i) => {
                const wDays = workdays.filter((d) => d >= week.startDate && d <= week.endDate)
                const entries = wDays.flatMap((d) => byDate[d] || [])
                const key = `week-${week.startDate}`
                return (
                  <ReportCard
                    key={week.startDate}
                    title={`Week ${i + 1}`}
                    subtitle={week.label}
                    badge={entries.length > 0 ? { label: `${entries.length} logs`, variant: 'blue' } : { label: 'No logs', variant: 'slate' }}
                    description={weeklyDescriptions[week.startDate]}
                    worklogs={entries}
                    isLoading={loading[key]}
                    error={errors[key]}
                  />
                )
              })}
            </div>
          )}

          {activeTab === 'monthly' && (
            <ReportCard
              title={format(new Date(year, month, 1), 'MMMM yyyy')}
              subtitle="Full month summary"
              badge={{ label: `${worklogsInPeriod} total logs`, variant: 'purple' }}
              description={monthlyDescription}
              worklogs={worklogs}
              isLoading={loading['monthly']}
              error={errors['monthly']}
            />
          )}
        </div>
      )}

      {!hasFetched && !isFetching && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-slate-700 font-medium">Ready to generate reports</p>
          <p className="text-slate-400 text-sm mt-1">
            Select a month, fetch your Jira worklogs, then generate AI-powered reports.
          </p>
        </div>
      )}

      {(fetching || isFetching) && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-slate-500">Fetching worklogs from Jira...</p>
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
    openaiKey: PropTypes.string.isRequired,
  }).isRequired,
}
