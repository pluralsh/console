import { Card, Switch } from '@pluralsh/design-system'
import { A, H2, P } from 'honorable'
import { useCookieSettings } from 'components/tracking/CookieSettings'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

export default function AccountSettings() {
  const { consent, setConsent } = useCookieSettings()

  return (
    <ScrollablePage
      scrollable={false}
      heading="Cookie settings"
    >
      <Card padding="xlarge">
        <H2
          subtitle2
          marginBottom="xsmall"
        >
          We use cookies
        </H2>
        <P body2>
          We use cookies to improve your experience and make product updates and
          refinements. You can review our{' '}
          <A
            inline
            href="https://www.plural.sh/legal/privacy-policy"
            target="_blank"
          >
            privacy policy here
          </A>
          .
        </P>
        <Switch
          checked={consent.statistics}
          onChange={() => {
            setConsent({ statistics: !consent.statistics })
          }}
          marginTop="xlarge"
        >
          Allow
        </Switch>
      </Card>
    </ScrollablePage>
  )
}
