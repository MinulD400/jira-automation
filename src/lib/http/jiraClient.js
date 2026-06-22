const BASE = '/api/jira'

function authHeader(email, token) {
  return 'Basic ' + btoa(`${email}:${token}`)
}

async function get(path, email, token) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Authorization: authHeader(email, token),
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Jira ${res.status}: ${text}`)
  }
  return res.json()
}

export async function fetchCurrentUser(email, token) {
  return get('/rest/api/3/myself', email, token)
}

// One person logs work on at most a few dozen issues per month — a single call is enough
export async function fetchIssuesWithWorklogs(email, token, startDate, endDate) {
  const jql = `worklogDate >= "${startDate}" AND worklogDate <= "${endDate}" AND worklogAuthor = currentUser() ORDER BY updated DESC`
  const params = new URLSearchParams({
    jql,
    startAt: 0,
    maxResults: 50,
    fields: 'summary,status,issuetype,project',
  })
  const data = await get(`/rest/api/3/search/jql?${params}`, email, token)
  return data.issues ?? []
}

export async function fetchWorklogs(email, token, issueKey, startDate, endDate, accountId) {
  const data = await get(`/rest/api/3/issue/${issueKey}/worklog`, email, token)
  return data.worklogs.filter((w) => {
    const date = w.started.slice(0, 10)
    const byMe = accountId ? w.author.accountId === accountId : true
    return date >= startDate && date <= endDate && byMe
  })
}
