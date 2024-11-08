import {
  Button,
  Flex,
  GearTrainIcon,
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
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { GLOBAL_SETTINGS_ABS_PATH } from '../../routes/settingsRoutesConst.tsx'

import { useDeploymentSettings } from 'components/contexts/DeploymentSettingsContext.tsx'
import { GlobalSettingsAiProvider } from 'components/settings/global/GlobalSettingsAiProvider.tsx'
import { ResponsivePageFullWidth } from '../utils/layout/ResponsivePageFullWidth.tsx'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap.tsx'
import { AITable } from './AITable.tsx'
import { sortThreadsOrPins } from './AITableEntry.tsx'

export const breadcrumbs = [{ label: 'plural ai' }]

export default function AI() {
  const settings = useDeploymentSettings()

  useSetBreadcrumbs(breadcrumbs)

  return (
    <ResponsivePageFullWidth
      noPadding
      maxContentWidth={1080}
    >
      {settings.ai?.enabled ? <AIEnabled /> : <AiDisabled />}
    </ResponsivePageFullWidth>
  )
}

function AiDisabled() {
  return (
    <Flex
      direction="column"
      gap="medium"
      paddingBottom="large"
      height="100%"
    >
      <Flex
        justify="space-between"
        align="center"
      >
        <StackedText
          first="Plural AI"
          second="You have yet to enable AI, set everything up below."
          firstPartialType="subtitle1"
          secondPartialType="body2"
        />
      </Flex>
      <GlobalSettingsAiProvider />
    </Flex>
  )
}

function AIEnabled() {
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

  return (
    <Flex
      direction="column"
      gap="medium"
      paddingBottom="48px"
      height="100%"
      overflow="hidden"
    >
      <Header />
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
    </Flex>
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
        <AITable
          query={pinsQuery}
          rowData={filteredPins}
        />
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
        <AITable
          query={threadsQuery}
          rowData={filteredThreads}
        />
      </FullHeightTableWrap>
    </Flex>
  )
}
