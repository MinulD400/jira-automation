import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
  eachDayOfInterval,
  isWeekend,
} from 'date-fns'

export function getMonthRange(year, month) {
  const date = new Date(year, month, 1)
  return {
    startDate: format(startOfMonth(date), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(date), 'yyyy-MM-dd'),
  }
}

export function getWeeksInMonth(year, month) {
  const date = new Date(year, month, 1)
  const weeks = eachWeekOfInterval(
    { start: startOfMonth(date), end: endOfMonth(date) },
    { weekStartsOn: 1 },
  )
  return weeks.map((weekStart) => {
    const start = weekStart < startOfMonth(date) ? startOfMonth(date) : weekStart
    const end =
      endOfWeek(weekStart, { weekStartsOn: 1 }) > endOfMonth(date)
        ? endOfMonth(date)
        : endOfWeek(weekStart, { weekStartsOn: 1 })
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      label: `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`,
    }
  })
}

export function getWorkdaysInRange(startDate, endDate) {
  const days = eachDayOfInterval({ start: new Date(startDate), end: new Date(endDate) })
  return days
    .filter((d) => !isWeekend(d))
    .map((d) => format(d, 'yyyy-MM-dd'))
}

export function groupWorklogsByDate(rawWorklogs) {
  const map = {}
  for (const entry of rawWorklogs) {
    const date = entry.started.slice(0, 10)
    if (!map[date]) map[date] = []
    map[date].push(entry)
  }
  return map
}

export function formatMonthLabel(year, month) {
  return format(new Date(year, month, 1), 'MMMM yyyy')
}
