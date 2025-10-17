import {
  Button,
  Card,
  ChatOutlineIcon,
  GearTrainIcon,
  Table,
} from '@pluralsh/design-system'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData.tsx'
import {
  ChatThreadTinyFragment,
  useChatThreadsQuery,
} from 'generated/graphql.ts'
import { ReactNode, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { GLOBAL_SETTINGS_ABS_PATH } from '../../routes/settingsRoutesConst.tsx'

import { createColumnHelper } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert.tsx'
import { isEmpty } from 'lodash'
import { CSSProperties, useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql.ts'
import { Body1BoldP } from '../utils/typography/Text.tsx'
import { AITableEntry, sortThreadsOrPins } from './AITableEntry.tsx'

const columnHelper = createColumnHelper<ChatThreadTinyFragment>()

export function AIThreads() {
  const { error, data, loading, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData({
      queryHook: useChatThreadsQuery,
      keyPath: ['chatThreads'],
    })

  const filteredThreads = useMemo(
    () => mapExistingNodes(data?.chatThreads)?.sort(sortThreadsOrPins),
    [data?.chatThreads]
  )

  if (error) return <GqlError error={error} />
  if (data && isEmpty(filteredThreads))
    return (
      <EmptyStateCompact
        icon={
          <ChatOutlineIcon
            color="icon-primary"
            size={24}
          />
        }
        message="No chat threads found."
        description="Conversations with Plural AI will appear here."
      />
    )

  return (
    <Table
      rowBg="raised"
      hideHeader
      fullHeightWrap
      virtualizeRows
      padCells={false}
      data={filteredThreads}
      columns={columns}
      loading={!data && loading}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
      emptyStateProps={{ message: 'No threads found.' }}
    />
  )
}

export function EmptyStateCompact({
  message,
  description,
  icon,
  children,
  cssProps,
}: {
  message: string
  description: string
  icon: ReactNode
  children?: ReactNode
  cssProps?: CSSProperties
}) {
  const theme = useTheme()

  return (
    <Card
      css={{
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.xxsmall,
        height: '100%',
        justifyContent: 'center',
        padding: theme.spacing.xlarge,
        ...cssProps,
      }}
    >
      <div css={{ margin: theme.spacing.medium }}>{icon}</div>
      <Body1BoldP>{message}</Body1BoldP>
      <p
        css={{
          color: theme.colors['text-xlight'],
          maxWidth: 480,
          textAlign: 'center',
        }}
      >
        {description}
      </p>
      <div css={{ margin: theme.spacing.medium }}>{children}</div>
    </Card>
  )
}

export function AIDisabledState({ cssProps }: { cssProps?: CSSProperties }) {
  const navigate = useNavigate()

  return (
    <EmptyStateCompact
      cssProps={{ justifyContent: 'start', ...cssProps }}
      icon={
        <img
          src="/ai.png"
          alt="Plural AI features are disabled"
          width={480}
        />
      }
      message="Plural AI features are disabled"
      description="Leverage Plural's unique real-time telemetry to automate diagnostics, receive precise fix recommendations, and keep your team informed with instant insights across all clusters."
    >
      <Button
        startIcon={<GearTrainIcon />}
        onClick={() => navigate(`${GLOBAL_SETTINGS_ABS_PATH}/ai-provider`)}
      >
        Go to settings
      </Button>
    </EmptyStateCompact>
  )
}

// putting the whole row into a single column, easier to customize
export const columns = [
  columnHelper.accessor((thread) => thread, {
    id: 'row',
    cell: function Cell({ getValue }) {
      return <AITableEntry thread={getValue()} />
    },
  }),
]
