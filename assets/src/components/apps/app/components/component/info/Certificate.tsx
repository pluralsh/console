import { Card } from '@pluralsh/design-system'
import PropWide from 'components/utils/PropWide'
import { Flex, H2 } from 'honorable'
import { useOutletContext } from 'react-router-dom'

export default function Certificate() {
  const { data } = useOutletContext<any>()

  if (!data?.certificate) return null

  const { certificate } = data
  const issuer = certificate.spec?.issuerRef

  return (
    <Flex direction="column">
      <H2 marginBottom="medium">Status</H2>
      <Card padding="large">
        <PropWide
          title="Renewal date"
          fontWeight={600}
        >
          {certificate.status?.renewalTime || '-'}
        </PropWide>
        <PropWide
          title="Not before"
          fontWeight={600}
        >
          {certificate.status?.notBefore || '-'}
        </PropWide>
        <PropWide
          title="Not after"
          fontWeight={600}
        >
          {certificate.status?.notAfter || '-'}
        </PropWide>
      </Card>
      <H2
        marginBottom="medium"
        marginTop="large"
      >
        Spec
      </H2>
      <Card padding="large">
        <PropWide
          title="Secret name"
          fontWeight={600}
        >
          {certificate.spec?.secretName || 0}
        </PropWide>
        <PropWide
          title="DNS names"
          fontWeight={600}
        >
          {certificate.spec?.dnsNames?.join(', ')}
        </PropWide>
        <PropWide
          title="Issuer"
          fontWeight={600}
        >
          {issuer?.group}/{issuer?.kind?.toLowerCase()} {issuer?.name}
        </PropWide>
      </Card>
    </Flex>
  )
}
