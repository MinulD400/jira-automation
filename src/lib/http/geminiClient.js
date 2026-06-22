const MODEL = 'gemini-1.5-flash-latest'
const BASE  = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

function parseJsonFromResponse(text) {
  // Strip code fences the model sometimes wraps around JSON
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  return JSON.parse(cleaned)
}

async function callGemini(apiKey, prompt) {
  const res = await fetch(`${BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.6, maxOutputTokens: 4096 },
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    const status = err.error?.status
    if (res.status === 429 || status === 'RESOURCE_EXHAUSTED') {
      const retry = err.error?.details
        ?.find((d) => d['@type']?.endsWith('RetryInfo'))
        ?.retryDelay?.replace('s', '')
      const secs = retry ? Math.ceil(Number(retry)) : 60
      throw new Error(`Gemini rate limit — please wait ${secs}s and try again`)
    }
    if (res.status === 403 || status === 'PERMISSION_DENIED') {
      throw new Error('Gemini key has no permission — verify it at aistudio.google.com')
    }
    throw new Error(err.error?.message || `Gemini error ${res.status}`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
}

// One call returns { "date": "paragraph" … } for all days in the month
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

  const prompt = `You are writing professional daily work reports for ${monthLabel}.
I will give you Jira work logs grouped by date.
Return ONLY a valid JSON object with no extra text, where:
  - each key is a date in the format "date-value" (e.g. "2026-06-01")
  - each value is a 2-3 sentence professional paragraph in past tense, first person, summarising that day

Work logs:
${sections}

Respond with ONLY the JSON object.`

  const text = await callGemini(apiKey, prompt)
  return parseJsonFromResponse(text)
}

// One call returns { "week-start-date": "paragraph" … } for all weeks
export async function generateWeeklyReports(apiKey, byWeek, monthLabel) {
  const sections = byWeek
    .map(({ label, startDate, entries }) => {
      const lines = entries
        .map((e) => `  - [${e.issueKey}] ${e.issueSummary}: ${e.comment || '(no comment)'}`)
        .join('\n')
      return `Week starting ${startDate} (${label}):\n${lines}`
    })
    .join('\n\n')

  const prompt = `You are writing professional weekly work reports for ${monthLabel}.
I will give you Jira work logs grouped by week.
Return ONLY a valid JSON object with no extra text, where:
  - each key is the week-start date (e.g. "2026-06-01")
  - each value is a 3-4 sentence professional paragraph in past tense, first person, summarising that week's progress and milestones

Work logs:
${sections}

Respond with ONLY the JSON object.`

  const text = await callGemini(apiKey, prompt)
  return parseJsonFromResponse(text)
}

// One call returns a single paragraph string for the full month
export async function generateMonthlyReport(apiKey, worklogs, monthLabel) {
  const lines = worklogs
    .map((e) => `- [${e.issueKey}] ${e.issueSummary}: ${e.comment || '(no comment)'}`)
    .join('\n')

  const prompt = `You are writing a professional monthly work summary for ${monthLabel}.
Write a single executive-level paragraph (4-5 sentences, past tense, first person) summarising the month's achievements, main areas of work, and overall progress.

Work logs:
${lines}

Respond with ONLY the paragraph text.`

  return callGemini(apiKey, prompt)
}
