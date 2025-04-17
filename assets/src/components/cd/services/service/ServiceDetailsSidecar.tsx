import {
  AppIcon,
  ArrowTopRightIcon,
  Button,
  Chip,
  DryRunIcon,
  ErrorIcon,
  Flex,
  GitHubLogoIcon,
  Sidecar,
  SidecarItem,
} from '@pluralsh/design-system'

import KickButton from 'components/utils/KickButton'

import { getProviderIconUrl } from 'components/utils/Provider'
import { InlineLink } from 'components/utils/typography/InlineLink'
import {
  ServiceDeploymentDetailsFragment,
  ServiceDeploymentStatus,
  ServicePromotion,
  useKickServiceMutation,
} from 'generated/graphql'
import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  CD_REL_PATH,
  CLUSTERS_REL_PATH,
  getServiceDetailsPath,
} from 'routes/cdRoutesConsts'
import { useTheme } from 'styled-components'
import { getStacksAbsPath } from '../../../../routes/stacksRoutesConsts.tsx'
import StackStatusIcon from '../../../stacks/common/StackStatusIcon.tsx'

import { ServiceStatusChip } from '../ServiceStatusChip'

import { countDeprecations } from './deprecationUtils'
import ServicePromote from './ServicePromote'
import LogsLegend from 'components/cd/logs/LogsLegend.tsx'

export function ServiceDetailsSidecar({
  serviceDeployment,
}: {
  serviceDeployment?: ServiceDeploymentDetailsFragment | null | undefined
}) {
  const { pathname } = useLocation()
  const theme = useTheme()
  const deprecationCount = useMemo(() => {
    const { components } = serviceDeployment || {}

    return components ? countDeprecations(components) : 0
  }, [serviceDeployment])

  if (!serviceDeployment) {
    return null
  }
  const {
    id,
    name,
    status,
    cluster,
    git,
    helm,
    namespace,
    repository,
    helmRepository,
    parent,
  } = serviceDeployment

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        paddingBottom: theme.spacing.medium,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.small,
        }}
      >
        {status === ServiceDeploymentStatus.Paused &&
          serviceDeployment.promotion === ServicePromotion.Ignore && (
            <ServicePromote id={id} />
          )}
        <KickButton
          secondary
          pulledAt={repository?.pulledAt}
          kickMutationHook={useKickServiceMutation}
          message="Resync service"
          tooltipMessage="Use this to sync this service now instead of at the next poll interval"
          variables={{ id }}
          width="100%"
        />
      </div>
      {parent && (
        <Sidecar>
          <SidecarItem heading="Parent service">{parent.name}</SidecarItem>
          <Button
            marginTop={theme.spacing.large}
            secondary
            as={Link}
            to={getServiceDetailsPath({
              clusterId: cluster?.id,
              serviceId: parent.id,
            })}
            endIcon={<ArrowTopRightIcon />}
          >
            Go to parent
          </Button>
        </Sidecar>
      )}
      <Sidecar>
        {name && <SidecarItem heading="Service name"> {name}</SidecarItem>}
        {namespace && (
          <SidecarItem heading="Service namespace"> {namespace}</SidecarItem>
        )}
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
        {helmRepository && (
          <SidecarItem heading="Helm Repository">
            <div
              css={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xsmall,
              }}
            >
              <AppIcon
                spacing="padding"
                size="xxsmall"
                icon={helm ? undefined : <GitHubLogoIcon />}
                url={helm ? getProviderIconUrl('byok', theme.mode) : undefined}
              />
              {helmRepository.spec.url}
            </div>
          </SidecarItem>
        )}
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
        {repository && (
          <SidecarItem
            heading={
              <Flex
                align="center"
                gap="xsmall"
              >
                Git repository
                <GitHubLogoIcon size={12} />
              </Flex>
            }
          >
            <div
              css={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xsmall,
              }}
            >
              {repository.url}
            </div>
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
        {(serviceDeployment?.imports?.length ?? 0) > 0 && (
          <SidecarItem heading="Imported stacks">
            {serviceDeployment.imports?.map((ref) => (
              <div
                css={{
                  display: 'flex',
                  gap: theme.spacing.xsmall,
                  alignItems: 'center',
                }}
              >
                <StackStatusIcon status={ref?.stack?.status} />
                <InlineLink
                  as={Link}
                  to={getStacksAbsPath(ref?.stack?.id)}
                >
                  {ref?.stack?.name}
                </InlineLink>
              </div>
            ))}
          </SidecarItem>
        )}
      </Sidecar>
      {pathname.includes('logs') && <LogsLegend />}
    </div>
  )
}
