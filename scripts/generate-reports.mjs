/**
 * Fetch Jira worklogs and write daily, weekly, and monthly markdown reports.
 *
 * Usage:
 *   node scripts/generate-reports.mjs                    # all types, June 2026
 *   node scripts/generate-reports.mjs --type daily
 *   node scripts/generate-reports.mjs --year 2026 --month 6 --type all
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import {
  generateDailyReports,
  generateWeeklyReports,
  generateMonthlyReport,
} from '../src/lib/http/groqClient.js'
import {
  getWeeksInMonth,
  getWorkdaysInRange,
  groupWorklogsByDate,
} from '../src/lib/dateHelpers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DAILY_DIR = join(ROOT, 'reports', 'daily')
const WEEKLY_DIR = join(ROOT, 'reports', 'weekly')
const MONTHLY_DIR = join(ROOT, 'reports', 'monthly')
const PAUSE_MS = 1500

function loadEnv() {
  const env = {}
  for (const line of readFileSync(join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf('=')
    env[line.slice(0, i).trim()] = line.slice(i + 1)
  }
  return env
}

function authHeader(email, token) {
  return 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64')
}

async function jiraGet(baseUrl, path, email, token) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
    headers: { Authorization: authHeader(email, token), Accept: 'application/json' },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Jira ${res.status}: ${text}`)
  }
  return res.json()
}

function extractComment(comment) {
  if (!comment) return ''
  if (typeof comment === 'string') return comment
  if (comment?.content) {
    return comment.content
      .flatMap((block) => block.content || [])
      .filter((node) => node.type === 'text')
      .map((node) => node.text)
      .join(' ')
      .trim()
  }
  return ''
}

function getMonthRange(year, month1Based) {
  const date = new Date(year, month1Based - 1, 1)
  return {
    startDate: format(startOfMonth(date), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(date), 'yyyy-MM-dd'),
  }
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function formatLogSection(entries) {
  return entries.flatMap((e) => [
    `### ${e.issueKey} — ${e.issueSummary}`,
    `- **Duration:** ${formatDuration(e.timeSpentSeconds)}`,
    e.comment ? `- **Comment:** ${e.comment}` : '- **Comment:** _(none)_',
    '',
  ])
}

async function fetchWorklogs(env, year, month1Based) {
  const { VITE_JIRA_BASE_URL: base, VITE_JIRA_EMAIL: email, VITE_JIRA_TOKEN: token } = env
  const { startDate, endDate } = getMonthRange(year, month1Based)

  const user = await jiraGet(base, '/rest/api/3/myself', email, token)
  const jql = `worklogDate >= "${startDate}" AND worklogDate <= "${endDate}" AND worklogAuthor = currentUser() ORDER BY updated DESC`
  const params = new URLSearchParams({
    jql,
    startAt: '0',
    maxResults: '50',
    fields: 'summary,status,issuetype,project',
  })
  const search = await jiraGet(base, `/rest/api/3/search/jql?${params}`, email, token)
  const issues = search.issues ?? []

  const entries = []
  await Promise.all(
    issues.map(async (issue) => {
      const data = await jiraGet(base, `/rest/api/3/issue/${issue.key}/worklog`, email, token)
      for (const log of data.worklogs) {
        const date = log.started.slice(0, 10)
        const byMe = log.author.accountId === user.accountId
        if (date >= startDate && date <= endDate && byMe) {
          entries.push({
            id: log.id,
            issueKey: issue.key,
            issueSummary: issue.fields.summary,
            started: log.started,
            timeSpentSeconds: log.timeSpentSeconds,
            comment: extractComment(log.comment),
          })
        }
      }
    }),
  )

  entries.sort((a, b) => a.started.localeCompare(b.started))
  return {
    entries,
    monthLabel: format(new Date(year, month1Based - 1, 1), 'MMMM yyyy'),
    monthKey: format(new Date(year, month1Based - 1, 1), 'yyyy-MM'),
  }
}

function buildDailyMarkdown(date, entries, report) {
  const totalSeconds = entries.reduce((s, e) => s + e.timeSpentSeconds, 0)
  return [
    `# Daily Report — ${date}`,
    '',
    `**Total time logged:** ${formatDuration(totalSeconds)}`,
    '',
    '## Time logs',
    '',
    ...formatLogSection(entries),
    '## Summary',
    '',
    report,
    '',
  ].join('\n')
}

function buildWeeklyMarkdown(week, entries, report) {
  const totalSeconds = entries.reduce((s, e) => s + e.timeSpentSeconds, 0)
  return [
    `# Weekly Report — ${week.label}`,
    '',
    `**Total time logged:** ${formatDuration(totalSeconds)}`,
    '',
    '## Time logs',
    '',
    ...formatLogSection(entries),
    '## Summary',
    '',
    report,
    '',
  ].join('\n')
}

function buildMonthlyMarkdown(monthLabel, monthKey, entries, report) {
  const byDate = groupWorklogsByDate(entries)
  const activeDays = Object.keys(byDate).length
  const totalSeconds = entries.reduce((s, e) => s + e.timeSpentSeconds, 0)
  const lines = [
    `# Monthly Report — ${monthLabel}`,
    '',
    `**Total time logged:** ${formatDuration(totalSeconds)}`,
    `**Active days:** ${activeDays}`,
    `**Work logs:** ${entries.length}`,
    '',
    '## Time logs',
    '',
  ]

  for (const date of Object.keys(byDate).sort()) {
    lines.push(`### ${date}`, '')
    lines.push(...formatLogSection(byDate[date]))
  }

  lines.push('## Summary', '', report, '')
  return lines.join('\n')
}

function getWeeksWithEntries(entries, year, month1Based) {
  const byDate = groupWorklogsByDate(entries)
  const weeks = getWeeksInMonth(year, month1Based - 1)

  return weeks
    .map((week) => {
      const days = getWorkdaysInRange(week.startDate, week.endDate)
      const weekEntries = days.flatMap((d) => byDate[d] || [])
      return { ...week, entries: weekEntries }
    })
    .filter((w) => w.entries.length > 0)
}

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = { year: 2026, month: 6, type: 'all', sample: false }
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--sample') opts.sample = true
    if (args[i] === '--year') opts.year = Number(args[++i])
    if (args[i] === '--month') opts.month = Number(args[++i])
    if (args[i] === '--type') opts.type = args[++i]
  }
  return opts
}

function wants(type, target) {
  return type === 'all' || type === target
}

async function pause() {
  await new Promise((r) => setTimeout(r, PAUSE_MS))
}

async function generateDaily(env, byDate, activeDates, monthLabel) {
  const targetDates = activeDates
  mkdirSync(DAILY_DIR, { recursive: true })
  console.log(`\nDaily: generating ${targetDates.length} report(s)...`)

  for (const date of targetDates) {
    process.stdout.write(`  ${date}... `)
    const result = await generateDailyReports(env.VITE_GROQ_KEY, { [date]: byDate[date] }, monthLabel)
    const report = result[date] ?? Object.values(result)[0] ?? '_No report generated._'
    writeFileSync(join(DAILY_DIR, `${date}.md`), buildDailyMarkdown(date, byDate[date], report), 'utf8')
    console.log('done')
    if (targetDates.length > 1) await pause()
  }

  console.log(`Daily reports saved to: ${DAILY_DIR}`)
}

async function generateWeekly(env, weeks, monthLabel) {
  mkdirSync(WEEKLY_DIR, { recursive: true })
  console.log(`\nWeekly: generating ${weeks.length} report(s)...`)

  for (const week of weeks) {
    process.stdout.write(`  ${week.startDate} (${week.label})... `)
    const result = await generateWeeklyReports(
      env.VITE_GROQ_KEY,
      [{ label: week.label, startDate: week.startDate, entries: week.entries }],
      monthLabel,
    )
    const report = result[week.startDate] ?? Object.values(result)[0] ?? '_No report generated._'
    writeFileSync(
      join(WEEKLY_DIR, `${week.startDate}.md`),
      buildWeeklyMarkdown(week, week.entries, report),
      'utf8',
    )
    console.log('done')
    if (weeks.length > 1) await pause()
  }

  console.log(`Weekly reports saved to: ${WEEKLY_DIR}`)
}

async function generateMonthly(env, entries, monthLabel, monthKey) {
  mkdirSync(MONTHLY_DIR, { recursive: true })
  console.log(`\nMonthly: generating report for ${monthLabel}...`)

  process.stdout.write(`  ${monthKey}... `)
  const report = await generateMonthlyReport(env.VITE_GROQ_KEY, entries, monthLabel)
  writeFileSync(
    join(MONTHLY_DIR, `${monthKey}.md`),
    buildMonthlyMarkdown(monthLabel, monthKey, entries, report),
    'utf8',
  )
  console.log('done')
  console.log(`Monthly report saved to: ${MONTHLY_DIR}`)
}

async function main() {
  const { year, month, type, sample } = parseArgs()
  const env = loadEnv()

  console.log(`Fetching worklogs for ${format(new Date(year, month - 1, 1), 'MMMM yyyy')}...`)
  const { entries, monthLabel, monthKey } = await fetchWorklogs(env, year, month)

  if (!entries.length) {
    console.log('No worklogs found for this period.')
    return
  }

  const byDate = groupWorklogsByDate(entries)
  const activeDates = Object.keys(byDate).sort()
  const weeks = getWeeksWithEntries(entries, year, month)

  if (wants(type, 'daily')) {
    await generateDaily(env, byDate, sample ? activeDates.slice(0, 1) : activeDates, monthLabel)
  }

  if (wants(type, 'weekly')) {
    await generateWeekly(env, sample ? weeks.slice(0, 1) : weeks, monthLabel)
  }

  if (wants(type, 'monthly')) {
    await generateMonthly(env, entries, monthLabel, monthKey)
  }

  console.log('\nAll requested reports complete.')
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
