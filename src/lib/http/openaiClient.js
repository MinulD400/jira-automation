const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

const PROMPTS = {
  daily: (label, entries) => `
You are writing a professional daily work report for ${label}.
Based on the Jira work log entries below, write a concise paragraph (2–3 sentences) that describes what was accomplished that day.
Write in past tense, first person ("I worked on...", "I completed..."). Focus on outcomes, not task lists.

Work logs:
${entries}`.trim(),

  weekly: (label, entries) => `
You are writing a professional weekly status report for the ${label}.
Based on the Jira work log entries below, write a short paragraph (3–4 sentences) summarising the week's progress.
Highlight key milestones, ongoing work, and any blockers resolved. Write in past tense, first person.

Work logs:
${entries}`.trim(),

  monthly: (label, entries) => `
You are writing a professional monthly work summary for ${label}.
Based on the Jira work log entries below, write an executive-level paragraph (4–5 sentences) summarising the month's achievements.
Cover the main areas of work, significant completions, and overall progress toward goals. Write in past tense, first person.

Work logs:
${entries}`.trim(),
}

export async function generateReportDescription(apiKey, entries, periodLabel, reportType = 'daily') {
  const entriesText = entries
    .map((e) => `- [${e.issueKey}] ${e.issueSummary}: ${e.comment || '(no comment)'}`)
    .join('\n')

  const prompt = (PROMPTS[reportType] ?? PROMPTS.daily)(periodLabel, entriesText)

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 350,
      temperature: 0.65,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    const code = err.error?.code
    if (code === 'insufficient_quota') {
      throw new Error('OpenAI quota exceeded — add credits at platform.openai.com/account/billing')
    }
    if (res.status === 401) {
      throw new Error('Invalid OpenAI API key — check VITE_OPENAI_KEY in your .env')
    }
    if (res.status === 429) {
      throw new Error('OpenAI rate limit reached — wait a moment and try again')
    }
    throw new Error(err.error?.message || `OpenAI error ${res.status}`)
  }

  const data = await res.json()
  return data.choices[0].message.content.trim()
}
