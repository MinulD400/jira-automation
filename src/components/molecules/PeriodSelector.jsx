import PropTypes from 'prop-types'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMonthLabel } from '@/lib/dateHelpers'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

export function PeriodSelector({ year, month, onChange }) {
  function previous() {
    if (month === 0) onChange(year - 1, 11)
    else onChange(year, month - 1)
  }
  function next() {
    if (month === 11) onChange(year + 1, 0)
    else onChange(year, month + 1)
  }

  return (
    <div className="flex items-center gap-3">
      {/* Prev */}
      <button
        onClick={previous}
        className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm flex items-center justify-center transition-all cursor-pointer shrink-0"
      >
        <ChevronLeft className="w-4 h-4 text-slate-500" />
      </button>

      {/* Big month label */}
      <h2 className="text-2xl font-bold text-slate-800 tracking-tight whitespace-nowrap min-w-36">
        {formatMonthLabel(year, month)}
      </h2>

      {/* Next */}
      <button
        onClick={next}
        className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm flex items-center justify-center transition-all cursor-pointer shrink-0"
      >
        <ChevronRight className="w-4 h-4 text-slate-500" />
      </button>

      {/* Divider */}
      <div className="w-px h-8 bg-slate-200 mx-1" />

      {/* Dropdowns */}
      <select
        value={month}
        onChange={(e) => onChange(year, Number(e.target.value))}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        {MONTHS.map((m, i) => (
          <option key={m} value={i}>{m}</option>
        ))}
      </select>

      <select
        value={year}
        onChange={(e) => onChange(Number(e.target.value), month)}
        className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        {YEARS.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  )
}

PeriodSelector.propTypes = {
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
}
