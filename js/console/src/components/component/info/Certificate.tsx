import { useOutletContext } from 'react-router-dom'

import { InfoSection, PaddedCard, PropWideBold } from './common'
import { ComponentDetailsContext } from '../ComponentDetails'
import dayjs from 'dayjs'

export default function Certificate() {
  const { componentDetails: certificate } =
    useOutletContext<ComponentDetailsContext>()

  if (certificate?.__typename !== 'Certificate') return null

  const issuer = certificate.spec?.issuerRef

  return (
    <>
      <InfoSection title="Status">
        <PaddedCard>
          <PropWideBold title="Renewal date">
            {dayjs(certificate.status?.renewalTime).format(
              'MM/DD/YYYY, h:mm A'
            )}
          </PropWideBold>
          <PropWideBold title="Not before">
            {dayjs(certificate.status?.notBefore).format('MM/DD/YYYY, h:mm A')}
          </PropWideBold>
          <PropWideBold title="Not after">
            {dayjs(certificate.status?.notAfter).format('MM/DD/YYYY, h:mm A')}
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
