import { ComponentProps, useState } from 'react'
import {
  IconFrame,
  LoopingLogo,
  Modal,
  Prop,
  Table,
  TrashCanIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { OBSERVERS_ABS_PATH } from 'routes/cdRoutesConsts'
import { GqlError } from 'components/utils/Alert'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import {
  ObserverFragment,
  useDeleteObserverMutation,
  useObserversQuery,
} from 'generated/graphql'
import { Edge } from 'utils/graphql'
import { Div } from 'honorable'

import { useTheme } from 'styled-components'

import { CD_BASE_CRUMBS } from '../ContinuousDeployment'
import { useFetchPaginatedData } from '../utils/useFetchPaginatedData'
import { useProjectId } from '../../contexts/ProjectsContext'
import { DateTimeCol } from '../../utils/table/DateTimeCol'
import {
  ServiceErrorsChip,
  ServiceErrorsModal,
} from '../services/ServicesTableErrors'
import { Confirm } from '../../utils/Confirm'

import ObserverStatusChip from './ObserverStatusChip'
import ObserverTargetChip from './ObserverTargetChip'
import ObserverTargetOrderChip from './ObserverTargetOrderChip'

export const breadcrumbs = [
  ...CD_BASE_CRUMBS,
  { label: 'observers', url: OBSERVERS_ABS_PATH },
]

const pageSize = 100

const virtualOptions: ComponentProps<typeof Table>['reactVirtualOptions'] = {
  overscan: 10,
}

const columnHelper = createColumnHelper<Edge<ObserverFragment>>()

const columns = [
  columnHelper.accessor(({ node }) => node?.name, {
    id: 'name',
    header: 'Name',
    meta: { truncate: true },
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor(() => null, {
    id: 'target',
    header: 'Target',
    cell: function Cell({
      row: {
        original: { node },
      },
    }) {
      const theme = useTheme()
      const [open, setOpen] = useState(false)

      if (!node) return null

      return (
        <div onClick={(e) => e.stopPropagation()}>
          <ObserverTargetChip
            target={node.target.target}
            clickable
            onClick={(e) => {
              e.stopPropagation()
              setOpen(true)
            }}
          />
          <Modal
            header={`${node.name} observer target`}
            open={open}
            onClose={() => setOpen(false)}
          >
            <div
              css={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: theme.spacing.medium,
              }}
            >
              <Prop
                title="Type"
                margin={0}
              >
                <ObserverTargetChip target={node.target.target} />
              </Prop>
              {node.target.format && (
                <Prop
                  title="Format"
                  margin={0}
                >
                  {node.target.format}
                </Prop>
              )}
              <Prop
                title="Order"
                margin={0}
              >
                <ObserverTargetOrderChip order={node.target.order} />
              </Prop>
              {node.target.git && (
                <>
                  <Prop title="Type">{node.target.git.type}</Prop>
                  <Prop title="Repository ID">
                    {node.target.git.repositoryId}
                  </Prop>
                </>
              )}
              {node.target.helm && (
                <>
                  <Prop title="Chart">{node.target.helm.chart}</Prop>
                  <Prop title="URL">{node.target.helm.url}</Prop>
                  <Prop title="Provider">{node.target.helm.provider}</Prop>
                </>
              )}
              {node.target.oci && (
                <>
                  <Prop title="Chart">{node.target.oci.url}</Prop>
                  <Prop title="Provider">{node.target.oci.provider}</Prop>
                </>
              )}
            </div>
          </Modal>
        </div>
      )
    },
  }),
  columnHelper.accessor(({ node }) => node?.crontab, {
    id: 'crontab',
    header: 'Crontab',
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor(({ node }) => node?.lastRunAt, {
    id: 'lastRunAt',
    header: 'Last run',
    cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
  }),
  columnHelper.accessor(({ node }) => node?.nextRunAt, {
    id: 'nextRunAt',
    header: 'Next run',
    cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
  }),
  columnHelper.accessor(({ node }) => node?.status, {
    id: 'status',
    header: 'Status',
    cell: ({ getValue }) => <ObserverStatusChip status={getValue()} />,
  }),
  columnHelper.accessor(() => null, {
    id: 'errors',
    header: 'Errors',
    cell: function Cell({
      row: {
        original: { node },
      },
    }) {
      const [open, setOpen] = useState(false)

      if (!node || !node.errors) return null

      return (
        <div onClick={(e) => e.stopPropagation()}>
          <ServiceErrorsChip
            onClick={(e) => {
              e.stopPropagation()
              setOpen(true)
            }}
            clickable
            errors={node.errors}
          />
          <ServiceErrorsModal
            isOpen={open}
            setIsOpen={setOpen}
            header={`${node.name} observer errors`}
            errors={node.errors}
          />
        </div>
      )
    },
  }),
  columnHelper.accessor(() => null, {
    id: 'actions',
    header: '',
    meta: { gridTemplate: 'minmax(auto, 80px)' },
    cell: function Cell({
      row: {
        original: { node },
      },
    }) {
      const [confirm, setConfirm] = useState(false)
      const [mutation, { loading }] = useDeleteObserverMutation({
        variables: { id: node?.id ?? '' },
        onCompleted: () => {
          setConfirm(false)
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
          {confirm && (
            <Confirm
              close={() => setConfirm(false)}
              destructive
              label="Delete"
              loading={loading}
              open={confirm}
              submit={() => mutation()}
              title="Delete observer"
              text={`Are you sure you want to delete ${node?.name}?`}
            />
          )}
        </Div>
      )
    },
  }),
]

export default function Observers() {
  const projectId = useProjectId()

  const { data, loading, error, pageInfo, fetchNextPage } =
    useFetchPaginatedData(
      { queryHook: useObserversQuery, pageSize, keyPath: ['observers'] },
      { projectId }
    )

  useSetBreadcrumbs(breadcrumbs)

  if (error) return <GqlError error={error} />

  if (!data) return <LoopingLogo />

  return (
    <FullHeightTableWrap>
      <Table
        columns={columns}
        reactVirtualOptions={virtualOptions}
        data={data?.observers?.edges || []}
        virtualizeRows
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        emptyStateProps={{
          message: "Looks like you don't have any observers yet",
        }}
        css={{
          maxHeight: 'unset',
          height: '100%',
        }}
      />
    </FullHeightTableWrap>
  )
}
