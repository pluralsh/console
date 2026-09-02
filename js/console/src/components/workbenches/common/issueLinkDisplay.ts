import { IssueWebhookProvider } from 'generated/graphql'

export type IssueLinkParts = {
  ticket: string
  slug?: string
}

export function issueLinkParts({
  url,
  provider,
  title,
}: {
  url?: Nullable<string>
  provider?: Nullable<IssueWebhookProvider>
  title?: Nullable<string>
}): IssueLinkParts {
  const slug = slackSlug(title)
  const parts = pathParts(url)

  switch (provider) {
    case IssueWebhookProvider.Github: {
      const kindIdx = parts.findIndex(
        (part) => part === 'issues' || part === 'pull' || part === 'pulls'
      )
      const number = numericSegment(parts[kindIdx + 1])
      if (number) {
        return {
          ticket: `${parts[kindIdx] === 'issues' ? 'Issue' : 'PR'} ${number}`,
          slug,
        }
      }
      break
    }
    case IssueWebhookProvider.Linear: {
      const issueIdx = parts.findIndex((part) => part === 'issue')
      const id = parts[issueIdx + 1]
      if (id) {
        const urlSlug = parts[issueIdx + 2]
        return {
          ticket: id,
          slug: distinctSlug(id, urlSlug) ?? slug,
        }
      }
      break
    }
    case IssueWebhookProvider.Gitlab: {
      const kindIdx = parts.findIndex(
        (part) => part === 'issues' || part === 'merge_requests'
      )
      const number = numericSegment(parts[kindIdx + 1])
      if (number) {
        return {
          ticket: `${parts[kindIdx] === 'issues' ? 'Issue' : 'MR'} ${number}`,
          slug,
        }
      }
      break
    }
    case IssueWebhookProvider.Jira: {
      const id = parts[parts.findIndex((part) => part === 'browse') + 1]
      if (id) return { ticket: id, slug }
      break
    }
    default:
      break
  }

  const last = parts.at(-1)
  if (last && ISSUE_KEY.test(last)) return { ticket: last, slug }
  const number = numericSegment(last)
  if (number) return { ticket: `Issue ${number}`, slug }

  return { ticket: last || url || 'Issue', slug }
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

function slackSlug(title?: Nullable<string>): string | undefined {
  const slug = title
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || undefined
}

function distinctSlug(ticket: string, slug?: string): string | undefined {
  if (!slug || slug.toLowerCase() === ticket.toLowerCase()) return undefined
  return slug
}

const ISSUE_KEY = /^[A-Za-z][\w]*-\d+$/
