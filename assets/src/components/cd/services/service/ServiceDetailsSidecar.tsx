import { Link } from 'react-router-dom'
import {
  ServiceDeploymentDetailsFragment,
  ServiceDeploymentStatus,
  ServicePromotion,
} from 'generated/graphql'
import { CD_REL_PATH, CLUSTERS_REL_PATH } from 'routes/cdRoutesConsts'
import { InlineLink } from 'components/utils/typography/InlineLink'
import { useMemo } from 'react'
import {
  Chip,
  DryRunIcon,
  ErrorIcon,
  Sidecar,
  SidecarItem,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { ServiceStatusChip } from '../ServiceStatusChip'

import { countDeprecations } from './deprecationUtils'
import ServicePromote from './ServicePromote'
import ServiceKick from './ServiceKick'

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
  const { id, name, status, cluster, git, helm } = serviceDeployment

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
        <ServiceKick id={id} />
        {status === ServiceDeploymentStatus.Paused &&
          serviceDeployment.promotion === ServicePromotion.Ignore && (
            <ServicePromote id={id} />
          )}
      </div>
      <Sidecar>
        {name && <SidecarItem heading="Service name"> {name}</SidecarItem>}
        <SidecarItem heading="Status">
          <div
            css={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: theme.spacing.xsmall,
              alignItems: 'center',
            }}
          >
            <ServiceStatusChip status={status} />
            {!!serviceDeployment.dryRun && (
              <Chip severity="success">
                <DryRunIcon size={12} />
                Dry run
              </Chip>
            )}
          </div>
        </SidecarItem>
        <SidecarItem heading="Warnings">
          {deprecationCount > 0 ? (
            <Chip
              icon={<ErrorIcon />}
              severity="danger"
            >
              Deprecations
            </Chip>
          ) : (
            <Chip severity="success">None</Chip>
          )}
        </SidecarItem>
        {helm && <SidecarItem heading="Helm Chart">{helm.chart}</SidecarItem>}
        {helm && (
          <SidecarItem
            heading="Chart Version"
            css={{
              wordBreak: 'break-word',
            }}
          >
            {helm.version}
          </SidecarItem>
        )}
        {git && <SidecarItem heading="Git folder">{git.folder}</SidecarItem>}
        {git && (
          <SidecarItem
            heading="Git ref"
            css={{
              wordBreak: 'break-word',
            }}
          >
            {git.ref}
          </SidecarItem>
        )}
        {cluster?.name && (
          <SidecarItem heading="Cluster name">
            <InlineLink
              as={Link}
              to={`/${CD_REL_PATH}/${CLUSTERS_REL_PATH}/${cluster.id}`}
            >
              {cluster.name}
            </InlineLink>
          </SidecarItem>
        )}
      </Sidecar>
    </>
  )
}
