import { useState, useCallback, useMemo } from 'react'
import { generateReportDescription } from '@/lib/http/openaiClient'
import { getWeeksInMonth, getMonthRange, groupWorklogsByDate, getWorkdaysInRange } from '@/lib/dateHelpers'
import { format } from 'date-fns'

export function useReportGeneration({ worklogs = [], config, year, month }) {
  const [dailyDescriptions, setDailyDescriptions] = useState({})
  const [weeklyDescriptions, setWeeklyDescriptions] = useState({})
  const [monthlyDescription, setMonthlyDescription] = useState(null)
  const [loading, setLoading] = useState({})
  const [errors, setErrors] = useState({})

  const byDate = useMemo(() => groupWorklogsByDate(worklogs), [worklogs])
  const weeks = useMemo(() => getWeeksInMonth(year, month), [year, month])
  const { startDate, endDate } = useMemo(() => getMonthRange(year, month), [year, month])
  const workdays = useMemo(() => getWorkdaysInRange(startDate, endDate), [startDate, endDate])

  const setLoadingKey = (key, val) => setLoading((prev) => ({ ...prev, [key]: val }))
  const setErrorKey = (key, val) => setErrors((prev) => ({ ...prev, [key]: val }))

  const generateDaily = useCallback(async () => {
    for (const date of workdays) {
      const entries = byDate[date] || []
      if (entries.length === 0) continue
      const key = `day-${date}`
      setLoadingKey(key, true)
      setErrorKey(key, null)
      try {
        const label = format(new Date(date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')
        const desc = await generateReportDescription(config.openaiKey, entries, label)
        setDailyDescriptions((prev) => ({ ...prev, [date]: desc }))
      } catch (e) {
        setErrorKey(key, e.message)
      } finally {
        setLoadingKey(key, false)
      }
    }
  }, [workdays, byDate, config.openaiKey])

  const generateWeekly = useCallback(async () => {
    for (const week of weeks) {
      const wDays = getWorkdaysInRange(week.startDate, week.endDate)
      const entries = wDays.flatMap((d) => byDate[d] || [])
      if (entries.length === 0) continue
      const key = `week-${week.startDate}`
      setLoadingKey(key, true)
      setErrorKey(key, null)
      try {
        const desc = await generateReportDescription(config.openaiKey, entries, `week of ${week.label}`)
        setWeeklyDescriptions((prev) => ({ ...prev, [week.startDate]: desc }))
      } catch (e) {
        setErrorKey(key, e.message)
      } finally {
        setLoadingKey(key, false)
      }
    }
  }, [weeks, byDate, config.openaiKey])

  const generateMonthly = useCallback(async () => {
    if (worklogs.length === 0) return
    const key = 'monthly'
    setLoadingKey(key, true)
    setErrorKey(key, null)
    try {
      const label = format(new Date(year, month, 1), 'MMMM yyyy')
      const desc = await generateReportDescription(config.openaiKey, worklogs, label)
      setMonthlyDescription(desc)
    } catch (e) {
      setErrorKey(key, e.message)
    } finally {
      setLoadingKey(key, false)
    }
  }, [worklogs, config.openaiKey, year, month])

  const generateAll = useCallback(async () => {
    await Promise.all([generateDaily(), generateWeekly(), generateMonthly()])
  }, [generateDaily, generateWeekly, generateMonthly])

  return {
    byDate, weeks, workdays,
    dailyDescriptions, weeklyDescriptions, monthlyDescription,
    loading, errors,
    generateDaily, generateWeekly, generateMonthly, generateAll,
  }
}
