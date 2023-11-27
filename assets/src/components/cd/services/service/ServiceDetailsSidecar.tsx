import { Link } from 'react-router-dom'
import { ServiceDeploymentDetailsFragment } from 'generated/graphql'
import { CD_REL_PATH, CLUSTERS_REL_PATH } from 'routes/cdRoutesConsts'
import { toNiceVersion } from 'utils/semver'
import { InlineLink } from 'components/utils/typography/InlineLink'

import { useMemo } from 'react'
import { Chip, ErrorIcon, Prop, PropsContainer } from '@pluralsh/design-system'

import { ServiceStatusChip } from '../ServiceStatusChip'

import { countDeprecations } from './deprecationUtils'

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
  const { name, version, status, cluster, git, helm } = serviceDeployment

  return (
    <PropsContainer>
      {name && <Prop title="Service name"> {name}</Prop>}
      {version && <Prop title="Current version">{toNiceVersion(version)}</Prop>}
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
      {helm && <Prop title="Helm Chart">{helm.chart}</Prop>}
      {helm && (
        <Prop
          title="Chart Version"
          css={{
            wordBreak: 'break-word',
          }}
        >
          {helm.version}
        </Prop>
      )}
      {git && <Prop title="Git folder">{git.folder}</Prop>}
      {git && (
        <Prop
          title="Git ref"
          css={{
            wordBreak: 'break-word',
          }}
        >
          {git.ref}
        </Prop>
      )}
      {cluster?.name && (
        <Prop title="Cluster name">
          <InlineLink
            as={Link}
            to={`/${CD_REL_PATH}/${CLUSTERS_REL_PATH}/${cluster.id}`}
          >
            {cluster.name}
          </InlineLink>
        </Prop>
      )}
    </PropsContainer>
  )
}
