import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import {
  Daemonset_DaemonSetList as DaemonSetListT,
  Daemonset_DaemonSet as DaemonSetT,
  DaemonSetsQuery,
  DaemonSetsQueryVariables,
  useDaemonSetsQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'

import { UsageText } from '../../cluster/TableElements'

import { WorkloadStatusChip } from './utils'

const columnHelper = createColumnHelper<DaemonSetT>()

const colImages = columnHelper.accessor((ds) => ds, {
  id: 'images',
  header: 'Images',
  cell: ({ getValue }) => {
    const { initContainerImages, containerImages } = getValue()

    return (
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          maxWidth: 300,
        }}
      >
        {[...(initContainerImages ?? []), ...(containerImages ?? [])]?.map(
          (image) => (
            <span
              css={{
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
              }}
            >
              {image}
            </span>
          )
        )}
      </div>
    )
  },
})

const colPods = columnHelper.accessor((ds) => ds.podInfo, {
  id: 'pods',
  header: 'Pods',
  cell: ({ getValue }) => {
    const podInfo = getValue()

    return (
      <UsageText>
        {podInfo.running} / {podInfo.desired}
      </UsageText>
    )
  },
})

const colStatus = columnHelper.accessor((ds) => ds.podInfo, {
  id: 'status',
  header: 'Status',
  cell: ({ getValue }) => <WorkloadStatusChip podInfo={getValue()} />,
})

export default function CronJobs() {
  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [
      colName,
      colNamespace,
      colImages,
      colPods,
      colStatus,
      colLabels,
      colCreationTimestamp,
    ],
    [colName, colNamespace, colLabels, colCreationTimestamp]
  )

  return (
    <ResourceList<
      DaemonSetListT,
      DaemonSetT,
      DaemonSetsQuery,
      DaemonSetsQueryVariables
    >
      namespaced
      columns={columns}
      query={useDaemonSetsQuery}
      queryName="handleGetDaemonSetList"
      itemsKey="daemonSets"
    />
  )
}
