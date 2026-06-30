/**
 * Fetch Jira worklogs and write one AI-generated daily report per active day.
 *
 * Usage:
 *   node scripts/generate-daily-reports.mjs --sample          # first day only
 *   node scripts/generate-daily-reports.mjs --year 2026 --month 6
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { generateDailyReports } from '../src/lib/http/groqClient.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUTPUT_DIR = join(ROOT, 'reports', 'daily')

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

function groupByDate(worklogs) {
  const map = {}
  for (const entry of worklogs) {
    const date = entry.started.slice(0, 10)
    if (!map[date]) map[date] = []
    map[date].push(entry)
  }
  return map
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return m === 0 ? `${h}h` : `${h}h ${m}m`
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
  return { entries, monthLabel: format(new Date(year, month1Based - 1, 1), 'MMMM yyyy') }
}

function buildMarkdown(date, entries, report) {
  const totalSeconds = entries.reduce((s, e) => s + e.timeSpentSeconds, 0)
  const lines = [
    `# Daily Report — ${date}`,
    '',
    `**Total time logged:** ${formatDuration(totalSeconds)}`,
    '',
    '## Time logs',
    '',
    ...entries.flatMap((e) => [
      `### ${e.issueKey} — ${e.issueSummary}`,
      `- **Duration:** ${formatDuration(e.timeSpentSeconds)}`,
      e.comment ? `- **Comment:** ${e.comment}` : '- **Comment:** _(none)_',
      '',
    ]),
    '## Summary',
    '',
    report,
    '',
  ]
  return lines.join('\n')
}

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = { sample: false, year: 2026, month: 6 }
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--sample') opts.sample = true
    if (args[i] === '--year') opts.year = Number(args[++i])
    if (args[i] === '--month') opts.month = Number(args[++i])
  }
  return opts
}

async function main() {
  const { sample, year, month } = parseArgs()
  const env = loadEnv()

  console.log(`Fetching worklogs for ${format(new Date(year, month - 1, 1), 'MMMM yyyy')}...`)
  const { entries, monthLabel } = await fetchWorklogs(env, year, month)
  const byDate = groupByDate(entries)
  const activeDates = Object.keys(byDate).sort()

  if (!activeDates.length) {
    console.log('No worklogs found for this period.')
    return
  }

  const targetDates = sample ? activeDates.slice(0, 1) : activeDates

  console.log(
    sample
      ? `Generating sample report for ${targetDates[0]} (${entries.length} total logs in month)...`
      : `Generating ${targetDates.length} daily reports...`,
  )

  mkdirSync(OUTPUT_DIR, { recursive: true })

  for (const date of targetDates) {
    process.stdout.write(`  ${date}... `)
    const result = await generateDailyReports(
      env.VITE_GROQ_KEY,
      { [date]: byDate[date] },
      monthLabel,
    )
    const report = result[date] ?? Object.values(result)[0] ?? '_No report generated._'
    const filePath = join(OUTPUT_DIR, `${date}.md`)
    writeFileSync(filePath, buildMarkdown(date, byDate[date], report), 'utf8')
    console.log('done')
    if (targetDates.length > 1) await new Promise((r) => setTimeout(r, 1500))
  }

  console.log(`\nDone. ${targetDates.length} report(s) saved to: ${OUTPUT_DIR}`)
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
