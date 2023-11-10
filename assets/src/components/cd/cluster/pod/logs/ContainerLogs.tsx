import { ReactElement, createRef, useEffect, useMemo, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { IconFrame, ReloadIcon, Spinner, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useWindowSize } from 'usehooks-ts'
import { useTheme } from 'styled-components'

import { Pod, usePodLogsQuery } from '../../../../../generated/graphql'
import LoadingIndicator from '../../../../utils/LoadingIndicator'
import { determineLevel } from '../../../../apps/app/logs/LogContent'
import { useBorderColor } from '../../../../apps/app/logs/LogLine'

interface ContainerLogsProps {
  container: string
  sinceSeconds?: number
}

const columnHelper = createColumnHelper<string>()

function createLogHeader(container: string, refetch) {
  return function Header(): ReactElement {
    const theme = useTheme()
    const [loading, setLoading] = useState(false)

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
            setLoading(true)
            refetch().finally(() => setLoading(false))
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
}

function LogLine({ getValue }): ReactElement {
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
  sinceSeconds = 180,
}: ContainerLogsProps): ReactElement {
  const { pod } = useOutletContext() as { pod: Pod }
  const size = useWindowSize()
  const { clusterId } = useParams()
  const containerRef = createRef<HTMLDivElement>()
  const [containerHeight, setContainerHeight] = useState(0)

  const { data, refetch } = usePodLogsQuery({
    variables: {
      name: pod.metadata.name!,
      namespace: pod.metadata.namespace!,
      clusterId,
      container,
      sinceSeconds,
    },
    fetchPolicy: 'no-cache',
  })

  const logs = useMemo(
    () =>
      (data?.pod?.logs as Array<string>)?.filter((l) => !!l).reverse() ?? [],
    [data]
  )

  useEffect(() => {
    if (!containerRef.current) return

    setContainerHeight(containerRef.current.clientHeight)
  }, [containerRef, size])

  return data ? (
    <div
      ref={containerRef}
      css={{
        height: '100%',
        ' td': { padding: '1px 0', minHeight: '30px' },
        ' .thSortIndicatorWrap > div': { width: '100%' },
      }}
    >
      <Table
        height={containerHeight}
        virtualizeRows
        onRowClick={() => {}}
        columns={[
          columnHelper.accessor((row) => row, {
            id: 'header',
            header: createLogHeader(container, refetch),
            cell: LogLine,
          }),
        ]}
        data={logs}
        emptyStateProps={{ message: 'No logs found to display' }}
      />
    </div>
  ) : (
    <LoadingIndicator />
  )
}

export default ContainerLogs
