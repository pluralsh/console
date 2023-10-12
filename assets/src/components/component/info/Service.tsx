import isEmpty from 'lodash/isEmpty'
import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'

import {
  InfoSectionH2,
  InfoSectionH4,
  PaddedCard,
  PropWideBold,
} from './common'

export default function Service() {
  const theme = useTheme()
  const { data } = useOutletContext<any>()

  if (!data?.service) return null

  const { service } = data
  const loadBalancer = service.status?.loadBalancer
  const hasIngress = !!loadBalancer?.ingress && !isEmpty(loadBalancer.ingress)
  const ports = service.spec?.ports || []
  const hasPorts = !isEmpty(ports)

  return (
    <div css={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      {hasIngress && (
        <>
          <InfoSectionH2 css={{ marginBottom: theme.spacing.medium }}>
            Status
          </InfoSectionH2>
          <PaddedCard>
            <PropWideBold title="IP">{loadBalancer.ingress[0].ip}</PropWideBold>
          </PaddedCard>
        </>
      )}
      <InfoSectionH2
        css={{
          marginBottom: theme.spacing.medium,
          marginTop: hasIngress ? theme.spacing.large : 0,
        }}
      >
        Spec
      </InfoSectionH2>
      <PaddedCard>
        <PropWideBold title="Type">{service.spec?.type}</PropWideBold>
        <PropWideBold title="Cluster IP">
          {service.spec?.clusterIp || '-'}
        </PropWideBold>
        {hasPorts && (
          <>
            <InfoSectionH4
              css={{
                marginBottom: theme.spacing.medium,
                marginTop: theme.spacing.xlarge,
              }}
            >
              Ports
            </InfoSectionH4>
            {ports.map(({ name, protocol, port, targetPort }, i) => (
              <PropWideBold
                key={i}
                gap="small"
                title={name || '-'}
              >
                <span>{protocol}</span>
                <span>
                  {port} {'->'} {targetPort}
                </span>
              </PropWideBold>
            ))}
          </>
        )}
      </PaddedCard>
    </div>
  )
}
