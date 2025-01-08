import {
  Button,
  Card,
  ChatOutlineIcon,
  Flex,
  GearTrainIcon,
  PushPinFilledIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { StackedText } from 'components/utils/table/StackedText.tsx'
import {
  FetchPaginatedDataResult,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData.tsx'
import {
  AiPinFragment,
  AiPinsQuery,
  ChatThreadTinyFragment,
  ChatThreadsQuery,
  useAiPinsQuery,
  useChatThreadsQuery,
} from 'generated/graphql.ts'
import { ReactNode, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { GLOBAL_SETTINGS_ABS_PATH } from '../../routes/settingsRoutesConst.tsx'

import { ResponsivePageFullWidth } from '../utils/layout/ResponsivePageFullWidth.tsx'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap.tsx'
import { AITable } from './AITable.tsx'
import { sortThreadsOrPins } from './AITableEntry.tsx'
import { useAIEnabled } from '../contexts/DeploymentSettingsContext.tsx'
import { CSSProperties, useTheme } from 'styled-components'
import { Body1BoldP } from '../utils/typography/Text.tsx'
import { isEmpty } from 'lodash'
import LoadingIndicator from '../utils/LoadingIndicator.tsx'

export const breadcrumbs = [{ label: 'plural ai' }]

export default function AI() {
  const aiEnabled = useAIEnabled()

  const threadsQuery = useFetchPaginatedData({
    queryHook: useChatThreadsQuery,
    keyPath: ['chatThreads'],
  })

  const pinsQuery = useFetchPaginatedData({
    queryHook: useAiPinsQuery,
    keyPath: ['aiPins'],
  })

  const filteredPins = useMemo(
    () =>
      pinsQuery.data?.aiPins?.edges
        ?.map((edge) => edge?.node)
        ?.sort(sortThreadsOrPins)
        ?.filter((pin): pin is AiPinFragment => Boolean(pin)) ?? [],
    [pinsQuery.data?.aiPins?.edges]
  )

  const filteredThreads = useMemo(
    () =>
      threadsQuery.data?.chatThreads?.edges
        ?.map((edge) => edge?.node)
        ?.sort(sortThreadsOrPins)
        ?.filter(
          (thread) => !filteredPins.some((pin) => pin.thread?.id === thread?.id)
        )
        ?.filter((thread): thread is ChatThreadTinyFragment =>
          Boolean(thread)
        ) ?? [],
    [filteredPins, threadsQuery.data?.chatThreads?.edges]
  )

  useSetBreadcrumbs(breadcrumbs)

  if (aiEnabled === undefined) return <LoadingIndicator />

  return (
    <ResponsivePageFullWidth
      noPadding
      maxContentWidth={1080}
    >
      <Flex
        direction="column"
        gap="medium"
        paddingBottom="48px"
        height="100%"
        overflow="hidden"
      >
        <Header />
        {aiEnabled ? (
          <Flex
            direction="column"
            gap="large"
            height="100%"
          >
            <PinnedSection
              filteredPins={filteredPins}
              pinsQuery={pinsQuery}
            />
            <ThreadsSection
              filteredThreads={filteredThreads}
              threadsQuery={threadsQuery}
            />
          </Flex>
        ) : (
          <AIDisabledState />
        )}
      </Flex>
    </ResponsivePageFullWidth>
  )
}

function Header() {
  const navigate = useNavigate()
  return (
    <Flex
      justify="space-between"
      align="center"
    >
      <StackedText
        first="Plural AI"
        second="View ongoing threads and saved insights at a glance."
        firstPartialType="subtitle1"
        secondPartialType="body2"
      />
      <Button
        secondary
        startIcon={<GearTrainIcon />}
        onClick={() => navigate(`${GLOBAL_SETTINGS_ABS_PATH}/ai-provider`)}
      >
        Settings
      </Button>
    </Flex>
  )
}

function PinnedSection({
  filteredPins,
  pinsQuery,
}: {
  filteredPins: AiPinFragment[]
  pinsQuery: FetchPaginatedDataResult<AiPinsQuery>
}) {
  return (
    <Flex
      direction="column"
      gap="small"
      maxHeight="40%"
    >
      <StackedText
        first="Pins"
        firstPartialType="subtitle2"
      />
      <FullHeightTableWrap>
        {isEmpty(filteredPins) && pinsQuery.data ? (
          <AIEmptyState
            icon={
              <PushPinFilledIcon
                color="icon-primary"
                size={24}
              />
            }
            message="No pinned threads or insights"
            description="Click on the pin icon of any thread or insight to access it here."
          />
        ) : (
          <AITable
            query={pinsQuery}
            rowData={filteredPins}
          />
        )}
      </FullHeightTableWrap>
    </Flex>
  )
}

function ThreadsSection({
  filteredThreads,
  threadsQuery,
}: {
  filteredThreads: ChatThreadTinyFragment[]
  threadsQuery: FetchPaginatedDataResult<ChatThreadsQuery>
}) {
  return (
    <Flex
      direction="column"
      gap="medium"
      flex={1}
      overflow="hidden"
      paddingBottom={36} // this is a magic number to make the table fit
    >
      <StackedText
        first="Other threads"
        firstPartialType="subtitle2"
      />
      <FullHeightTableWrap>
        {isEmpty(filteredThreads) && threadsQuery.data ? (
          <AIEmptyState
            icon={
              <ChatOutlineIcon
                color="icon-primary"
                size={24}
              />
            }
            message="No threads or insights"
            description="Insights will be automatically created and appear here when potential fixes are found."
          />
        ) : (
          <AITable
            query={threadsQuery}
            rowData={filteredThreads}
          />
        )}
      </FullHeightTableWrap>
    </Flex>
  )
}

export function AIEmptyState({
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
    <AIEmptyState
      cssProps={{ justifyContent: 'start', ...cssProps }}
      icon={
        <img
          src="/ai.png"
          alt="Plural AI features are disabled"
          width={480}
        />
      }
      message="Plural AI features are disabled"
      description="Leverage Plural’s unique real-time telemetry to automate diagnostics, receive precise fix recommendations, and keep your team informed with instant insights across all clusters."
    >
      <Button
        startIcon={<GearTrainIcon />}
        onClick={() => navigate(`${GLOBAL_SETTINGS_ABS_PATH}/ai-provider`)}
      >
        Go to settings
      </Button>
    </AIEmptyState>
  )
}
