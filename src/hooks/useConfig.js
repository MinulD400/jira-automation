// Reads credentials from .env at startup — never stored in state or localStorage
export function useConfig() {
  const config = {
    jiraBaseUrl: import.meta.env.VITE_JIRA_BASE_URL || '',
    jiraEmail:   import.meta.env.VITE_JIRA_EMAIL    || '',
    jiraToken:   import.meta.env.VITE_JIRA_TOKEN    || '',
    groqKey:     import.meta.env.VITE_GROQ_KEY      || '',
  }

  const isConfigured = Boolean(
    config.jiraBaseUrl && config.jiraEmail && config.jiraToken && config.groqKey,
  )

  return { config, isConfigured }
}
