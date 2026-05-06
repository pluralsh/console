import {
  Chip,
  DeploymentIcon,
  StackIcon,
  Tooltip,
  WorkbenchIcon,
} from '@pluralsh/design-system'
import { ClusterProviderIcon } from 'components/utils/Provider'
import { ClusterDistro } from 'generated/graphql'
import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  getClusterDetailsPath,
  getServiceDetailsPath,
} from 'routes/cdRoutesConsts'
import { getStacksAbsPath } from 'routes/stacksRoutesConsts'
import styled from 'styled-components'

type PlrlAttrs = Record<string, string | undefined>

function ChipBody({
  icon,
  children,
}: {
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <Chip
      size="small"
      fillLevel={2}
      css={{ verticalAlign: 'middle', display: 'inline-flex' }}
    >
      <ChipInnerSC>
        {icon}
        <span>{children}</span>
      </ChipInnerSC>
    </Chip>
  )
}

function ChipLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <ChipLinkSC
      to={to}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </ChipLinkSC>
  )
}

export function PlrlClusterChip(props: PlrlAttrs) {
  const id = props.id ?? ''
  const name = props.name ?? id
  const icon = (
    <ClusterProviderIcon
      cluster={{
        distro: (props.distro as ClusterDistro | undefined) ?? null,
        provider: { cloud: props.provider ?? null },
      }}
      size={12}
    />
  )
  if (!id) return <ChipBody icon={icon}>{name}</ChipBody>
  return (
    <ChipLink to={getClusterDetailsPath({ clusterId: id })}>
      <ChipBody icon={icon}>{name}</ChipBody>
    </ChipLink>
  )
}

export function PlrlServiceChip(props: PlrlAttrs) {
  const id = props.id ?? ''
  const clusterId = props['cluster-id'] ?? ''
  const name = props.name ?? id
  if (!id || !clusterId)
    return <ChipBody icon={<DeploymentIcon size={12} />}>{name}</ChipBody>
  return (
    <ChipLink to={getServiceDetailsPath({ serviceId: id, clusterId })}>
      <ChipBody icon={<DeploymentIcon size={12} />}>{name}</ChipBody>
    </ChipLink>
  )
}

export function PlrlStackChip(props: PlrlAttrs) {
  const id = props.id ?? ''
  const name = props.name ?? id
  if (!id) return <ChipBody icon={<StackIcon size={12} />}>{name}</ChipBody>
  return (
    <ChipLink to={getStacksAbsPath(id)}>
      <ChipBody icon={<StackIcon size={12} />}>{name}</ChipBody>
    </ChipLink>
  )
}

export function PlrlSkillChip(props: PlrlAttrs) {
  const name = props.name ?? ''
  const description = props.description
  const chip = <ChipBody icon={<WorkbenchIcon size={12} />}>{name}</ChipBody>
  if (!description) return chip
  return (
    <Tooltip
      label={description}
      placement="top"
    >
      {chip}
    </Tooltip>
  )
}

export const PLRL_CHIP_TAGS = [
  'plrl-cluster',
  'plrl-service',
  'plrl-stack',
  'plrl-skill',
] as const

export const plrlChipComponents = {
  'plrl-cluster': PlrlClusterChip,
  'plrl-service': PlrlServiceChip,
  'plrl-stack': PlrlStackChip,
  'plrl-skill': PlrlSkillChip,
} as const

const ChipInnerSC = styled.span(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing.xxsmall,
}))

const ChipLinkSC = styled(Link)(({ theme }) => ({
  textDecoration: 'none',
  '&:hover': {
    filter: `drop-shadow(0 0 2px ${theme.colors['border-fill-three']})`,
  },
}))
