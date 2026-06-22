import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { formatMonthLabel } from '@/lib/dateHelpers'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

export function PeriodSelector({ year, month, onChange }) {
  function prev() {
    if (month === 0) onChange(year - 1, 11)
    else onChange(year, month - 1)
  }

  function next() {
    if (month === 11) onChange(year + 1, 0)
    else onChange(year, month + 1)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <Calendar className="w-5 h-5 text-slate-500" />
        <h2 className="text-base font-semibold text-slate-800">Report Period</h2>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={prev}>
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex-1 flex gap-2">
          <select
            value={month}
            onChange={(e) => onChange(year, Number(e.target.value))}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => onChange(Number(e.target.value), month)}
            className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <Button variant="secondary" size="sm" onClick={next}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <p className="mt-3 text-sm text-slate-500 text-center">
        {formatMonthLabel(year, month)}
      </p>
    </div>
  )
}
