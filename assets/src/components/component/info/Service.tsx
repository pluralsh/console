import isEmpty from 'lodash/isEmpty'
import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { isNonNullable } from 'utils/isNonNullable'
import { ComponentDetailsContext } from '../ComponentDetails'
import { InfoSection, PaddedCard, PropWideBold } from './common'

export default function Service() {
  const theme = useTheme()
  const { componentDetails: service } =
    useOutletContext<ComponentDetailsContext>()

  if (service?.__typename !== 'Service') return null

  const loadBalancer = service.status?.loadBalancer
  const hasIngress = !!loadBalancer?.ingress && !isEmpty(loadBalancer.ingress)
  const ports = service.spec?.ports?.filter(isNonNullable) ?? []
  const hasPorts = !isEmpty(ports)

  return (
    <div css={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      {hasIngress && (
        <InfoSection title="Status">
          <PaddedCard>
            <PropWideBold title="IP">
              {loadBalancer?.ingress?.[0]?.ip}
            </PropWideBold>
          </PaddedCard>
        </InfoSection>
      )}
      <InfoSection title="Spec">
        <PaddedCard css={{ width: '70%' }}>
          <PropWideBold title="Type">{service.spec?.type}</PropWideBold>
          <PropWideBold title="Cluster IP">
            {service.spec?.clusterIp || '-'}
          </PropWideBold>
          {hasPorts && (
            <InfoSection
              title="Ports"
              headerSize={4}
              css={{
                marginTop: theme.spacing.medium,
              }}
            >
              {ports.map(({ name, protocol, port, targetPort }, i) => (
                <PropWideBold
                  key={i}
                  title={name || '-'}
                >
                  {protocol} {port} → {targetPort}
                </PropWideBold>
              ))}
            </InfoSection>
          )}
        </PaddedCard>
      </InfoSection>
    </div>
  )
}
