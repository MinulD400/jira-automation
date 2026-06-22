import { useQuery } from '@tanstack/react-query'
import { fetchIssuesWithWorklogs, fetchWorklogs, fetchCurrentUser } from '@/lib/http/jiraClient'
import { queryKeys } from '@/lib/queryKeys'
import { getMonthRange } from '@/lib/dateHelpers'

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

async function loadAllWorklogs(config, year, month) {
  const { jiraEmail, jiraToken } = config
  const { startDate, endDate } = getMonthRange(year, month)

  const user = await fetchCurrentUser(jiraEmail, jiraToken)
  const issues = await fetchIssuesWithWorklogs(jiraEmail, jiraToken, startDate, endDate)

  const entries = []
  await Promise.all(
    issues.map(async (issue) => {
      const logs = await fetchWorklogs(
        jiraEmail, jiraToken,
        issue.key, startDate, endDate, user.accountId,
      )
      for (const log of logs) {
        entries.push({
          id: log.id,
          issueKey: issue.key,
          issueSummary: issue.fields.summary,
          started: log.started,
          timeSpentSeconds: log.timeSpentSeconds,
          comment: extractComment(log.comment),
        })
      }
    }),
  )

  entries.sort((a, b) => a.started.localeCompare(b.started))
  return entries
}

export function useJiraWorklogs({ config, year, month, enabled }) {
  return useQuery({
    queryKey: queryKeys.worklogs(year, month),
    queryFn: () => loadAllWorklogs(config, year, month),
    enabled: enabled && Boolean(config?.jiraEmail && config?.jiraToken),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}
