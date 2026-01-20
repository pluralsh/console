import {
  AppIcon,
  ArrowTopRightIcon,
  Button,
  Chip,
  DryRunIcon,
  Flex,
  GitHubLogoIcon,
  Sidecar,
  SidecarItem,
  WrapWithIf,
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
import { Link } from 'react-router-dom'
import {
  CD_REL_PATH,
  CLUSTERS_REL_PATH,
  getServiceDetailsPath,
} from 'routes/cdRoutesConsts'
import { useTheme } from 'styled-components'
import { getStacksAbsPath } from 'routes/stacksRoutesConsts'
import StackStatusIcon from 'components/stacks/common/StackStatusIcon'

import { ServiceStatusChip } from '../ServiceStatusChip'

import ServicePromote from './ServicePromote'
import { InlineA } from 'components/utils/typography/Text'

export function ServiceDetailsSidecar({
  serviceDeployment,
}: {
  serviceDeployment?: ServiceDeploymentDetailsFragment | null | undefined
}) {
  const theme = useTheme()
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
              clusterId: parent.cluster?.id,
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
            <WrapWithIf
              condition={!!repository.httpsPath}
              wrapper={<InlineA href={repository.httpsPath} />}
            >
              {repository.url}
            </WrapWithIf>
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
            {serviceDeployment.imports?.map((ref, i) => (
              <div
                key={ref?.stack?.id ?? i}
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
    </div>
  )
}
