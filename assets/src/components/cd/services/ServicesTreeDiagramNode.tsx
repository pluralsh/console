import { NodeProps } from 'reactflow'
import { useTheme } from 'styled-components'
import {
  ArrowTopRightIcon,
  ChipList,
  FolderIcon,
  GlobeIcon,
  IconFrame,
} from '@pluralsh/design-system'
import React from 'react'

import { useNavigate } from 'react-router-dom'

import {
  GlobalServiceFragment,
  ServiceTreeNodeFragment,
} from '../../../generated/graphql'
import { NodeBase } from '../../utils/reactflow/nodes'
import { getGlobalServiceDetailsPath } from '../../../routes/cdRoutesConsts'

export const ServiceNodeType = 'plural-services-tree-service-node'
export const GlobalServiceNodeType = 'plural-services-tree-global-service-node'

export const nodeTypes = {
  [ServiceNodeType]: ServicesTreeDiagramServiceNode,
  [GlobalServiceNodeType]: ServicesTreeDiagramGlobalServiceNode,
}

export function ServicesTreeDiagramServiceNode(
  props: NodeProps<ServiceTreeNodeFragment>
) {
  const theme = useTheme()
  const { data } = props

  return (
    <NodeBase
      {...props}
      gap={0}
      padding={0}
      width={336}
    >
      <div
        css={{
          ...theme.partials.text.caption,
          backgroundColor: theme.colors['fill-zero'],
          color: theme.colors['text-xlight'],
          padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
        }}
      >
        {data.repository?.url}
      </div>
      <div
        css={{
          backgroundColor: theme.colors['fill-one'],
          display: 'flex',
          flexDirection: 'column',
          padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
        }}
      >
        <div>{data.name}</div>
        <div>{data.cluster?.name}</div>
      </div>
    </NodeBase>
  )
}

// TODO: Truncate.
export function ServicesTreeDiagramGlobalServiceNode(
  props: NodeProps<GlobalServiceFragment>
) {
  const theme = useTheme()
  const navigate = useNavigate()
  const { data } = props

  return (
    <NodeBase
      {...props}
      gap={0}
      padding={0}
      width={336}
    >
      <div
        css={{
          ...theme.partials.text.caption,
          justifyContent: 'space-between',
          display: 'flex',
          backgroundColor: theme.colors['fill-zero'],
          borderBottom: '1px solid',
          borderColor:
            theme.mode === 'light'
              ? theme.colors['border-fill-two']
              : theme.colors.border,
          color: theme.colors['text-xlight'],
          padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
        }}
      >
        <div
          css={{
            display: 'flex',
            gap: theme.spacing.xsmall,
          }}
        >
          <GlobeIcon />
          Global Service
        </div>
        {data.project && (
          <div
            css={{
              display: 'flex',
              gap: theme.spacing.xsmall,
            }}
          >
            <FolderIcon />
            {data.project.name}
          </div>
        )}
      </div>
      <div
        css={{
          display: 'flex',
          backgroundColor: theme.colors['fill-one'],
          padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
        }}
      >
        <div css={{ flex: 1 }}>
          <div css={{ ...theme.partials.text.body2Bold }}>{data.name}</div>
          <div
            css={{
              ...theme.partials.text.caption,
              color: theme.colors['text-xlight'],
            }}
          >
            {data?.distro ? `${data.distro} distribution` : 'All distributions'}
          </div>
          {data.tags && (
            <div css={{ marginTop: theme.spacing.small }}>
              <ChipList
                limit={6}
                size="small"
                values={data.tags}
                transformValue={(tag) => `${tag?.name}: ${tag?.value}`}
                emptyState={null}
              />
            </div>
          )}
        </div>
        <IconFrame
          clickable
          onClick={() =>
            navigate(
              getGlobalServiceDetailsPath({
                serviceId: data.id,
              })
            )
          }
          icon={<ArrowTopRightIcon />}
          type="secondary"
        />
      </div>
    </NodeBase>
  )
}
