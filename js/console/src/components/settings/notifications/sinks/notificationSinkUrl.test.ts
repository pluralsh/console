import { SinkType } from 'generated/graphql'

import { getSinkTypeForWebhookUrl } from './notificationSinkUrl'

describe('getSinkTypeForWebhookUrl', () => {
  it('matches standard Slack incoming webhook URLs', () => {
    expect(
      getSinkTypeForWebhookUrl(
        'https://hooks.slack.com/services/T00000000/B00000000/test'
      )
    ).toBe(SinkType.Slack)
  })

  it('matches GovSlack incoming webhook URLs', () => {
    expect(
      getSinkTypeForWebhookUrl(
        'https://hooks.slack-gov.com/services/T00000000/B00000000/test'
      )
    ).toBe(SinkType.Slack)
  })

  it('rejects userinfo hostname spoofing', () => {
    expect(
      getSinkTypeForWebhookUrl(
        'https://hooks.slack.com@example.com/services/T00000000/B00000000/test'
      )
    ).toBeUndefined()
    expect(
      getSinkTypeForWebhookUrl(
        'https://environment.api.powerplatform.com@example.com/workflows/test'
      )
    ).toBeUndefined()
  })

  it('rejects suffix hostname spoofing', () => {
    expect(
      getSinkTypeForWebhookUrl(
        'https://hooks.slack.com.example.com/services/T00000000/B00000000/test'
      )
    ).toBeUndefined()
    expect(
      getSinkTypeForWebhookUrl(
        'https://hooks.slack-gov.com.example.com/services/T00000000/B00000000/test'
      )
    ).toBeUndefined()
  })

  it('rejects URLs with invalid ports', () => {
    expect(
      getSinkTypeForWebhookUrl(
        'https://hooks.slack.com:99999/services/T00000000/B00000000/test'
      )
    ).toBeUndefined()
  })
})
