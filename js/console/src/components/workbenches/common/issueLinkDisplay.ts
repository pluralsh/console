import { IssueWebhookProvider } from 'generated/graphql'
import { compact, isEmpty } from 'lodash'

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
      if (!isEmpty(number)) {
        return `${parts[kindIdx] === 'issues' ? 'Issue' : 'PR'} ${number}`
      }
      break
    }
    case IssueWebhookProvider.Linear: {
      const issueIdx = parts.findIndex((part) => part === 'issue')
      const id = parts[issueIdx + 1]
      if (!isEmpty(id)) return String(id)
      break
    }
    case IssueWebhookProvider.Gitlab: {
      const kindIdx = parts.findIndex(
        (part) => part === 'issues' || part === 'merge_requests'
      )
      const number = numericSegment(parts[kindIdx + 1])
      if (!isEmpty(number)) {
        return `${parts[kindIdx] === 'issues' ? 'Issue' : 'MR'} ${number}`
      }
      break
    }
    case IssueWebhookProvider.Jira: {
      const browseIdx = parts.findIndex((part) => part === 'browse')
      const id = browseIdx >= 0 ? parts[browseIdx + 1] : undefined
      if (!isEmpty(id)) return String(id)
      break
    }
    default:
      break
  }

  const last = parts.at(-1)
  if (!isEmpty(last) && ISSUE_KEY.test(String(last))) return String(last)
  const number = numericSegment(last)
  if (!isEmpty(number)) return `Issue ${number}`

  return compact([last, url])[0] ?? 'Issue'
}

function pathParts(url?: Nullable<string>): string[] {
  if (isEmpty(url)) return []
  const href = String(url)
  try {
    return compact(new URL(href).pathname.split('/'))
  } catch {
    return compact(href.split('/'))
  }
}

function numericSegment(segment?: string): string | undefined {
  const value = segment?.split(/[#?]/)[0]
  return !isEmpty(value) && /^\d+$/.test(String(value)) ? value : undefined
}

const ISSUE_KEY = /^[A-Za-z][\w]*-\d+$/
