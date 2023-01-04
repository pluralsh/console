import { Chip } from '@pluralsh/design-system'
import type { Maybe, Pod } from 'generated/graphql'

import { createColumnHelper } from '@tanstack/react-table'
import { UnstyledLink } from 'components/utils/Link'
import { useMemo } from 'react'

import { filesize } from 'filesize'

import { containerStatusToReadiness } from 'utils/status'

import styled from 'styled-components'

import {
  NTable,
  TableCaretLink,
  TableText,
  Usage,
} from '../nodes/TableElements'

import { podResources } from './Pod'

type PodTableRow = {
  name?: string
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
    running?: number
    total?: number
  }
}
const columnHelper = createColumnHelper<PodTableRow>()

const columns = [
  columnHelper.accessor(row => row.name, {
    id: 'name',
    cell: ({ row: { original }, ...props }) => (
      <UnstyledLink
        to={`/pods/${original.namespace}/${original.name}`}
        $extendStyle={undefined}
      >
        <TableText>{props.getValue()}</TableText>
      </UnstyledLink>
    ),
    header: 'Name',
    maxSize: 30,
    enableResizing: true,
  }),
  columnHelper.accessor(row => row.name, {
    id: 'memory',
    cell: ({ row: { original } }) => (
      <Usage
        used={
          original?.memory?.used === undefined
            ? undefined
            : filesize(original.memory.used)
        }
        total={
          original.memory.total === undefined
            ? undefined
            : filesize(original.memory.total)
        }
      />
    ),
    header: 'Memory',
    maxSize: 30,
    enableResizing: true,
  }),
  columnHelper.accessor(row => row.name, {
    id: 'cpu',
    cell: ({ row: { original } }) => (
      <Usage
        used={original?.cpu?.used}
        total={original?.cpu?.total}
      />
    ),
    header: 'CPU',
    maxSize: 30,
    enableResizing: true,
  }),
  columnHelper.accessor(row => row.name, {
    id: 'restarts',
    cell: ({ row: { original } }) => <TableText>{original.restarts}</TableText>,
    header: 'Restarts',
    maxSize: 30,
    enableResizing: true,
  }),
  columnHelper.accessor(row => row.name, {
    id: 'containers',
    cell: ({ row: { original } }) => (
      <Chip
        size="medium"
        severity={
          !original?.containers?.running
            ? 'critical'
            : !original.containers.total
              || original?.containers?.running < original?.containers?.total
              ? 'warning'
              : undefined
        }
      >
        {`${original?.containers?.running}/${original?.containers?.total} running`}
      </Chip>
    ),
    header: 'Containers',
    maxSize: 30,
    enableResizing: true,
  }),
  columnHelper.display({
    id: 'link',
    cell: ({ row: { original } }: any) => (
      <TableCaretLink
        to={`/pods/${original.namespace}/${original.name}`}
        textValue={`View node ${original?.name}`}
      />
    ),
    header: '',
  }),
]

type PodListProps = {
  pods?: Maybe<Pod>[] & Pod[]
  namespace?: any
  refetch?: any
}

function getRestarts(status: Pod['status']) {
  return (status.containerStatuses || []).reduce((count, status) => count + ((status as any)?.restartCount || 0),
    0)
}

function getAllStatuses({
  containerStatuses,
  initContainerStatuses,
}: Pod['status']) {
  return [...(initContainerStatuses || []), ...(containerStatuses || [])]
}

function getRunningStats(status: Pod['status']) {
  const allStatuses = getAllStatuses(status)

  const runningCount = allStatuses.reduce((prev, status) => {
    if (!status) {
      return prev
    }
    const readiness = containerStatusToReadiness(status)

    console.log('prev', prev)

    return {
      running: prev.running + (readiness === 'Ready' ? 1 : 0),
      total: prev.total + 1,
    }
  },
  { running: 0, total: 0 })

  return runningCount
}

const PodsTable = styled(NTable)(_ => ({
  table: {
    gridTemplateColumns: 'minmax(100px, 1fr) auto auto auto auto auto',
  },
  'td:nth-child(1)': {
    '*': {
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
  },
}))

export function PodList({ pods, namespace: _namespace, refetch }: PodListProps) {
  const tableData: PodTableRow[] = useMemo(() => (pods || [])
    .filter((pod):pod is Pod => !!pod)
    .map(pod => {
      const { containers } = pod.spec
      const containersRunning = getRunningStats(pod.status)

      console.log('containersRunning', containersRunning)
      const { cpu: cpuReq, memory: memoryReq } = podResources(containers as any,
        'requests')
      const { cpu: cpuLim, memory: memoryLim } = podResources(containers as any,
        'limits')
          // const labelsMap = mapify(pod.metadata.labels)

      return {
        name: pod?.metadata?.name,
        namespace: pod?.metadata?.namespace || undefined,
        memory: {
          used: memoryReq,
          total: memoryLim,
        },
        cpu: {
          used: cpuReq,
          total: cpuLim,
        },
        restarts: getRestarts(pod.status),
        containers: containersRunning,
      }
    }),
  [pods])

  return (
    <>
      <PodsTable
        data={tableData}
        columns={columns}
        enableColumnResizing
        maxHeight="calc(100vh - 500px)"
      />
      {/* <Box
        flex={false}
        pad="small"
      >
        <Box pad={{ vertical: 'small' }}>
          <Text size="small">Pods</Text>
        </Box>
        <PodHeader />
        {pods.map((pod, ind) => (
          <PodRow
            key={ind}
            pod={pod}
            namespace={namespace}
            refetch={refetch}
          />
        ))}
      </Box> */}
    </>
  )
}
