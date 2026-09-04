import { SinkType } from 'generated/graphql'

import { isValidURL } from 'utils/url'

const slackWebhookHosts = ['slack.com', 'slack-gov.com']

const teamsWebhookHosts = [
  'office.com',
  'office365.com',
  'powerautomate.com',
  'powerplatform.com',
  'logic.azure.com',
]

function matchesWebhookHost(url: string, hosts: string[]) {
  if (!isValidURL(url) || !/^https:\/\//i.test(url)) {
    return false
  }

  let parsedUrl: URL

  try {
    parsedUrl = new URL(url)
  } catch {
    return false
  }

  return (
    parsedUrl.protocol === 'https:' &&
    hosts.some(
      (host) =>
        parsedUrl.hostname === host || parsedUrl.hostname.endsWith(`.${host}`)
    )
  )
}

const hookUrlMatch = [
  [SinkType.Slack, (url: string) => matchesWebhookHost(url, slackWebhookHosts)],
  [SinkType.Teams, (url: string) => matchesWebhookHost(url, teamsWebhookHosts)],
] as const satisfies [SinkType, (url: string) => boolean][]

export function getSinkTypeForWebhookUrl(url: string) {
  return hookUrlMatch.find(([_, matches]) => matches(url))?.[0]
}
