import { A, Div, Flex, Span } from 'honorable'
import { Link, useNavigate } from 'react-router-dom'
import { Row, createColumnHelper } from '@tanstack/react-table'
import { ComponentProps, memo, useMemo, useState } from 'react'
import { filesize } from 'filesize'

import type { Application, Maybe, Pod } from 'generated/graphql'
import { ReadinessT } from 'utils/status'

import {
  IconFrame,
  Table,
  Tooltip,
  TrashCanIcon,
} from '@pluralsh/design-system'

import { Confirm } from 'components/utils/Confirm'
import { useMutation } from '@apollo/client'

import { isEmpty } from 'lodash'

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
    <Div onClick={(e) => e.stopPropagation()}>
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
    </Div>
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
        <Span
          color="text-light"
          direction="rtl"
          textAlign="left"
          whiteSpace="nowrap"
        >
          {image}
        </Span>
      </Tooltip>
    ))
  },
  header: 'Images',
  meta: {
    truncate: true,
  },
})

export const ColActions = (refetch) =>
  columnHelper.display({
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
          textValue={`View pod ${original?.name}`}
        />
      </Flex>
    ),
    header: '',
  })

export const ColDelete = (refetch) =>
  columnHelper.accessor((row) => row.name, {
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

export type PodWithId = Pod & {
  id?: Maybe<string>
}
type PodListProps = Omit<ComponentProps<typeof Table>, 'data'> & {
  pods?: Maybe<PodWithId>[] & PodWithId[]
  applications?: Maybe<Maybe<Application>[]>
  columns: any[]
  linkBasePath?: string
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

export const PodsList = memo(
  ({
    pods,
    applications,
    columns,
    linkBasePath = `/pods`,
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

    if (!pods || pods.length === 0) {
      return <>No pods available.</>
    }

    return (
      <Table
        data={tableData}
        columns={columns}
        virtualizeRows
        {...props}
        onRowClick={(_e, { original }: Row<PodTableRow>) =>
          navigate(`${linkBasePath}/${original.namespace}/${original.name}`)
        }
      />
    )
  }
)
