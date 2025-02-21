import {
  IconFrame,
  Table,
  Tooltip,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { createColumnHelper, Row } from '@tanstack/react-table'
import { filesize } from 'filesize'
import { isEmpty } from 'lodash'
import {
  ComponentProps,
  createContext,
  memo,
  useContext,
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'

import { Pod, PodFragment, useDeletePodMutation } from 'generated/graphql'
import { ReadinessT } from 'utils/status'

import { Confirm } from 'components/utils/Confirm'

import { TruncateStart } from 'components/utils/table/Truncate'

import { getKubernetesAbsPath } from 'routes/kubernetesRoutesConsts'
import { getPodContainersStats } from '../../../cluster/containers/getPodContainersStats.tsx'
import { ContainerStatuses } from '../../../cluster/ContainerStatuses.tsx'
import {
  LabelWithIcon,
  numishSort,
  TableCaretLink,
  TableText,
  Usage,
} from '../../../cluster/TableElements.tsx'
import { DateTimeCol } from '../../../utils/table/DateTimeCol.tsx'
import { getPodResources } from './getPodResources.tsx'

function DeletePod({
  name,
  namespace,
  refetch,
  serviceId,
}: {
  name: string
  namespace: string
  refetch: Nullable<() => void>
  serviceId?: string | null
}) {
  const [confirm, setConfirm] = useState(false)

  const [mutation, { loading }] = useDeletePodMutation({
    variables: { name, namespace, serviceId },
    onCompleted: () => {
      setConfirm(false)
      refetch?.()
    },
  })

  return (
    <div onClick={(e) => e.stopPropagation()}>
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
    </div>
  )
}

export type ContainerStatusT = { name: string; readiness: ReadinessT }

type PodTableRow = {
  name?: string
  nodeName?: string
  namespace?: string
  namespaceIcon?: string
  creationTimestamp?: string
  memory: {
    requests?: number
    limits?: any
  }
  cpu: {
    requests?: number
    limits?: number
  }
  restarts?: number
  containers?: {
    ready?: number
    total?: number
    statuses?: ContainerStatusT[]
  }
  images?: string[]
}
const columnHelper = createColumnHelper<PodTableRow>()

export const ColName = columnHelper.accessor((row) => row.name, {
  id: 'name',
  enableGlobalFilter: true,
  enableSorting: true,
  cell: (props) => (
    <Tooltip
      label={props.getValue()}
      placement="top-start"
    >
      <TableText>{props.getValue()}</TableText>
    </Tooltip>
  ),
  header: 'Name',
})

export const ColNamespace = columnHelper.accessor((row) => row.namespace, {
  id: 'namespace',
  enableGlobalFilter: true,
  enableSorting: true,
  cell: ({ row: { original }, ...props }) => (
    <LabelWithIcon
      label={props.getValue()}
      icon={original.namespaceIcon}
    />
  ),
  header: 'Namespace',
})

export const ColCreation = columnHelper.accessor(
  (row) => row?.creationTimestamp,
  {
    id: 'creation',
    header: 'Creation',
    enableGlobalFilter: true,
    enableSorting: true,
    cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
  }
)

export const ColMemoryReservation = columnHelper.accessor(
  (row) => row.memory.requests,
  {
    id: 'memory',
    enableSorting: true,
    sortingFn: numishSort,
    cell: ({ row: { original } }) => (
      <Usage
        used={
          original?.memory?.requests === undefined
            ? undefined
            : filesize(original.memory.requests ?? 0)
        }
        total={
          original.memory.limits === undefined
            ? undefined
            : filesize(original.memory.limits ?? 0)
        }
      />
    ),
    header: 'Memory',
  }
)

export const ColCpuReservation = columnHelper.accessor(
  (row) => row?.cpu?.requests,
  {
    id: 'cpu-reservations',
    enableSorting: true,
    sortingFn: numishSort,
    cell: ({ row: { original }, getValue }) => (
      <Usage
        used={getValue()}
        total={original?.cpu?.limits}
      />
    ),
    header: 'CPU',
  }
)

export const ColRestarts = columnHelper.accessor((row) => row.restarts, {
  id: 'restarts',
  enableSorting: true,
  sortingFn: numishSort,
  cell: (props) => <TableText>{props.getValue()}</TableText>,
  header: 'Restarts',
})

export const ColContainers = columnHelper.accessor(
  (row) => row?.containers?.statuses?.length,
  {
    id: 'containers',
    enableSorting: true,
    sortingFn: numishSort,
    cell: ({ row: { original } }) => (
      <ContainerStatuses statuses={original?.containers?.statuses || []} />
    ),
    header: 'Containers',
  }
)

export const ColImages = columnHelper.accessor((row) => row?.images || [], {
  id: 'images',
  cell: (props) => {
    const images = props.getValue()

    return images.map((image) => (
      <Tooltip
        key={image}
        label={image}
        placement="left-start"
      >
        <TruncateStart>{image}</TruncateStart>
      </Tooltip>
    ))
  },
  header: 'Images',
  meta: {
    truncate: true,
  },
})

export const ColActions = columnHelper.display({
  id: 'actions',
  cell: ({ row: { original }, table }) => {
    const { refetch, linkBasePath } =
      (table.options?.meta as {
        refetch?: () => void
        linkBasePath?: string
      }) || {}

    return (
      <div
        css={{
          display: 'flex',
          gap: 'xxsmall',
          justifyContent: 'flex-end',
          width: '100%',
        }}
      >
        {original.name && original.namespace && (
          <DeletePod
            name={original.name}
            namespace={original.namespace}
            refetch={refetch}
          />
        )}
        <div onClick={(e) => e.stopPropagation()}>
          <TableCaretLink
            to={`${linkBasePath || '/pods'}/${original.namespace}/${
              original.name
            }`}
            textValue={`View pod ${original?.name}`}
          />
        </div>
      </div>
    )
  },
  header: '',
})

export const ColDelete = columnHelper.display({
  id: 'delete',
  cell: function Cell({ row: { original }, table }) {
    const ctx = useContext(PodsListContext)
    const refetch = table.options.meta?.refetch

    return (
      <DeletePod
        name={original.name || ''}
        namespace={original.namespace || ''}
        refetch={refetch}
        serviceId={ctx?.serviceId}
      />
    )
  },
  header: '',
})

type PodListProps = Omit<ComponentProps<typeof Table>, 'data'> & {
  pods?: PodFragment[]
  refetch: Nullable<() => void>
  columns: any[]
  linkToK8sDashboard?: boolean
  linkBasePath?: string
  clusterId?: string | null
  serviceId?: string | null
}

export type PodWithId = PodFragment & { id: string }

function getRestarts(status: Pod['status']) {
  return (status.containerStatuses || []).reduce(
    (count, status) => count + ((status as any)?.restartCount || 0),
    0
  )
}

function getImages(containers): string[] {
  return (
    containers
      ?.map((container) => container?.image)
      .filter((image) => !isEmpty(image)) || []
  )
}

function getPodImages(spec: Pod['spec']) {
  return [
    ...new Set([
      ...getImages(spec?.containers),
      ...getImages(spec?.initContainers),
    ]),
  ]
}

const PodsListContext = createContext<any>({})

export const PodsList = memo(
  ({
    pods,
    columns,
    clusterId,
    serviceId,
    linkToK8sDashboard = false,
    linkBasePath = `/pods`,
    refetch,
    reactTableOptions: reactTableOptionsProp,
    ...props
  }: PodListProps) => {
    const navigate = useNavigate()
    const tableData: PodTableRow[] = useMemo(
      () =>
        (pods || [])
          .filter((pod): pod is Pod => !!pod)
          .map((pod) => {
            const { containers } = pod.spec

            const {
              cpu: { requests: cpuRequests, limits: cpuLimits },
              memory: { requests: memoryRequests, limits: memoryLimits },
            } = getPodResources(containers)

            return {
              name: pod?.metadata?.name,
              nodeName: pod?.spec?.nodeName || undefined,
              namespace: pod?.metadata?.namespace || undefined,
              namespaceIcon: undefined,
              memory: {
                requests: memoryRequests,
                limits: memoryLimits,
              },
              cpu: {
                requests: cpuRequests,
                limits: cpuLimits,
              },
              restarts: getRestarts(pod.status),
              containers: getPodContainersStats(pod.status),
              images: getPodImages(pod.spec),
              creationTimestamp: pod?.metadata?.creationTimestamp || undefined,
            }
          }),
      [pods]
    )
    const contextVal = useMemo(
      () => ({
        serviceId,
      }),
      [serviceId]
    )

    const reactTableOptions = useMemo(
      () => ({
        ...reactTableOptionsProp,
        meta: {
          ...(reactTableOptionsProp?.meta || {}),
          refetch,
          linkBasePath,
        },
      }),
      [linkBasePath, reactTableOptionsProp, refetch]
    )

    if (!pods || pods.length === 0) {
      return <>No pods available.</>
    }

    return (
      <PodsListContext.Provider value={contextVal}>
        <Table
          data={tableData}
          columns={columns}
          virtualizeRows
          reactTableOptions={reactTableOptions}
          {...props}
          onRowClick={(_e, { original }: Row<PodTableRow>) =>
            navigate(
              clusterId && linkToK8sDashboard
                ? `${getKubernetesAbsPath(clusterId)}/pods/${
                    original.namespace
                  }/${original.name}`
                : `${linkBasePath}/${original.namespace}/${original.name}`
            )
          }
        />
      </PodsListContext.Provider>
    )
  }
)
