# Jira Report Generator

An AI-powered internal tool that fetches your Jira worklogs for any month and generates professional daily, weekly, and monthly work reports using Groq (Llama 3.3).

Built with React + Vite, Tailwind CSS, and TanStack Query.

---

## Features

- Fetch all your Jira worklogs for any selected month with a single click
- Generate human-sounding daily, weekly, and monthly reports via a single AI call per report type
- Three distinct AI prompts — daily reflections, weekly progress summaries, and monthly executive overviews
- Copy any generated report to clipboard with one click
- Expandable worklog entries per day/week to review the raw data
- Stats panel showing total work logs, active days, and logged hours
- MCK project owner header
- Credentials loaded from `.env` — nothing stored in the browser

---

## Tech Stack

| Layer | Library |
|---|---|
| UI Framework | React 18 + Vite |
| Styling | Tailwind CSS v4 |
| Data Fetching | TanStack Query v5 |
| AI Provider | Groq — llama-3.3-70b-versatile |
| Date Utilities | date-fns |
| Icons | lucide-react |

---
## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/MinulD400/jira-automation.git
cd jira-automation
npm install
```

### 2. Create your `.env` file

```env
VITE_JIRA_BASE_URL=https://your-domain.atlassian.net
VITE_JIRA_EMAIL=you@company.com
VITE_JIRA_TOKEN=your-jira-api-token
VITE_GROQ_KEY=gsk_...
```

### Get the required credentials

#### Jira Cloud URL
Your Jira site URL, for example:

```
https://your-company.atlassian.net
```

#### Jira Email
Use the email address associated with your Atlassian account.

#### Jira API Token
Generate a personal API token here:

👉 https://id.atlassian.com/manage-profile/security/api-tokens

Click **Create API token**, give it a name, and copy the generated token into `VITE_JIRA_TOKEN`.

#### Groq API Key
Create a free Groq account and generate an API key:

👉 https://console.groq.com/

API Keys page:

👉 https://console.groq.com/keys

Copy the generated key into `VITE_GROQ_KEY`.

### 3. Start the development server

```bash
npm run dev
```

The Vite development server proxies Jira API requests through `localhost`, eliminating CORS issues without requiring a backend.
---

## How It Works

1. Select a month using the period picker
2. Click **Fetch Worklogs** — pulls all issues you logged time on via the Jira REST API
3. Pick a tab: **Daily**, **Weekly**, or **Monthly**
4. Click **Generate** — sends a single request to Groq with all the worklogs for that period
5. Groq returns a structured JSON response broken down by day or week, which populates each report card automatically

Each report type uses a different prompt tuned for its purpose — daily entries read like personal work notes, weekly summaries highlight progress and milestones, and the monthly report reads like a professional end-of-month reflection.

---

## Project Structure

```
src/
  components/
    atoms/          Button, Input, Select, Badge, Spinner
    molecules/      PeriodSelector, ReportCard
    organisms/      ReportGenerator
  hooks/
    useConfig.js          reads credentials from .env
    useJiraWorklogs.js    fetches and flattens Jira worklogs
    useReportGeneration.js  orchestrates AI report generation
  lib/
    http/
      jiraClient.js   Jira REST API calls (proxied)
      groqClient.js   Groq AI calls with per-type prompts
    dateHelpers.js    month/week/day range utilities
    queryKeys.js      TanStack Query key definitions
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_JIRA_BASE_URL` | Your Jira Cloud base URL |
| `VITE_JIRA_EMAIL` | Your Atlassian account email |
| `VITE_JIRA_TOKEN` | Jira API token |
| `VITE_GROQ_KEY` | Groq API key (free at console.groq.com) |

The `.env` file is git-ignored and credentials are never persisted anywhere beyond the running Vite process.
