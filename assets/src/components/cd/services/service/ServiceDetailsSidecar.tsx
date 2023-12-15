import { Link } from 'react-router-dom'
import {
  ServiceDeploymentDetailsFragment,
  ServiceDeploymentStatus,
} from 'generated/graphql'
import { CD_REL_PATH, CLUSTERS_REL_PATH } from 'routes/cdRoutesConsts'
import { toNiceVersion } from 'utils/semver'
import { InlineLink } from 'components/utils/typography/InlineLink'

import { useMemo } from 'react'
import { Chip, ErrorIcon, Prop, PropsContainer } from '@pluralsh/design-system'

import { ServiceStatusChip } from '../ServiceStatusChip'

import { countDeprecations } from './deprecationUtils'
import ServicePromote from './ServicePromote'
import { useTheme } from 'styled-components'

export function ServiceDetailsSidecar({
  serviceDeployment,
}: {
  serviceDeployment?: ServiceDeploymentDetailsFragment | null | undefined
}) {
  const theme = useTheme()
  const deprecationCount = useMemo(() => {
    const { components } = serviceDeployment || {}

    return components ? countDeprecations(components) : 0
  }, [serviceDeployment])

  if (!serviceDeployment) {
    return null
  }
  const { id, name, version, status, cluster, git, helm } = serviceDeployment

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          alignContent: 'center',
          margin: theme.spacing.small,
        }}
      >
        {status === ServiceDeploymentStatus.Paused && (
          <ServicePromote id={id} />
        )}
      </div>
      <PropsContainer>
        {name && <Prop title="Service name"> {name}</Prop>}
        {version && (
          <Prop title="Current version">{toNiceVersion(version)}</Prop>
        )}
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
    </>
  )
}
