// Groq uses the OpenAI-compatible API — llama-3.3-70b-versatile is free with 14,400 req/day
const BASE  = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

const BRIEF_ACTIVITY =
  /\b(leave|half[\s-]?day|casual leave|full[\s-]?day leave|annual leave|sick leave|holiday|cricket|sport|sports|tournament|team outing|recreation|company event|social event|non[\s-]?development)\b/i
const DEV_ACTIVITY =
  /\b(implement|debug|integrat|configur|develop|fix|deploy|api|pos|sms|vault|refactor|code|production|module|service|backend|frontend|database|schema|masking|erp)\b/i

function entryText(entry) {
  return `${entry.issueSummary} ${entry.comment || ''}`
}

/** @returns {'brief' | 'mixed' | 'detailed'} */
export function getDaySummaryStyle(entries) {
  const blob = entries.map(entryText).join(' ')
  const hasBrief = BRIEF_ACTIVITY.test(blob)
  const hasDev = DEV_ACTIVITY.test(blob)

  if (hasBrief && !hasDev) return 'brief'
  if (hasBrief && hasDev) return 'mixed'
  return 'detailed'
}

const STYLE_INSTRUCTIONS = {
  brief:
    'Write 1 short sentence only. State plainly that you were on leave, took a half day, or attended a non-development activity (e.g. cricket, sports, social). Do not invent technical work, systems, or engineering outcomes.',
  mixed:
    'Write 2 to 3 sentences. Briefly note leave, half day, or non-development activity, then summarise only the actual development work done that day. Keep non-technical portions minimal.',
  detailed:
    'Write a thorough technical summary of 5 to 7 sentences describing engineering work: systems touched, problems solved, approach taken, and outcomes.',
}

const PROMPTS = {
  daily: (label, sections) => `You are a senior software engineer writing your own daily work log in first person for ${label}.
Each date below includes a "Summary style" that controls length and tone. Follow it exactly.

General rules:
- Write strictly in first person, past tense
- Do not use bullet points, dashes, asterisks, hyphens, or any list symbols
- Do not copy Jira issue titles verbatim
- For "brief" days: never pad with technical filler, production systems, or invented engineering detail
- For "detailed" days: be highly technical — name systems, modules, APIs, integrations, debugging, configuration, and outcomes where inferable from the logs
- Vary phrasing across dates

Return ONLY a valid JSON object with no extra text outside the JSON, where each key is a date string (YYYY-MM-DD) and each value is the paragraph for that day.

Work logs:
${sections}

Respond with ONLY the JSON object.`,

  weekly: (label, sections) => `You are a software developer and engineer writing your own professional weekly engineering summary in first person.
For each week below, write a focused technical paragraph (3 to 4 sentences) summarising the key development work, architectural decisions, or engineering milestones you achieved that week.

Rules you must follow:
- Write strictly in first person, past tense ("I developed...", "I architected...", "I resolved...", "I contributed to...", "I delivered...")
- Surface technically meaningful contributions — highlight what systems, services, components, or features were built, improved, or fixed, and explain the engineering significance
- Use academic and professional language appropriate for a technical progress report or engineering retrospective
- Emphasise the impact and purpose of the work — not just activities, but outcomes and what they enable
- Do not use bullet points, dashes, asterisks, hyphens, or any list symbols anywhere in the text
- Do not copy Jira issue titles verbatim — reinterpret and articulate the engineering work in technical terms
- Each week's paragraph should feel distinct, reflecting the specific focus areas of that period

Return ONLY a valid JSON object with no extra text outside the JSON, where each key is the week start date (YYYY-MM-DD) and each value is the paragraph for that week.

Work logs:
${sections}

Respond with ONLY the JSON object.`,

  monthly: (label, lines) => `You are a software developer and engineer writing your own professional monthly technical reflection in first person.
Write one cohesive paragraph (4 to 5 sentences) that articulates the breadth and depth of your engineering contributions throughout ${label}.

Rules you must follow:
- Write strictly in first person, past tense ("I led...", "I engineered...", "I designed...", "I delivered...", "I collaborated on...")
- Provide a high-level technical narrative that communicates what systems, modules, or capabilities were developed, the engineering challenges addressed, and the overall impact on the product or platform
- Adopt a polished, academic, and professional tone — suitable for a technical portfolio, engineering review, or performance documentation
- Highlight the themes of your work: areas of the codebase touched, types of engineering tasks (feature development, system design, debugging, infrastructure, code quality, testing), and their significance
- Do not use bullet points, dashes, asterisks, hyphens, or any list symbols
- Do not copy Jira issue titles verbatim — synthesise and elevate the engineering work into a coherent technical narrative in your own words
- The result should read as something a competent, articulate software engineer would genuinely write about their own month

Work logs:
${lines}

Respond with ONLY the paragraph text.`,
}

function parseJsonFromResponse(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('Model did not return valid JSON')
  }
}

async function callGroq(apiKey, prompt, retries = 4) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 8192,
      }),
    })

    if (res.status === 429 && attempt < retries) {
      const wait = 2000 * (attempt + 1)
      await new Promise((r) => setTimeout(r, wait))
      continue
    }

    if (!res.ok) {
      const err = await res.json()
      if (res.status === 401) throw new Error('Invalid Groq API key — check VITE_GROQ_KEY in your .env')
      if (res.status === 429) throw new Error('Groq rate limit reached — wait a moment and try again')
      throw new Error(err.error?.message || `Groq error ${res.status}`)
    }

    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() ?? ''
  }
}

export async function generateDailyReports(apiKey, byDate, monthLabel) {
  const sections = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, entries]) => {
      const style = getDaySummaryStyle(entries)
      const lines = entries
        .map((e) => `  - [${e.issueKey}] ${e.issueSummary}: ${e.comment || '(no comment)'}`)
        .join('\n')
      return `${date} (Summary style: ${style} — ${STYLE_INSTRUCTIONS[style]}):\n${lines}`
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
