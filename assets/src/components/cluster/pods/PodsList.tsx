import {
  IconFrame,
  Table,
  Tooltip,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { Link, useNavigate } from 'react-router-dom'
import { Row, createColumnHelper } from '@tanstack/react-table'
import {
  ComponentProps,
  createContext,
  memo,
  useContext,
  useMemo,
  useState,
} from 'react'
import { filesize } from 'filesize'
import { isEmpty } from 'lodash'

import type { Application, Maybe, Pod } from 'generated/graphql'
import { ReadinessT } from 'utils/status'

import { Confirm } from 'components/utils/Confirm'
import { useMutation } from '@apollo/client'

import { TruncateStart } from 'components/utils/table/TruncateStart'

import { InlineLink } from 'components/utils/typography/InlineLink'

import {
  LabelWithIcon,
  TableCaretLink,
  TableText,
  Usage,
  numishSort,
} from '../TableElements'
import { DELETE_POD } from '../queries'

import { getPodContainersStats } from '../containers/getPodContainersStats'

import { ContainerStatuses } from '../ContainerStatuses'

import { getPodResources } from './getPodResources'

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

  const [mutation, { loading }] = useMutation(DELETE_POD, {
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

export type ContainerStatus = { name: string; readiness: ReadinessT }

type PodTableRow = {
  name?: string
  nodeName?: string
  namespace?: string
  namespaceIcon?: string
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
    statuses?: ContainerStatus[]
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

export const ColNodeName = columnHelper.accessor((pod) => pod.nodeName, {
  id: 'nodeName',
  enableSorting: true,
  cell: ({ row: { original }, ...props }) => (
    <TableText>
      <Tooltip
        label={original.nodeName}
        placement="top-start"
      >
        <InlineLink
          as={Link}
          to={`/nodes/${original.nodeName}`}
        >
          {props.getValue()}
        </InlineLink>
      </Tooltip>
    </TableText>
  ),
  header: 'Node name',
})

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
        <TruncateStart>
          <span>{image}</span>
        </TruncateStart>
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

export type PodWithId = Pod & {
  id?: Maybe<string>
}
type PodListProps = Omit<ComponentProps<typeof Table>, 'data'> & {
  pods?: Maybe<PodWithId>[] & PodWithId[]
  refetch: Nullable<() => void>
  applications?: Maybe<Maybe<Application>[]>
  columns: any[]
  linkBasePath?: string
  serviceId?: string | null
}

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
    applications,
    columns,
    serviceId,
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

            const namespaceIcon =
              pod?.metadata?.namespace &&
              applications?.find((app) => app?.name === pod.metadata.namespace)
                ?.spec?.descriptor?.icons?.[0]

            return {
              name: pod?.metadata?.name,
              nodeName: pod?.spec?.nodeName || undefined,
              namespace: pod?.metadata?.namespace || undefined,
              namespaceIcon: namespaceIcon || undefined,
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
            }
          }),
      [applications, pods]
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

    console.log('reactTableOptions', reactTableOptions)
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
            navigate(`${linkBasePath}/${original.namespace}/${original.name}`)
          }
        />
      </PodsListContext.Provider>
    )
  }
)
