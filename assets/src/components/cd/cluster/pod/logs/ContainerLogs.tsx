import {
  ComponentProps,
  ReactElement,
  createRef,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { IconFrame, ReloadIcon, Spinner, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useWindowSize } from 'usehooks-ts'
import { useTheme } from 'styled-components'

import { Pod, usePodLogsQuery } from '../../../../../generated/graphql'
import LoadingIndicator from '../../../../utils/LoadingIndicator'
import { determineLevel } from '../../../../apps/app/logs/LogContent'
import { useBorderColor } from '../../../../apps/app/logs/LogLine'

import { FullHeightTableWrap } from '../../../../utils/layout/FullHeightTableWrap'

import { SinceSecondsOptions } from './Logs'

const columnHelper = createColumnHelper<string>()

function LogHeader({
  container,
  refetch,
  loading,
}: {
  container: string
  refetch: Nullable<() => void>
  loading: boolean
}): ReactElement<any> {
  const theme = useTheme()

  return (
    <div
      css={{
        display: 'flex',
        gap: theme.spacing.medium,
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <span>Logs from {container}</span>
      <IconFrame
        size="small"
        clickable
        onClick={() => {
          refetch?.()
        }}
        icon={
          loading ? (
            <Spinner color={theme.colors['icon-info']} />
          ) : (
            <ReloadIcon width={12} />
          )
        }
        textValue="refresh"
        tooltip="Refresh logs"
        type="floating"
      />
    </div>
  )
}

function LogLine({ getValue }): ReactElement<any> {
  const theme = useTheme()
  const borderColor = useBorderColor()
  const level = determineLevel(getValue())

  return (
    <div
      css={{
        height: '100%',
        borderLeft: `4px solid ${borderColor(level)}`,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: theme.spacing.small,
        wordBreak: 'break-all',
      }}
    >
      {getValue()}
    </div>
  )
}

function ContainerLogs({
  container,
  sinceSeconds = SinceSecondsOptions.HalfHour,
}: {
  sinceSeconds?: number
  container: string
}) {
  const { clusterId, serviceId } = useParams()
  const { pod } = useOutletContext() as { pod: Pod }
  const {
    data: currentData,
    loading,
    refetch,
    previousData,
  } = usePodLogsQuery({
    variables: {
      name: pod.metadata.name!,
      namespace: pod.metadata.namespace!,
      container,
      sinceSeconds,
      ...(serviceId ? { serviceId } : { clusterId }),
    },
    fetchPolicy: 'no-cache',
    notifyOnNetworkStatusChange: true,
  })
  const data = currentData || previousData
  const logs = useMemo(
    () =>
      (data?.pod?.logs as Array<string>)?.filter((l) => !!l).reverse() ?? [],
    [data]
  )

  if (!data) return <LoadingIndicator />

  return (
    <ContainerLogsTable
      container={container}
      sinceSeconds={sinceSeconds}
      loading={loading}
      refetch={refetch}
      logs={logs}
    />
  )
}

type ContainerLogsTableProps = ComponentProps<typeof ContainerLogs> & {
  refetch: () => void
  loading: boolean
  logs: string[]
}

const columns = [
  columnHelper.accessor((row) => row, {
    id: 'header',
    header: ({ table }) => {
      const { refetch, container, loading } = table.options.meta || {}

      return <LogHeader {...{ container, refetch, loading }} />
    },
    cell: LogLine,
  }),
]

export function ContainerLogsTable({
  container,
  refetch,
  loading,
  logs,
}: ContainerLogsTableProps): ReactElement<any> {
  const size = useWindowSize()
  const containerRef = createRef<HTMLDivElement>()
  const [containerHeight, setContainerHeight] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return

    setContainerHeight(containerRef.current.clientHeight)
  }, [containerRef, size])

  return (
    <div
      ref={containerRef}
      css={{
        minHeight: 0,
        height: '100%',
        ' td': { padding: '1px 0', minHeight: '30px' },
        ' .thSortIndicatorWrap > div': { width: '100%' },
      }}
    >
      <FullHeightTableWrap>
        <Table
          height={containerHeight}
          reactTableOptions={{ meta: { refetch, container, loading } }}
          virtualizeRows
          onRowClick={() => {}}
          columns={columns}
          data={logs}
          emptyStateProps={{ message: 'No logs found to display' }}
          css={{
            maxHeight: 'unset',
            height: '100%',
          }}
        />
      </FullHeightTableWrap>
    </div>
  )
}

export default ContainerLogs
