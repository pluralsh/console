import { useState } from 'react'
import {
  Button,
  CheckRoundedIcon,
  IconFrame,
  Table,
} from '@pluralsh/design-system'
import isEmpty from 'lodash/isEmpty'
import { createColumnHelper } from '@tanstack/react-table'

import { ClusterFragment, NodePool } from 'generated/graphql'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { LabelsModal } from './ClusterNodePoolLabels'
import { TaintsModal } from './ClusterNodePoolTaints'

export function NodePoolsSection({ cluster }: { cluster: ClusterFragment }) {
  if (cluster.self || isEmpty(cluster.nodePools)) {
    return null
  }

  return (
    <Table
      data={cluster.nodePools || []}
      columns={columns}
      css={{
        maxHeight: 'unset',
        height: '100%',
      }}
    />
  )
}
const columnHelper = createColumnHelper<NodePool>()

export const columns = [
  columnHelper.accessor((nodePool) => nodePool?.name, {
    id: 'name',
    header: 'Name',
    enableSorting: true,
    enableGlobalFilter: true,
    meta: { truncate: true },
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((nodePool) => nodePool?.minSize, {
    id: 'minSize',
    header: 'Minimum size',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((nodePool) => nodePool?.maxSize, {
    id: 'maxSize',
    header: 'Maximum size',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((nodePool) => nodePool?.instanceType, {
    id: 'instanceType',
    header: 'Instance type',
    enableSorting: true,
    enableGlobalFilter: true,
    meta: { truncate: true },
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((nodePool) => nodePool?.spot, {
    id: 'spot',
    header: 'Spot',
    cell: ({ getValue }) =>
      getValue() && (
        <IconFrame
          icon={<CheckRoundedIcon color="icon-success" />}
          type="floating"
        />
      ),
  }),
  columnHelper.accessor((nodePool) => nodePool?.labels, {
    id: 'labels',
    header: 'Labels',
    cell: function Cell({ row: { original }, getValue }) {
      const [open, setOpen] = useState(false)
      const labels = getValue()

      const labelsArray = Object.entries(labels || {})

      if (isEmpty(labelsArray)) {
        return null
      }

      return (
        <>
          <Button
            floating
            small
            onClick={() => {
              setOpen(true)
            }}
          >
            View labels
          </Button>
          <ModalMountTransition open={open}>
            <LabelsModal
              open={open}
              onClose={() => {
                setOpen(false)
              }}
              poolName={original.name}
              labels={labelsArray}
            />
          </ModalMountTransition>
        </>
      )
    },
  }),
  columnHelper.accessor((nodePool) => nodePool?.taints, {
    id: 'taints',
    header: 'Taints',
    cell: function Cell({ row: { original }, getValue }) {
      const [open, setOpen] = useState(false)
      const taints = getValue()

      if (isEmpty(taints)) {
        return null
      }

      return (
        <>
          <Button
            floating
            small
            onClick={() => {
              setOpen(true)
            }}
          >
            View taints
          </Button>
          <ModalMountTransition open={open}>
            <TaintsModal
              open={open}
              onClose={() => {
                setOpen(false)
              }}
              poolName={original.name}
              taints={taints}
            />
          </ModalMountTransition>
        </>
      )
    },
  }),
]
