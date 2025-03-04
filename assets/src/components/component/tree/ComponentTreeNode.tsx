import {
  ArrowTopRightIcon,
  IconFrame,
  Modal,
  Tooltip,
} from '@pluralsh/design-system'
import { ComponentProps, useState } from 'react'
import { type NodeProps, Position, type Node } from '@xyflow/react'
import { useTheme } from 'styled-components'
import isEmpty from 'lodash/isEmpty'

import { useNodeEdges } from 'components/hooks/reactFlowHooks'
import { TreeNodeMeta } from 'components/component/tree/getTreeNodesAndEdges'
import { TRUNCATE } from 'components/utils/truncate'

import { Link, useParams } from 'react-router-dom'

import {
  getCustomResourceDetailsAbsPath,
  getResourceDetailsAbsPath,
} from 'routes/kubernetesRoutesConsts'
import { CLUSTER_PARAM_ID } from 'routes/cdRoutesConsts'

import { RawYaml } from '../ComponentRaw'
import { NodeBaseCardSC, NodeHandleSC } from '../../utils/reactflow/nodes'
import { ComponentIcon } from '../../cd/services/service/component/misc.tsx'

type ComponentNode = Node<TreeNodeMeta>

export function ComponentTreeNode({
  id,
  data,
}: NodeProps<ComponentNode> & ComponentProps<typeof NodeBaseCardSC>) {
  const theme = useTheme()
  const clusterId = useParams()[CLUSTER_PARAM_ID]
  const [open, setOpen] = useState(false)
  const { incomers, outgoers } = useNodeEdges(id)
  const kind = data?.kind?.toLowerCase()
  const clickable = !!data?.raw

  const { name, namespace } = data?.metadata ?? {
    name: undefined,
    namespace: undefined,
  }

  const dashboardUrl =
    kind === 'certificate'
      ? getCustomResourceDetailsAbsPath(
          clusterId,
          'certificates.cert-manager.io',
          name,
          namespace
        )
      : getResourceDetailsAbsPath(clusterId, kind, name, namespace)

  return (
    <NodeBaseCardSC
      id={id}
      css={{
        alignItems: 'center',
        overflow: 'hidden',
        padding: `${theme.spacing.xsmall}px ${theme.spacing.medium}px`,
        gap: theme.spacing.medium,
        width: 240,
        '&:hover': {
          backgroundColor:
            theme.mode === 'light'
              ? theme.colors['fill-two-hover']
              : theme.colors['fill-zero-hover'],
        },
      }}
      clickable={clickable}
      onClick={
        !clickable
          ? undefined
          : (e) => {
              e.preventDefault()
              setOpen(true)
            }
      }
    >
      <NodeHandleSC
        type="target"
        isConnectable={false}
        $isConnected={!isEmpty(incomers)}
        position={Position.Left}
      />
      <ComponentIcon
        kind={data.kind}
        size={16}
      />
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'baseline',
          columnGap: theme.spacing.small,
          rowGap: theme.spacing.xxxsmall,
          flexShrink: 1,
          flexGrow: 1,
          overflow: 'hidden',
        }}
      >
        {name && (
          <p
            css={{
              ...theme.partials.text.body2Bold,
              ...TRUNCATE,
              maxWidth: '100%',
              flexShrink: 1,
            }}
          >
            <Tooltip
              label={name}
              placement="bottom"
            >
              <span>{name}</span>
            </Tooltip>
          </p>
        )}
        {kind && (
          <p
            css={{
              ...theme.partials.text.caption,
              maxWidth: '100%',
              ...TRUNCATE,
              color: theme.colors['text-xlight'],
              marginRight: theme.spacing.xsmall,
              flexShrink: 1,
              flexGrow: 1,
            }}
          >
            <Tooltip label={kind}>
              <span>{kind}</span>
            </Tooltip>
          </p>
        )}
      </div>
      <IconFrame
        clickable
        as={Link}
        replace
        to={dashboardUrl}
        icon={<ArrowTopRightIcon />}
        tooltip="View details on K8s dashboard"
        tooltipProps={{
          placement: 'right',
        }}
      />
      <NodeHandleSC
        type="source"
        isConnectable={false}
        $isConnected={!isEmpty(outgoers)}
        position={Position.Right}
      />
      <DetailsModal {...{ open, data, onClose: () => setOpen(false) }} />
    </NodeBaseCardSC>
  )
}

function DetailsModal({
  data,
  ...props
}: ComponentProps<typeof Modal> & { data: TreeNodeMeta }) {
  return (
    <Modal
      header={`${data?.metadata?.name} - Raw`}
      scrollable={false}
      size="auto"
      {...props}
    >
      <RawYaml raw={data.raw} />
    </Modal>
  )
}
