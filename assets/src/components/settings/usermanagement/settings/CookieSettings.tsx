import { Card, Switch } from '@pluralsh/design-system'
import { useCookieSettings } from 'components/tracking/CookieSettings'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { useTheme } from 'styled-components'

export default function AccountSettings() {
  const { consent, setConsent } = useCookieSettings()
  const theme = useTheme()

  return (
    <ScrollablePage
      scrollable={false}
      heading="Cookie settings"
    >
      <Card padding="xlarge">
        <h2
          css={{
            margin: 0,
            ...theme.partials.text.subtitle2,
            marginBottom: theme.spacing.xsmall,
          }}
        >
          We use cookies
        </h2>
        <p css={{ margin: 0, ...theme.partials.text.body2 }}>
          We use cookies to improve your experience and make product updates and
          refinements. You can review our{' '}
          <a
            css={{ ...theme.partials.text.inlineLink }}
            href="https://www.plural.sh/legal/privacy-policy"
            target="_blank"
            rel="noreferrer"
          >
            privacy policy here
          </a>
          .
        </p>
        <div css={{ marginTop: theme.spacing.xlarge }}>
          <Switch
            checked={consent.statistics}
            onChange={() => {
              setConsent({ statistics: !consent.statistics })
            }}
          >
            Allow
          </Switch>
        </div>
      </Card>
    </ScrollablePage>
  )
}
