import {
  Button,
  Flex,
  IconFrame,
  Input2,
  PencilIcon,
  SearchIcon,
  Spinner,
  Table,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useThrottle } from 'components/hooks/useThrottle'
import { GqlError } from 'components/utils/Alert'
import { AlertStateChip } from 'components/utils/alerts/AlertStateChip'
import { Confirm } from 'components/utils/Confirm'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { Body1P, StrongSC } from 'components/utils/typography/Text'
import {
  MonitorTinyFragment,
  useDeleteMonitorMutation,
  useServiceMonitorsQuery,
} from 'generated/graphql'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { SERVICE_PARAM_ID } from 'routes/cdRoutesConsts'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'

export function ServiceMonitors() {
  const [q, setQ] = useState('')
  const throttledQ = useThrottle(q, 100)
  const serviceId = useParams()[SERVICE_PARAM_ID] ?? ''
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: useServiceMonitorsQuery,
        keyPath: ['serviceDeployment', 'monitors'],
        skip: !serviceId,
      },
      { q: throttledQ || undefined, serviceId }
    )
  return (
    <WrapperSC>
      <StretchedFlex>
        <Body1P $color="text-light">
          Create and manage log-based monitors for this service.
        </Body1P>
        <Button
          floating
          as={Link}
          to="create"
        >
          Create Monitor
        </Button>
      </StretchedFlex>
      <Input2
        startIcon={<SearchIcon />}
        placeholder="Search monitors"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {error ? (
        <GqlError error={error} />
      ) : (
        <Table
          fullHeightWrap
          data={mapExistingNodes(data?.serviceDeployment?.monitors)}
          columns={cols}
          loading={!data && loading}
          hasNextPage={pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={loading}
          onVirtualSliceChange={setVirtualSlice}
          emptyStateProps={{
            message: `No monitors found for ${q ? `"${q}". Try adjusting your filter.` : 'this service.'}`,
          }}
        />
      )}
    </WrapperSC>
  )
}

const columnHelper = createColumnHelper<MonitorTinyFragment>()

const cols = [
  columnHelper.accessor(({ name }) => name, {
    id: 'name',
    header: 'Name',
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor(({ state }) => state, {
    id: 'state',
    header: 'State',
    cell: ({ getValue }) => {
      const state = getValue()
      return state ? <AlertStateChip state={state} /> : '--'
    },
  }),
  columnHelper.accessor(({ threshold }) => threshold, {
    id: 'threshold',
    header: 'Threshold',
    cell: ({ getValue }) => {
      const { value, aggregate } = getValue() ?? {}
      return value && aggregate ? (
        <span>{`${aggregate} = ${value}`}</span>
      ) : (
        '--'
      )
    },
  }),
  columnHelper.accessor(({ evaluationCron }) => evaluationCron, {
    id: 'evaluationCron',
    header: 'Schedule cron',
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor(({ query }) => query.log.query, {
    id: 'query',
    header: 'Log query',
    cell: ({ getValue }) => `"${getValue()}"`,
  }),
  columnHelper.accessor((monitor) => monitor, {
    id: 'actions',
    header: '',
    cell: function Cell({ getValue }) {
      const navigate = useNavigate()
      const { id, name } = getValue()
      const [deleteOpen, setDeleteOpen] = useState(false)
      const { popToast } = useSimpleToast()
      const [deleteMonitor, { loading }] = useDeleteMonitorMutation({
        variables: { id },
        onCompleted: () => {
          setDeleteOpen(false)
          popToast({ name, action: 'deleted', severity: 'danger' })
        },
        onError: () =>
          popToast({ name, action: 'failed to delete', severity: 'danger' }),
        refetchQueries: ['ServiceMonitors'],
        awaitRefetchQueries: true,
      })
      return (
        <Flex
          gap="xsmall"
          alignSelf="flex-end"
        >
          <IconFrame
            clickable
            icon={<PencilIcon />}
            onClick={() => navigate(id)}
            tooltip="Edit monitor"
          />
          <IconFrame
            clickable
            icon={loading ? <Spinner /> : <TrashCanIcon color="icon-danger" />}
            onClick={() => setDeleteOpen(true)}
            tooltip="Delete"
          />
          <Confirm
            destructive
            open={deleteOpen}
            close={() => setDeleteOpen(false)}
            submit={() => deleteMonitor()}
            title="Delete monitor"
            text={
              <span>
                Are you sure you want to delete{' '}
                <StrongSC $color="text-danger">{name}</StrongSC>?
              </span>
            }
            label="Delete"
          />
        </Flex>
      )
    },
  }),
]

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  height: '100%',
}))
