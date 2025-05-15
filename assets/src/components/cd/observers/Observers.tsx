import { useState } from 'react'
import {
  IconFrame,
  LoopingLogo,
  Modal,
  Prop,
  PropWide,
  Table,
  TrashCanIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { OBSERVERS_ABS_PATH } from 'routes/cdRoutesConsts'
import { GqlError } from 'components/utils/Alert'
import {
  ObserverFragment,
  ObserverTargetType,
  useDeleteObserverMutation,
  useObserversQuery,
} from 'generated/graphql'
import { Edge } from 'utils/graphql'

import styled, { useTheme } from 'styled-components'

import { CD_BASE_CRUMBS } from '../ContinuousDeployment'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from '../../utils/table/useFetchPaginatedData'
import { useProjectId } from '../../contexts/ProjectsContext'
import { DateTimeCol } from '../../utils/table/DateTimeCol'
import {
  ServiceErrorsChip,
  ServiceErrorsModal,
} from '../services/ServicesTableErrors'
import { Confirm } from '../../utils/Confirm'
import { Overline } from '../utils/PermissionsModal'

import ObserverStatusChip from './ObserverStatusChip'
import ObserverTargetChip from './ObserverTargetChip'
import ObserverTargetOrderChip from './ObserverTargetOrderChip'

export const breadcrumbs = [
  ...CD_BASE_CRUMBS,
  { label: 'observers', url: OBSERVERS_ABS_PATH },
]

const PropsContainer = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
}))

const PropsContainerHeader = styled(Overline)(({ theme }) => ({
  marginBottom: theme.spacing.xsmall,
}))

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
                flexDirection: 'column',
                gap: theme.spacing.large,
              }}
            >
              <div
                css={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: theme.spacing.large,
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
              </div>
              {node.target.git &&
                node.target.target === ObserverTargetType.Git && (
                  <div>
                    <PropsContainerHeader>Git</PropsContainerHeader>
                    <PropsContainer>
                      <PropWide title="Type">{node.target.git.type}</PropWide>
                      <PropWide title="Repository ID">
                        {node.target.git.repositoryId}
                      </PropWide>
                    </PropsContainer>
                  </div>
                )}
              {node.target.helm &&
                node.target.target === ObserverTargetType.Helm && (
                  <div>
                    <PropsContainerHeader>Helm</PropsContainerHeader>
                    <PropsContainer>
                      <PropWide title="Chart">
                        {node.target.helm.chart}
                      </PropWide>
                      <PropWide title="URL">{node.target.helm.url}</PropWide>
                      <PropWide title="Provider">
                        {node.target.helm.provider}
                      </PropWide>
                    </PropsContainer>
                  </div>
                )}
              {node.target.oci &&
                node.target.target === ObserverTargetType.Oci && (
                  <div>
                    <PropsContainerHeader>OCI</PropsContainerHeader>
                    <PropsContainer>
                      <PropWide title="URL">{node.target.oci.url}</PropWide>
                      <PropWide title="Provider">
                        {node.target.oci.provider}
                      </PropWide>
                    </PropsContainer>
                  </div>
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
  columnHelper.accessor(({ node }) => node?.lastValue, {
    id: 'lastValue',
    header: 'Last value',
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
        <div onClick={(e) => e.stopPropagation()}>
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
        </div>
      )
    },
  }),
]

export default function Observers() {
  const projectId = useProjectId()

  const { data, loading, error, pageInfo, fetchNextPage } =
    useFetchPaginatedData(
      { queryHook: useObserversQuery, keyPath: ['observers'] },
      { projectId }
    )

  useSetBreadcrumbs(breadcrumbs)

  if (error) return <GqlError error={error} />

  if (!data) return <LoopingLogo />

  return (
    <Table
      fullHeightWrap
      columns={columns}
      reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
      data={data?.observers?.edges || []}
      virtualizeRows
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      emptyStateProps={{
        message: "Looks like you don't have any observers yet",
      }}
    />
  )
}
