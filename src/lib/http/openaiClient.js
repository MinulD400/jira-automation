const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

// apiKey is decrypted and passed in at call time — never stored in module scope
export async function generateReportDescription(apiKey, entries, periodLabel) {
  const entriesText = entries
    .map((e) => `- [${e.issueKey}] ${e.issueSummary}: ${e.comment || '(no comment)'}`)
    .join('\n')

  const prompt = `You are a professional work report writer. Based on the following Jira work log entries for ${periodLabel}, write a concise, professional summary (2-4 sentences) describing what was accomplished. Focus on outcomes and progress, not individual tasks. Write in paragraph form.

Work log entries:
${entriesText}`

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.6,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || `OpenAI error ${res.status}`)
  }

  const data = await res.json()
  return data.choices[0].message.content.trim()
}
