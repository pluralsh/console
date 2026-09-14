import { IssueWebhookProvider } from 'generated/graphql'
import { describe, expect, it } from 'vitest'
import { issueLinkLabel } from './issueLinkDisplay'

describe('issueLinkLabel', () => {
  it('extracts a Jira issue key from the standard browse URL', () => {
    expect(
      issueLinkLabel({
        provider: IssueWebhookProvider.Jira,
        url: 'https://example.atlassian.net/browse/PROD-5172',
      })
    ).toBe('PROD-5172')
  })

  it('falls back to the final segment when a Jira URL has no browse path', () => {
    expect(
      issueLinkLabel({
        provider: IssueWebhookProvider.Jira,
        url: 'https://example.atlassian.net/issues/PROD-5172',
      })
    ).toBe('PROD-5172')
  })
})
