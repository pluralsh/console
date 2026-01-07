import {
  Button,
  ButtonProps,
  CheckIcon,
  Chip,
  ErrorOutlineIcon,
  FailedFilledIcon,
  GitPullIcon,
  QueuedOutlineIcon,
  Sidecar,
  StackIcon,
} from '@pluralsh/design-system'
import { serviceStatusToSeverity } from 'components/cd/services/ServiceStatusChip'
import { SidecarSkeleton } from 'components/utils/SkeletonLoaders'
import { TRUNCATE } from 'components/utils/truncate'
import { BadgeLabelP, OverlineH3 } from 'components/utils/typography/Text'
import {
  InfraResearchFragment,
  ServiceDeploymentTinyFragment,
  StackMinimalFragment,
  StackStatus,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import { getStacksAbsPath } from 'routes/stacksRoutesConsts'
import { useTheme } from 'styled-components'
import { ActionItemSC } from '../../chatbot/actions-panel/ChatbotActionsPanel'

export function InfraResearchSidecar({
  infraResearch,
  loading,
}: {
  infraResearch: Nullable<InfraResearchFragment>
  loading: boolean
}) {
  const { spacing } = useTheme()
  const { stacks, services } = useMemo(() => {
    const stacks: StackMinimalFragment[] = []
    const services: ServiceDeploymentTinyFragment[] = []
    infraResearch?.associations?.forEach((assoc) => {
      if (assoc?.stack) stacks.push(assoc.stack)
      if (assoc?.service) services.push(assoc.service)
    })
    return { stacks, services }
  }, [infraResearch?.associations])
  const hasAssociations = !(isEmpty(stacks) && isEmpty(services))

  if (loading) return <SidecarSkeleton />
  if (!hasAssociations) return null

  return (
    <Sidecar
      css={{
        padding: `0 0 ${spacing.medium}px`,
        '& > p': { padding: `0 0 ${spacing.xsmall}px ${spacing.medium}px` },
      }}
    >
      <ActionItemSC
        css={{ borderBottom: 'none', paddingBottom: spacing.large }}
      >
        <OverlineH3 $color="text-xlight">Associated resources</OverlineH3>
      </ActionItemSC>
      <BadgeLabelP $color="text-light">Stacks</BadgeLabelP>
      {stacks.map(({ id, name, status }) => (
        <ResourceItem
          key={id}
          startIcon={<StackIcon />}
          endIcon={stackStatusToIcon(status)}
          to={getStacksAbsPath(id)}
          content={name}
        />
      ))}
      <div css={{ height: spacing.large }} />
      <BadgeLabelP $color="text-light">Services</BadgeLabelP>
      {services.map(({ id, name, status, cluster, componentStatus }) => (
        <ResourceItem
          key={id}
          startIcon={<GitPullIcon />}
          endIcon={
            <Chip
              size="small"
              severity={serviceStatusToSeverity(status)}
            >
              {componentStatus}
            </Chip>
          }
          to={getServiceDetailsPath({ serviceId: id, clusterId: cluster?.id })}
          content={name}
        />
      ))}
    </Sidecar>
  )
}

function ResourceItem({
  to,
  content,
  ...props
}: { to: string; content: string } & ButtonProps) {
  return (
    <Button
      small
      tertiary
      as={Link}
      to={to}
      innerFlexProps={{ flex: 1, minWidth: 0 }}
      {...props}
    >
      <span css={{ ...TRUNCATE }}>{content} </span>
    </Button>
  )
}

const stackStatusToIcon = (status: StackStatus) => {
  switch (status) {
    case StackStatus.Successful:
      return (
        <CheckIcon
          color="icon-success"
          size={12}
        />
      )
    case StackStatus.Failed:
      return (
        <ErrorOutlineIcon
          color="icon-danger"
          size={12}
        />
      )
    case StackStatus.Cancelled:
      return (
        <FailedFilledIcon
          color="icon-info"
          size={12}
        />
      )
    default:
      return (
        <QueuedOutlineIcon
          color="icon-light"
          size={12}
        />
      )
  }
}
