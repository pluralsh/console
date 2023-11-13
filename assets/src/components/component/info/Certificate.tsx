import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { InfoSectionH2, PaddedCard, PropWideBold } from './common'

export default function Certificate() {
  const theme = useTheme()
  const { data } = useOutletContext<any>()

  if (!data?.certificate) return null

  const { certificate } = data
  const issuer = certificate.spec?.issuerRef

  return (
    <div css={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <InfoSectionH2 css={{ marginBottom: theme.spacing.medium }}>
        Status
      </InfoSectionH2>
      <PaddedCard>
        <PropWideBold title="Renewal date">
          {certificate.status?.renewalTime || '-'}
        </PropWideBold>
        <PropWideBold title="Not before">
          {certificate.status?.notBefore || '-'}
        </PropWideBold>
        <PropWideBold title="Not after">
          {certificate.status?.notAfter || '-'}
        </PropWideBold>
      </PaddedCard>
      <InfoSectionH2
        css={{
          marginBottom: theme.spacing.medium,
          marginTop: theme.spacing.large,
        }}
      >
        Spec
      </InfoSectionH2>
      <PaddedCard>
        <PropWideBold title="Secret name">
          {certificate.spec?.secretName || 0}
        </PropWideBold>
        <PropWideBold title="DNS names">
          {certificate.spec?.dnsNames?.join(', ')}
        </PropWideBold>
        <PropWideBold title="Issuer">
          {issuer?.group}/{issuer?.kind?.toLowerCase()} {issuer?.name}
        </PropWideBold>
      </PaddedCard>
    </div>
  )
}
