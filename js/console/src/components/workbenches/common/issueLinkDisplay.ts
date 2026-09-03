import { IssueWebhookProvider } from 'generated/graphql'

export function issueLinkLabel({
  url,
  provider,
}: {
  url?: Nullable<string>
  provider?: Nullable<IssueWebhookProvider>
}): string {
  const parts = pathParts(url)

  switch (provider) {
    case IssueWebhookProvider.Github: {
      const kindIdx = parts.findIndex(
        (part) => part === 'issues' || part === 'pull' || part === 'pulls'
      )
      const number = numericSegment(parts[kindIdx + 1])
      if (number) {
        return `${parts[kindIdx] === 'issues' ? 'Issue' : 'PR'} ${number}`
      }
      break
    }
    case IssueWebhookProvider.Linear: {
      const issueIdx = parts.findIndex((part) => part === 'issue')
      const id = parts[issueIdx + 1]
      if (id) return id
      break
    }
    case IssueWebhookProvider.Gitlab: {
      const kindIdx = parts.findIndex(
        (part) => part === 'issues' || part === 'merge_requests'
      )
      const number = numericSegment(parts[kindIdx + 1])
      if (number) {
        return `${parts[kindIdx] === 'issues' ? 'Issue' : 'MR'} ${number}`
      }
      break
    }
    case IssueWebhookProvider.Jira: {
      const browseIdx = parts.findIndex((part) => part === 'browse')
      const id = browseIdx >= 0 ? parts[browseIdx + 1] : undefined
      if (id) return id
      break
    }
    default:
      break
  }

  const last = parts.at(-1)
  if (last && ISSUE_KEY.test(last)) return last
  const number = numericSegment(last)
  if (number) return `Issue ${number}`

  return last || url || 'Issue'
}

function pathParts(url?: Nullable<string>): string[] {
  if (!url) return []
  try {
    return new URL(url).pathname.split('/').filter(Boolean)
  } catch {
    return url.split('/').filter(Boolean)
  }
}

function numericSegment(segment?: string): string | undefined {
  const value = segment?.split(/[#?]/)[0]
  return value && /^\d+$/.test(value) ? value : undefined
}

const ISSUE_KEY = /^[A-Za-z][\w]*-\d+$/
