import {
  GitPullIcon,
  StackIcon,
  Tooltip,
  WorkbenchIcon,
  WrapWithIf,
} from '@pluralsh/design-system'
import { ClusterProviderIcon } from 'components/utils/Provider'
import { ClusterDistro } from 'generated/graphql'
import {
  ComponentPropsWithoutRef,
  ComponentType,
  forwardRef,
  ReactNode,
} from 'react'
import type { ExtraProps } from 'react-markdown'
import { Link } from 'react-router-dom'
import {
  getClusterDetailsPath,
  getServiceDetailsPath,
} from 'routes/cdRoutesConsts'
import { getStacksAbsPath } from 'routes/stacksRoutesConsts'
import styled from 'styled-components'
import { ChipAttrsByKind, MentionKind } from './mentionTypes'

// span-only so chips can safely render inside markdown <p> (as opposed to our DS chip)
type ChipBodyProps = {
  icon: ReactNode
  children: ReactNode
} & ComponentPropsWithoutRef<typeof ChipBodySC>

const ChipBody = forwardRef<HTMLSpanElement, ChipBodyProps>(function ChipBody(
  { icon, children, ...rest },
  ref
) {
  return (
    <ChipBodySC
      ref={ref}
      {...rest}
    >
      {icon}
      <span>{children}</span>
    </ChipBodySC>
  )
})

// react-markdown picks the component by tag name and spreads only the XML
// attributes — so `kind` isn't on the rendered props (it's the tag itself)
// `node` and `children` come from react-markdown.
type RenderedChipProps<K extends MentionKind> = Omit<
  ChipAttrsByKind[K],
  'kind'
> &
  ExtraProps & { children?: ReactNode }

function PlrlClusterChip(props: RenderedChipProps<MentionKind.Cluster>) {
  const id = props['item-id']
  const name = props['item-name'] || id
  const icon = (
    <ClusterProviderIcon
      cluster={{
        distro: (props.distro as ClusterDistro | undefined) ?? null,
        provider: { cloud: props.provider ?? null },
      }}
      size={12}
    />
  )
  return (
    <WrapWithIf
      condition={!!id}
      wrapper={<ChipLinkSC to={getClusterDetailsPath({ clusterId: id })} />}
    >
      <ChipBody icon={icon}>{name}</ChipBody>
    </WrapWithIf>
  )
}

function PlrlServiceChip(props: RenderedChipProps<MentionKind.Service>) {
  const id = props['item-id']
  const clusterId = props['cluster-id']
  const name = props['item-name'] || id
  const icon = <GitPullIcon size={12} />
  return (
    <WrapWithIf
      condition={!!id && !!clusterId}
      wrapper={
        <ChipLinkSC to={getServiceDetailsPath({ serviceId: id, clusterId })} />
      }
    >
      <ChipBody icon={icon}>{name}</ChipBody>
    </WrapWithIf>
  )
}

function PlrlStackChip(props: RenderedChipProps<MentionKind.Stack>) {
  const id = props['item-id']
  const name = props['item-name'] || id
  const icon = <StackIcon size={12} />
  return (
    <WrapWithIf
      condition={!!id}
      wrapper={<ChipLinkSC to={getStacksAbsPath(id)} />}
    >
      <ChipBody icon={icon}>{name}</ChipBody>
    </WrapWithIf>
  )
}

function PlrlSkillChip(props: RenderedChipProps<MentionKind.Skill>) {
  const name = props['item-name']
  const description = props.description

  return (
    <WrapWithIf
      condition={!!description}
      wrapper={
        <Tooltip
          label={description}
          placement="top"
          style={{ maxWidth: 500, overflowWrap: 'break-word' }}
        />
      }
    >
      <ChipBody icon={<WorkbenchIcon size={12} />}>{name}</ChipBody>
    </WrapWithIf>
  )
}

export const plrlChipComponents = {
  [MentionKind.Cluster]: PlrlClusterChip,
  [MentionKind.Service]: PlrlServiceChip,
  [MentionKind.Stack]: PlrlStackChip,
  [MentionKind.Skill]: PlrlSkillChip,
} satisfies {
  [K in MentionKind]: ComponentType<RenderedChipProps<K>>
}

const ChipBodySC = styled.span(({ theme }) => ({
  ...theme.partials.text.body2,
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing.xxsmall,
  verticalAlign: 'middle',
  padding: `${theme.spacing.xxxsmall}px ${theme.spacing.xsmall}px`,
  fontSize: 12,
  lineHeight: '16px',
  color: theme.colors.text,
  border: theme.borders['fill-three'],
  borderRadius: theme.borderRadiuses.medium,
  background: theme.colors['fill-two'],
  transition: 'background 0.1s ease-in-out',
  margin: 1,
}))

const ChipLinkSC = styled(Link)(({ theme }) => ({
  textDecoration: 'none',
  '&:hover > *': { background: theme.colors['fill-two-hover'] },
}))
