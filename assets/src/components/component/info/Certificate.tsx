import { useOutletContext } from 'react-router-dom'

import { InfoSection, PaddedCard, PropWideBold } from './common'

export default function Certificate() {
  const { data } = useOutletContext<any>()

  if (!data?.certificate) return null

  const { certificate } = data
  const issuer = certificate.spec?.issuerRef

  return (
    <>
      <InfoSection title="Status">
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
      </InfoSection>
      <InfoSection title="Spec">
        <PaddedCard>
          <PropWideBold title="Secret name">
            {certificate.spec?.secretName || 0}
          </PropWideBold>
          <PropWideBold
            css={{ whiteSpace: 'pre-wrap', justifyContent: 'flex-end' }}
            title="DNS names"
          >
            {certificate.spec?.dnsNames?.join('\n')}
          </PropWideBold>
          <PropWideBold title="Issuer">
            {issuer?.group}/{issuer?.kind?.toLowerCase()} {issuer?.name}
          </PropWideBold>
        </PaddedCard>
      </InfoSection>
    </>
  )
}
