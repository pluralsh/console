import { A, Flex } from 'honorable'
import { Link } from 'react-router-dom'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { filesize } from 'filesize'

import type { Maybe, Pod } from 'generated/graphql'
import { ReadinessT } from 'utils/status'

import { IconFrame, Tooltip, TrashCanIcon } from '@pluralsh/design-system'

import { Confirm } from 'components/utils/Confirm'
import { useMutation } from '@apollo/client'

import {
  ContainersReadyChip,
  GridTable,
  TABLE_HEIGHT,
  TableCaretLink,
  TableText,
  Usage,
} from '../TableElements'
import { DELETE_POD } from '../queries'

import { getPodContainersStats } from '../containers/getPodContainersStats'

import { getPodResources } from './getPodResources'

function DeletePod({ name, namespace, refetch }) {
  const [confirm, setConfirm] = useState(false)

  const [mutation, { loading }] = useMutation(DELETE_POD, {
    variables: { name, namespace },
    onCompleted: () => {
      setConfirm(false)
      refetch()
    },
  })

  return (
    <>
      <IconFrame
        clickable
        icon={<TrashCanIcon color="icon-danger" />}
        onClick={() => setConfirm(true)}
        textValue="Delete"
        tooltip
      />
      <Confirm
        close={() => setConfirm(false)}
        destructive
        label="Delete"
        loading={loading}
        open={confirm}
        submit={() => mutation()}
        title="Delete pod"
        text={`The pod "${name}"${
          namespace ? ` in namespace "${namespace}"` : ''
        } will be replaced by it's managing controller.`}
      />
    </>
  )
}

export type ContainerStatus = { name: string; readiness: ReadinessT }

type PodTableRow = {
  name?: string
  nodeName?: string
  namespace?: string
  memory: {
    used?: number
    total?: any
  }
  cpu: {
    used?: number
    total?: number
  }
  restarts?: number
  containers?: {
    ready?: number
    total?: number
    statuses?: ContainerStatus[]
  }
}
const columnHelper = createColumnHelper<PodTableRow>()

export const ColNameLink = columnHelper.accessor(row => row.name, {
  id: 'name-link',
  cell: ({ row: { original }, ...props }) => (
    <TableText>
      <Tooltip
        label={props.getValue()}
        placement="top-start"
      >
        <A
          inline
          display="inline"
          as={Link}
          to={`/pods/${original.namespace}/${original.name}`}
        >
          {props.getValue()}
        </A>
      </Tooltip>
    </TableText>
  ),
  header: 'Name',
})

export const ColName = columnHelper.accessor(row => row.name, {
  id: 'name',
  cell: props => (
    <TableText>
      <Tooltip
        label={props.getValue()}
        placement="top-start"
      >
        <span>{props.getValue()}</span>
      </Tooltip>
    </TableText>
  ),
  header: 'Name',
})

export const ColNodeName = columnHelper.accessor(pod => pod.nodeName, {
  id: 'nodeName',
  cell: ({ row: { original }, ...props }) => (
    <TableText>
      <Tooltip
        label={original.nodeName}
        placement="top-start"
      >
        <A
          inline
          as={Link}
          to={`/nodes/${original.nodeName}`}
          display="inline"
        >
          {props.getValue()}
        </A>
      </Tooltip>
    </TableText>
  ),
  header: 'Node name',
})

export const ColMemory = columnHelper.accessor(row => row.name, {
  id: 'memory',
  cell: ({ row: { original } }) => (
    <Usage
      used={
        original?.memory?.used === undefined
          ? undefined
          : filesize(original.memory.used ?? 0)
      }
      total={
        original.memory.total === undefined
          ? undefined
          : filesize(original.memory.total ?? 0)
      }
    />
  ),
  header: 'Memory',
})

export const ColCpu = columnHelper.accessor(row => row.name, {
  id: 'cpu',
  cell: ({ row: { original } }) => (
    <Usage
      used={original?.cpu?.used}
      total={original?.cpu?.total}
    />
  ),
  header: 'CPU',
})

export const ColRestarts = columnHelper.accessor(row => row.name, {
  id: 'restarts',
  cell: ({ row: { original } }) => <TableText>{original.restarts}</TableText>,
  header: 'Restarts',
})

export const ColContainers = columnHelper.accessor(row => row.name, {
  id: 'containers',
  cell: ({ row: { original } }) => (
    <ContainersReadyChip
      ready={original?.containers?.ready || 0}
      total={original?.containers?.total || 0}
      statuses={original?.containers?.statuses || []}
    />
  ),
  header: 'Containers',
})

export const ColActions = refetch => columnHelper.display({
  id: 'actions',
  cell: ({ row: { original } }: any) => (
    <Flex
      flexDirection="row"
      gap="xxsmall"
    >
      <DeletePod
        name={original.name}
        namespace={original.namespace}
        refetch={refetch}
      />
      <TableCaretLink
        to={`/pods/${original.namespace}/${original.name}`}
        textValue={`View node ${original?.name}`}
      />
    </Flex>
  ),
  header: '',
})

export const ColDelete = refetch => columnHelper.accessor(row => row.name, {
  id: 'delete',
  cell: ({ row: { original } }) => (
    <DeletePod
      name={original.name}
      namespace={original.namespace}
      refetch={refetch}
    />
  ),
  header: '',
})

type PodListProps = {
  pods?: Maybe<Pod>[] & Pod[]
  columns?: any[]
  truncColIndexes?: number[]
}

function getRestarts(status: Pod['status']) {
  return (status.containerStatuses || []).reduce((count, status) => count + ((status as any)?.restartCount || 0),
    0)
}

export function PodsList({
  pods,
  columns,
  truncColIndexes = [0],
}: PodListProps) {
  const tableData: PodTableRow[] = useMemo(() => (pods || [])
    .filter((pod): pod is Pod => !!pod)
    .map(pod => {
      const { containers } = pod.spec

      const { cpu: cpuRequests, memory: memoryRequests } = getPodResources(containers,
        'requests')
      const { cpu: cpuLimits, memory: memoryLimits } = getPodResources(containers,
        'limits')

      return {
        name: pod?.metadata?.name,
        nodeName: pod?.spec?.nodeName || undefined,
        namespace: pod?.metadata?.namespace || undefined,
        memory: {
          used: memoryRequests,
          total: memoryLimits,
          sortVal: (memoryRequests ?? 0) / (memoryLimits ?? Infinity),
        },
        cpu: {
          used: cpuRequests,
          total: cpuLimits,
          sortVal: (cpuRequests ?? 0) / (cpuLimits ?? Infinity),
        },
        restarts: getRestarts(pod.status),
        containers: getPodContainersStats(pod.status),
      }
    }),
  [pods])

  if (!pods || pods.length === 0) {
    return <>No pods available.</>
  }

  return (
    <GridTable
      data={tableData}
      columns={columns}
      enableColumnResizing
      $truncColIndexes={truncColIndexes}
      {...TABLE_HEIGHT}
    />
  )
}
