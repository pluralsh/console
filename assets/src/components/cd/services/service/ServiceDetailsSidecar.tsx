import { Link } from 'react-router-dom'
import { PropsContainer } from 'components/utils/PropsContainer'
import Prop from 'components/utils/Prop'
import { ServiceDeploymentDetailsFragment } from 'generated/graphql'
import { CD_BASE_PATH, CLUSTERS_PATH } from 'routes/cdRoutes'
import { versionName } from 'components/apps/AppCard'
import { InlineLink } from 'components/utils/typography/InlineLink'

import { ServiceStatusChip } from '../ServiceStatusChip'

export function ServiceDetailsSidecar({
  serviceDeployment,
}: {
  serviceDeployment?: ServiceDeploymentDetailsFragment | null | undefined
}) {
  if (!serviceDeployment) {
    return null
  }
  const { name, version, status, cluster } = serviceDeployment

  return (
    <PropsContainer>
      {name && <Prop title="Service name"> {name}</Prop>}
      {version && <Prop title="Current version">{versionName(version)}</Prop>}
      <Prop title="App status">
        <ServiceStatusChip status={status} />
      </Prop>
      {cluster?.name && (
        <Prop title="Cluster name">
          <InlineLink
            as={Link}
            to={`/${CD_BASE_PATH}/${CLUSTERS_PATH}/${cluster.id}`}
          >
            {cluster.name}
          </InlineLink>
        </Prop>
      )}
    </PropsContainer>
  )
}
