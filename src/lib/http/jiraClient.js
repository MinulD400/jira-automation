// baseUrl is the user-supplied Jira instance URL (e.g. https://company.atlassian.net)
// Credentials are passed per-call and never stored in module scope.

function authHeader(email, token) {
  return 'Basic ' + btoa(`${email}:${token}`)
}

async function request(baseUrl, path, email, token, options = {}) {
  const url = `${baseUrl.replace(/\/$/, '')}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader(email, token),
      ...options.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Jira API error ${res.status}: ${text}`)
  }
  return res.json()
}

export async function fetchCurrentUser(baseUrl, email, token) {
  return request(baseUrl, '/rest/api/3/myself', email, token)
}

export async function fetchIssuesWithWorklogs(baseUrl, email, token, startDate, endDate) {
  const jql = `worklogDate >= "${startDate}" AND worklogDate <= "${endDate}" AND worklogAuthor = currentUser() ORDER BY updated DESC`
  let startAt = 0
  const maxResults = 100
  const allIssues = []

  while (true) {
    const data = await request(
      baseUrl,
      `/rest/api/3/search?jql=${encodeURIComponent(jql)}&startAt=${startAt}&maxResults=${maxResults}&fields=summary,status,issuetype,project`,
      email,
      token,
    )
    allIssues.push(...data.issues)
    if (startAt + maxResults >= data.total) break
    startAt += maxResults
  }

  return allIssues
}

export async function fetchWorklogs(baseUrl, email, token, issueKey, startDate, endDate, accountId) {
  const data = await request(baseUrl, `/rest/api/3/issue/${issueKey}/worklog`, email, token)
  return data.worklogs.filter((w) => {
    const date = w.started.slice(0, 10)
    const byMe = accountId ? w.author.accountId === accountId : true
    return date >= startDate && date <= endDate && byMe
  })
}
