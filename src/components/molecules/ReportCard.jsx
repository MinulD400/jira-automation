import { Clock, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/atoms/Badge'
import { Spinner } from '@/components/atoms/Spinner'

function secondsToHours(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function ReportCard({ title, subtitle, badge, description, worklogs = [], isLoading, error }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const totalSeconds = worklogs.reduce((sum, w) => sum + (w.timeSpentSeconds || 0), 0)

  function copy() {
    if (!description) return
    navigator.clipboard.writeText(description)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
            {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
          </div>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {totalSeconds > 0 && (
          <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
            <Clock className="w-3.5 h-3.5" />
            {secondsToHours(totalSeconds)}
          </div>
        )}
      </div>

      <div className="px-5 py-4">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Spinner size="sm" />
            Generating description...
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        {!isLoading && !error && description && (
          <div className="group relative">
            <p className="text-sm text-slate-700 leading-relaxed pr-8">{description}</p>
            <button
              onClick={copy}
              className="absolute top-0 right-0 p-1 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}

        {!isLoading && !error && !description && worklogs.length === 0 && (
          <p className="text-sm text-slate-400 italic">No work logged for this period.</p>
        )}
      </div>

      {worklogs.length > 0 && (
        <div className="border-t border-slate-100">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-2.5 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <span>{worklogs.length} work log{worklogs.length !== 1 ? 's' : ''}</span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {expanded && (
            <div className="px-5 pb-4 flex flex-col gap-2">
              {worklogs.map((w) => (
                <div key={w.id} className="flex gap-3 text-xs text-slate-600 bg-slate-50 rounded-lg p-3">
                  <span className="font-mono font-medium text-blue-600 shrink-0">{w.issueKey}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-700 truncate">{w.issueSummary}</p>
                    {w.comment && <p className="text-slate-500 mt-0.5">{w.comment}</p>}
                  </div>
                  <span className="text-slate-400 shrink-0">{secondsToHours(w.timeSpentSeconds)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
