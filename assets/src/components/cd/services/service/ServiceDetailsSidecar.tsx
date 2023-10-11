import { Link } from 'react-router-dom'
import { ServiceDeploymentDetailsFragment } from 'generated/graphql'
import { CD_BASE_PATH, CLUSTERS_PATH } from 'routes/cdRoutes'
import { versionName } from 'components/apps/AppCard'
import { InlineLink } from 'components/utils/typography/InlineLink'

import { useMemo } from 'react'
import { Chip, ErrorIcon, Prop, PropsContainer } from '@pluralsh/design-system'

import { ServiceStatusChip } from '../ServiceStatusChip'

import { countDeprecations } from './countDeprecations'

export function ServiceDetailsSidecar({
  serviceDeployment,
}: {
  serviceDeployment?: ServiceDeploymentDetailsFragment | null | undefined
}) {
  const deprecationCount = useMemo(() => {
    const { components } = serviceDeployment || {}

    return components ? countDeprecations(components) : 0
  }, [serviceDeployment])

  if (!serviceDeployment) {
    return null
  }
  const { name, version, status, cluster, git } = serviceDeployment

  return (
    <PropsContainer>
      {name && <Prop title="Service name"> {name}</Prop>}
      {version && <Prop title="Current version">{versionName(version)}</Prop>}
      <Prop title="Status">
        <ServiceStatusChip status={status} />
      </Prop>
      <Prop title="Warnings">
        {deprecationCount > 0 ? (
          <Chip
            icon={<ErrorIcon />}
            severity="error"
          >
            Deprecations
          </Chip>
        ) : (
          <Chip severity="success">None</Chip>
        )}
      </Prop>
      <Prop title="Git folder">{git.folder}</Prop>
      <Prop title="Git ref">{git.ref}</Prop>
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
