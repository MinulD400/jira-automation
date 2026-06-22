// Groq uses the OpenAI-compatible API — llama-3.3-70b-versatile is free with 14,400 req/day
const BASE  = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

const PROMPTS = {
  daily: (label, sections) => `You are writing professional daily work reports for ${label}.
I will give you Jira work logs grouped by date.
Return ONLY a valid JSON object with no extra text, where:
  - each key is a date (e.g. "2026-06-01")
  - each value is a 2-3 sentence professional paragraph in past tense, first person, summarising that day

Work logs:
${sections}

Respond with ONLY the JSON object.`,

  weekly: (label, sections) => `You are writing professional weekly work reports for ${label}.
I will give you Jira work logs grouped by week.
Return ONLY a valid JSON object with no extra text, where:
  - each key is the week-start date (e.g. "2026-06-01")
  - each value is a 3-4 sentence professional paragraph in past tense, first person, summarising that week's progress and milestones

Work logs:
${sections}

Respond with ONLY the JSON object.`,

  monthly: (label, lines) => `You are writing a professional monthly work summary for ${label}.
Write a single executive-level paragraph (4-5 sentences, past tense, first person) summarising the month's achievements, main areas of work, and overall progress.

Work logs:
${lines}

Respond with ONLY the paragraph text.`,
}

function parseJsonFromResponse(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  return JSON.parse(cleaned)
}

async function callGroq(apiKey, prompt) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
      max_tokens: 4096,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    if (res.status === 401) throw new Error('Invalid Groq API key — check VITE_GROQ_KEY in your .env')
    if (res.status === 429) throw new Error('Groq rate limit reached — wait a moment and try again')
    throw new Error(err.error?.message || `Groq error ${res.status}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() ?? ''
}

export async function generateDailyReports(apiKey, byDate, monthLabel) {
  const sections = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, entries]) => {
      const lines = entries
        .map((e) => `  - [${e.issueKey}] ${e.issueSummary}: ${e.comment || '(no comment)'}`)
        .join('\n')
      return `${date}:\n${lines}`
    })
    .join('\n\n')

  const text = await callGroq(apiKey, PROMPTS.daily(monthLabel, sections))
  return parseJsonFromResponse(text)
}

export async function generateWeeklyReports(apiKey, byWeek, monthLabel) {
  const sections = byWeek
    .map(({ label, startDate, entries }) => {
      const lines = entries
        .map((e) => `  - [${e.issueKey}] ${e.issueSummary}: ${e.comment || '(no comment)'}`)
        .join('\n')
      return `Week starting ${startDate} (${label}):\n${lines}`
    })
    .join('\n\n')

  const text = await callGroq(apiKey, PROMPTS.weekly(monthLabel, sections))
  return parseJsonFromResponse(text)
}

export async function generateMonthlyReport(apiKey, worklogs, monthLabel) {
  const lines = worklogs
    .map((e) => `- [${e.issueKey}] ${e.issueSummary}: ${e.comment || '(no comment)'}`)
    .join('\n')

  return callGroq(apiKey, PROMPTS.monthly(monthLabel, lines))
}
