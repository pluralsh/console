import { ApolloError } from '@apollo/client'
import {
  Button,
  CheckOutlineIcon,
  Chip,
  ChipSeverity,
  EyeIcon,
  FailedFilledIcon,
  Flex,
  IconFrame,
  SpinnerAlt,
  Table,
  TableProps,
  Tooltip,
  UnknownIcon,
} from '@pluralsh/design-system'
import { CellContext, createColumnHelper } from '@tanstack/react-table'
import { ColExpander } from 'components/cd/cluster/pod/PodContainers'
import {
  AlertFragment,
  AlertSeverity,
  WorkbenchJobStatus,
} from 'generated/graphql'
import { isEmpty, upperFirst } from 'lodash'
import { ReactNode, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import { useTheme } from 'styled-components'
import { formatDateTime } from 'utils/datetime'
import { AiInsightSummaryIcon } from '../AiInsights'
import { GqlError } from '../Alert'
import { StackedText } from '../table/StackedText'
import { VirtualSlice } from '../table/useFetchPaginatedData'
import { InlineA } from '../typography/Text'
import { AlertResolutionModal } from './AlertResolutionModal'
import { AlertsTableExpander } from './AlertsTableExpander'
import { AlertStateChip } from './AlertStateChip'

type ViewJobData = {
  workbenchId: string
  jobId: string
  status?: Nullable<WorkbenchJobStatus>
}

const columnHelper = createColumnHelper<AlertFragment>()

export const alertSeverityToChipSeverity: Record<AlertSeverity, ChipSeverity> =
  {
    [AlertSeverity.Critical]: 'critical',
    [AlertSeverity.High]: 'danger',
    [AlertSeverity.Medium]: 'warning',
    [AlertSeverity.Low]: 'success',
    [AlertSeverity.Undefined]: 'neutral',
  }

export function AlertsTable({
  alerts,
  loading,
  error,
  hasNextPage,
  fetchNextPage,
  setVirtualSlice,
  hideHeader = false,
  columns = defaultAlertsColumns,
  fillLevel = 1,
  rowBg = 'base',
}: {
  alerts: AlertFragment[]
  loading: boolean
  error: Nullable<ApolloError>
  hasNextPage: boolean
  fetchNextPage: () => void
  setVirtualSlice: (slice: VirtualSlice) => void
  hideHeader?: boolean
  columns?: NonNullable<TableProps['columns']>
  fillLevel?: TableProps['fillLevel']
  rowBg?: TableProps['rowBg']
}) {
  const theme = useTheme()

  return error ? (
    <GqlError error={error} />
  ) : (
    <Table
      hideHeader={hideHeader}
      fullHeightWrap
      virtualizeRows
      fillLevel={fillLevel}
      rowBg={rowBg}
      data={alerts}
      columns={columns}
      hasNextPage={hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
      loading={loading && isEmpty(alerts)}
      getRowCanExpand={() => true}
      renderExpanded={AlertsTableExpander}
      onRowClick={(_, row) => row.getToggleExpandedHandler()()}
      emptyStateProps={{ message: 'No alerts found.' }}
      css={{
        // hacky, for targeting the expander row. should build this into table
        'tr:has(td[colspan]) td': { background: theme.colors['fill-two'] },
      }}
    />
  )
}

function jobStatusIcon(status?: Nullable<WorkbenchJobStatus>): ReactNode {
  switch (status) {
    case WorkbenchJobStatus.Pending:
    case WorkbenchJobStatus.Running:
      return <SpinnerAlt size={12} />
    case WorkbenchJobStatus.Successful:
      return (
        <CheckOutlineIcon
          size={12}
          color="icon-success"
        />
      )
    case WorkbenchJobStatus.Failed:
      return (
        <FailedFilledIcon
          size={12}
          color="icon-danger"
        />
      )
    default:
      return (
        <UnknownIcon
          size={12}
          color="icon-xlight"
        />
      )
  }
}

function UrlCell({ getValue }: CellContext<AlertFragment, unknown>) {
  const { url, insight } = getValue() as AlertFragment

  return (
    <Flex
      gap="small"
      align="center"
      justify="space-between"
      width="100%"
    >
      <Tooltip
        placement="top"
        label={url}
      >
        <InlineA href={url}>{url ?? ''}</InlineA>
      </Tooltip>
      <AiInsightSummaryIcon
        insight={insight}
        navPath={`insight/${insight?.id}`}
      />
    </Flex>
  )
}

function ResolutionCell({ getValue }: CellContext<AlertFragment, unknown>) {
  const { id, resolution } = getValue() as AlertFragment
  const [isOpen, setIsOpen] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(!isOpen)
  }

  return (
    <>
      {resolution ? (
        <Flex gap="xsmall">
          <Button
            small
            secondary
            disabled
          >
            Resolved
          </Button>
          <IconFrame
            clickable
            onClick={handleClick}
            type="secondary"
            tooltip="View resolution"
            icon={<EyeIcon />}
          />
        </Flex>
      ) : (
        <Button
          small
          secondary
          onClick={handleClick}
        >
          Mark as resolved
        </Button>
      )}
      <AlertResolutionModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        initialResolution={resolution}
        alertId={id}
      />
    </>
  )
}

function ViewJobCell({
  getValue,
  getViewJobData,
}: {
  getValue: () => AlertFragment
  getViewJobData: (alert: AlertFragment) => ViewJobData | null
}) {
  const navigate = useNavigate()
  const alert = getValue()
  const jobData = getViewJobData(alert)

  if (!jobData) return null

  return (
    <Chip
      clickable
      onClick={() =>
        navigate(
          getWorkbenchJobAbsPath({
            workbenchId: jobData.workbenchId,
            jobId: jobData.jobId,
          })
        )
      }
    >
      <Flex
        gap="xsmall"
        align="center"
      >
        {jobStatusIcon(jobData.status)}
        <span>View job</span>
      </Flex>
    </Chip>
  )
}

export const ColAlertExpander = ColExpander

export const ColAlertTitle = columnHelper.accessor((alert) => alert.title, {
  id: 'title',
  header: 'Title',
  meta: { gridTemplate: 'minmax(200px, 1fr)', truncate: true },
  cell: function Cell({ getValue, row }) {
    return (
      <StackedText
        first={getValue()}
        second={formatDateTime(row.original.updatedAt, 'M/D/YYYY h:mma')}
      />
    )
  },
})

export const ColAlertUrl = columnHelper.accessor((alert) => alert, {
  id: 'url',
  header: 'URL',
  meta: { gridTemplate: 'minmax(280px, 2fr)', truncate: true },
  cell: UrlCell,
})

export const ColAlertState = columnHelper.accessor((alert) => alert.state, {
  id: 'state',
  header: 'State',
  cell: function Cell({ getValue }) {
    return <AlertStateChip state={getValue()} />
  },
})

export const ColAlertSeverity = columnHelper.accessor(
  (alert) => alert.severity,
  {
    id: 'severity',
    header: 'Severity',
    cell: function Cell({ getValue }) {
      return (
        <Chip
          size="small"
          severity={alertSeverityToChipSeverity[getValue()]}
        >
          {upperFirst(getValue().toLowerCase())}
        </Chip>
      )
    },
  }
)

export const ColAlertResolution = columnHelper.accessor((alert) => alert, {
  id: 'resolution',
  header: '',
  meta: { gridTemplate: 'max-content' },
  cell: ResolutionCell,
})

export const getColAlertViewJob = (
  getViewJobData: (alert: AlertFragment) => ViewJobData | null
) =>
  columnHelper.accessor((alert) => alert, {
    id: 'viewJob',
    header: '',
    meta: { gridTemplate: 'auto' },
    cell: function Cell({ getValue }) {
      return (
        <ViewJobCell
          getValue={getValue}
          getViewJobData={getViewJobData}
        />
      )
    },
  })

const defaultAlertsColumns = [
  ColAlertExpander,
  ColAlertTitle,
  ColAlertState,
  ColAlertSeverity,
  ColAlertUrl,
  ColAlertResolution,
]
