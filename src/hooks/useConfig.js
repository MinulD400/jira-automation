// Reads credentials from .env at startup — never stored in state or localStorage
export function useConfig() {
  const config = {
    jiraBaseUrl: import.meta.env.VITE_JIRA_BASE_URL || '',
    jiraEmail: import.meta.env.VITE_JIRA_EMAIL || '',
    jiraToken: import.meta.env.VITE_JIRA_TOKEN || '',
    openaiKey: import.meta.env.VITE_OPENAI_KEY || '',
  }

  const isConfigured = Boolean(
    config.jiraBaseUrl && config.jiraEmail && config.jiraToken && config.openaiKey,
  )

  return { config, isConfigured }
}
