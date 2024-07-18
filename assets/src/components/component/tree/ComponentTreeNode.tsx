import {
  ArrowTopRightIcon,
  Card,
  IconFrame,
  Modal,
  Tooltip,
} from '@pluralsh/design-system'
import { PipelineStageEdgeFragment } from 'generated/graphql'
import { ComponentProps, useState } from 'react'
import { type NodeProps, Position } from 'reactflow'
import styled, { useTheme } from 'styled-components'
import isEmpty from 'lodash/isEmpty'

import { useNodeEdges } from 'components/hooks/reactFlowHooks'
import { TreeNodeMeta } from 'components/component/tree/getTreeNodesAndEdges'
import { ComponentIcon } from 'components/apps/app/components/misc'
import { TRUNCATE } from 'components/utils/truncate'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { Link, useParams } from 'react-router-dom'

import {
  getCustomResourceDetailsAbsPath,
  getResourceDetailsAbsPath,
} from 'routes/kubernetesRoutesConsts'
import { CLUSTER_PARAM_ID } from 'routes/cdRoutesConsts'

import { RawYaml } from '../ComponentRaw'
import { NodeHandle } from '../../utils/reactflow/handles'

const ComponentTreeNodeSC = styled(Card)(({ theme }) => ({
  '&&': {
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
    padding: `${theme.spacing.xsmall}px ${theme.spacing.medium}px`,
    gap: theme.spacing.medium,
    width: 240,
  },
  '.content': {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'baseline',
    columnGap: theme.spacing.small,
    rowGap: theme.spacing.xxxsmall,
    flexShrink: 1,
    flexGrow: 1,
    overflow: 'hidden',
    '.name': {
      ...theme.partials.text.body2Bold,
      maxWidth: '100%',
      ...TRUNCATE,
      flexShrink: 1,
    },
    '.kind': {
      ...theme.partials.text.caption,
      maxWidth: '100%',
      ...TRUNCATE,
      color: theme.colors['text-xlight'],
      marginRight: theme.spacing.xsmall,
      flexShrink: 1,
      flexGrow: 1,
    },
  },
}))

export function ComponentTreeNode({
  id,
  data,
  ...props
}: NodeProps<TreeNodeMeta> & ComponentProps<typeof ComponentTreeNodeSC>) {
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
    <ComponentTreeNodeSC
      {...props}
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
      <NodeHandle
        type="target"
        isConnectable={false}
        $isConnected={!isEmpty(incomers)}
        $isOpen
        position={Position.Left}
      />
      <ComponentIcon
        kind={data.kind}
        size={16}
      />
      <div className="content">
        {name && (
          <p className="name">
            <Tooltip
              label={name}
              placement="bottom"
            >
              <span>{name}</span>
            </Tooltip>
          </p>
        )}
        {kind && (
          <p className="kind">
            <Tooltip label={kind}>
              <span>{kind}</span>
            </Tooltip>
          </p>
        )}
      </div>
      <IconFrame
        clickable
        forwardedAs={Link}
        replace
        to={dashboardUrl}
        icon={<ArrowTopRightIcon />}
        tooltip="View details on K8s dashboard"
        tooltipProps={{
          placement: 'right',
        }}
      />
      <NodeHandle
        type="source"
        isConnectable={false}
        $isConnected={!isEmpty(outgoers)}
        $isOpen
        position={Position.Right}
      />
      <ModalMountTransition open={open}>
        <DetailsModal {...{ open, data, onClose: () => setOpen(false) }} />
      </ModalMountTransition>
    </ComponentTreeNodeSC>
  )
}

function DetailsModal({
  data,
  ...props
}: ComponentProps<typeof Modal> & { data: TreeNodeMeta }) {
  const theme = useTheme()

  return (
    <Modal
      header={`${data?.metadata?.name} - Raw`}
      portal
      scrollable={false}
      width="auto"
      maxWidth={`min(1000px, 100vw - ${theme.spacing.xlarge * 2}px)`}
      {...props}
    >
      <RawYaml raw={data.raw} />
    </Modal>
  )
}

export type EdgeNode = NodeProps<PipelineStageEdgeFragment & TreeNodeMeta>
