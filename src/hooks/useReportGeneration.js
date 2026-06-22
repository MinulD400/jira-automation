import { useState, useCallback, useMemo } from 'react'
import { generateDailyReports, generateWeeklyReports, generateMonthlyReport } from '@/lib/http/geminiClient'
import { getWeeksInMonth, getMonthRange, groupWorklogsByDate, getWorkdaysInRange } from '@/lib/dateHelpers'
import { format } from 'date-fns'

export function useReportGeneration({ worklogs = [], config, year, month }) {
  const [dailyDescriptions,   setDailyDescriptions]   = useState({})
  const [weeklyDescriptions,  setWeeklyDescriptions]  = useState({})
  const [monthlyDescription,  setMonthlyDescription]  = useState(null)
  const [loading, setLoading] = useState({})
  const [errors,  setErrors]  = useState({})

  const byDate   = useMemo(() => groupWorklogsByDate(worklogs), [worklogs])
  const weeks    = useMemo(() => getWeeksInMonth(year, month), [year, month])
  const { startDate, endDate } = useMemo(() => getMonthRange(year, month), [year, month])
  const workdays = useMemo(() => getWorkdaysInRange(startDate, endDate), [startDate, endDate])

  const monthLabel = format(new Date(year, month, 1), 'MMMM yyyy')

  // Build the weekly structure expected by generateWeeklyReports
  const byWeek = useMemo(() =>
    weeks.map((week) => {
      const wDays   = getWorkdaysInRange(week.startDate, week.endDate)
      const entries = wDays.flatMap((d) => byDate[d] || [])
      return { startDate: week.startDate, label: week.label, entries }
    }).filter((w) => w.entries.length > 0),
  [weeks, byDate])

  // ── Daily — one call, Gemini splits by date in JSON ──────────────────────
  const generateDaily = useCallback(async () => {
    const activeDays = Object.fromEntries(
      Object.entries(byDate).filter(([, entries]) => entries.length > 0),
    )
    if (!Object.keys(activeDays).length) return

    setLoading((p) => ({ ...p, daily: true }))
    setErrors((p)  => ({ ...p, daily: null }))
    try {
      const result = await generateDailyReports(config.geminiKey, activeDays, monthLabel)
      setDailyDescriptions(result)
    } catch (e) {
      setErrors((p) => ({ ...p, daily: e.message }))
    } finally {
      setLoading((p) => ({ ...p, daily: false }))
    }
  }, [byDate, config.geminiKey, monthLabel])

  // ── Weekly — one call, Gemini splits by week in JSON ─────────────────────
  const generateWeekly = useCallback(async () => {
    if (!byWeek.length) return

    setLoading((p) => ({ ...p, weekly: true }))
    setErrors((p)  => ({ ...p, weekly: null }))
    try {
      const result = await generateWeeklyReports(config.geminiKey, byWeek, monthLabel)
      setWeeklyDescriptions(result)
    } catch (e) {
      setErrors((p) => ({ ...p, weekly: e.message }))
    } finally {
      setLoading((p) => ({ ...p, weekly: false }))
    }
  }, [byWeek, config.geminiKey, monthLabel])

  // ── Monthly — one call, single paragraph ─────────────────────────────────
  const generateMonthly = useCallback(async () => {
    if (!worklogs.length) return

    setLoading((p) => ({ ...p, monthly: true }))
    setErrors((p)  => ({ ...p, monthly: null }))
    try {
      const result = await generateMonthlyReport(config.geminiKey, worklogs, monthLabel)
      setMonthlyDescription(result)
    } catch (e) {
      setErrors((p) => ({ ...p, monthly: e.message }))
    } finally {
      setLoading((p) => ({ ...p, monthly: false }))
    }
  }, [worklogs, config.geminiKey, monthLabel])

  const generateAll = useCallback(async () => {
    await Promise.all([generateDaily(), generateWeekly(), generateMonthly()])
  }, [generateDaily, generateWeekly, generateMonthly])

  return {
    byDate, weeks, workdays, byWeek,
    dailyDescriptions, weeklyDescriptions, monthlyDescription,
    loading, errors,
    generateDaily, generateWeekly, generateMonthly, generateAll,
  }
}
