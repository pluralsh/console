import { Card } from '@pluralsh/design-system'
import PropWide from 'components/utils/PropWide'
import {
  Flex,
  H2,
  H3,
  Span,
} from 'honorable'
import isEmpty from 'lodash/isEmpty'
import { useOutletContext } from 'react-router-dom'

export default function Service() {
  const { data } = useOutletContext<any>()

  if (!data?.service) return null

  const { service } = data
  const loadBalancer = service.status?.loadBalancer
  const hasIngress = !!loadBalancer?.ingress && !isEmpty(loadBalancer.ingress)
  const ports = service.spec?.ports || []
  const hasPorts = !isEmpty(ports)

  return (
    <Flex direction="column">
      {hasIngress && (
        <>
          <H2 marginBottom="medium">Status</H2>
          <Card padding="large">
            <PropWide
              title="IP"
              fontWeight={600}
            >
              {loadBalancer.ingress[0].ip}
            </PropWide>
          </Card>
        </>
      )}
      <H2
        marginBottom="medium"
        marginTop={hasIngress ? 'large' : 0}
      >
        Spec
      </H2>
      <Card padding="large">
        <PropWide
          title="Type"
          fontWeight={600}
        >
          {service.spec?.type}
        </PropWide>
        <PropWide
          title="Cluster IP"
          fontWeight={600}
        >
          {service.spec?.clusterIp || '-'}
        </PropWide>
        {hasPorts && (
          <>
            <H3
              body1
              fontWeight={600}
              marginBottom="medium"
              marginTop="large"
            >
              Ports
            </H3>
            {ports.map(({
              name, protocol, port, targetPort,
            }, i) => (
              <PropWide
                key={i}
                gap="small"
                fontWeight={600}
                title={name || '-'}
              >
                <Span>{protocol}</Span>
                <Span>{port} {'->'} {targetPort}</Span>
              </PropWide>
            ))}
          </>
        )}
      </Card>
    </Flex>
  )
}
