import { Chip, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { TRUNCATE } from 'components/utils/truncate'
import { filesize } from 'filesize'
import {
  A,
  Div,
  Flex,
  H2,
} from 'honorable'
import { memoryParser } from 'kubernetes-resource-parser'
import { cpuParser } from 'utils/kubernetes'
import { Readiness, containerStatusToReadiness } from 'utils/status'

const COLUMN_HELPER = createColumnHelper<any>()

const columns = [
  COLUMN_HELPER.accessor(pod => pod.metadata.name, {
    id: 'name',
    cell: (name: any) => name.getValue(),
    header: 'Name',
  }),
  COLUMN_HELPER.accessor(pod => pod.spec.nodeName, {
    id: 'nodeName',
    cell: (nodeName: any) => (
      <A
        maxWidth={180}
        {...TRUNCATE}
        inline // TODO: Add link to node.
      >
        {nodeName.getValue()}
      </A>
    ),
    header: 'Node name',
  }),
  COLUMN_HELPER.accessor(pod => pod.spec.containers, {
    id: 'memory',
    cell: (containers: any) => {
      const requests = podMemory(containers.getValue(), 'requests')
      const limits = podMemory(containers.getValue(), 'limits')

      return (
        <Div whiteSpace="nowrap">
          {`${requests === undefined ? '-' : filesize(requests)} / ${limits === undefined ? '-' : filesize(limits)}`}
        </Div>
      )
    },
    header: 'Memory',
  }),
  COLUMN_HELPER.accessor(pod => pod.spec.containers, {
    id: 'cpu',
    cell: (containers: any) => {
      const requests = podCPU(containers.getValue(), 'requests')
      const limits = podCPU(containers.getValue(), 'limits')

      return (
        <Div whiteSpace="nowrap">
          {`${requests === undefined ? '-' : requests} / ${limits === undefined ? '-' : limits}`}
        </Div>
      )
    },
    header: 'CPU',
  }),
  COLUMN_HELPER.accessor(pod => pod.status.containerStatuses || [], {
    id: 'restarts',
    cell: (statuses: any) => statuses.getValue().reduce((count, { restartCount }) => count + (restartCount || 0), 0),
    header: 'Restarts',
  }),
  COLUMN_HELPER.accessor(pod => pod.status.containerStatuses || [], {
    id: 'containers',
    cell: (statuses: any) => {
      const all = statuses.getValue().length
      const ready = statuses.getValue().reduce((count, status) => count + (containerStatusToReadiness(status) === Readiness.Ready ? 1 : 0), 0)
      const severity = ready === 0 ? 'error' : (all === ready ? 'success' : 'warning')

      return (
        <Chip
          severity={severity}
          whiteSpace="nowrap"
        >
          {ready}/{all} ready
        </Chip>
      )
    },
    header: 'Containers',
  }),
  // TODO: Add tooltip for containers and add delete button.
]

function podMemory(containers, type) {
  let memory

  for (const { resources } of containers) {
    const resourceSpec = resources[type]

    if (!resourceSpec) continue
    if (resourceSpec.memory) {
      memory = (memory || 0) + memoryParser(resourceSpec.memory)
    }
  }

  return memory
}

function podCPU(containers, type) {
  let cpu

  for (const { resources } of containers) {
    const resourceSpec = resources[type]

    if (!resourceSpec) continue
    if (resourceSpec.cpu) {
      cpu = (cpu || 0) + cpuParser(resourceSpec.cpu)
    }
  }

  return cpu === undefined ? cpu : Math.ceil(100 * cpu) / 100
}

export default function ComponentInfoPods({
  pods, namespace, refetch,
}) {
  return (
    <Flex direction="column">
      <H2 marginBottom="medium">Pods</H2>
      {pods?.length > 0 && (
        <Table
          data={pods}
          columns={columns}
          maxHeight="calc(100vh - 244px)"
        />
      )}
      {(!pods || pods.length === 0) && 'No pods available.'}
    </Flex>
  )
}
