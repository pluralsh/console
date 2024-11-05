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
import { AIPinsTable } from './AIPinsTable.tsx'
import { AIThreadsTable } from './AIThreadsTable.tsx'
import { useDeploymentSettings } from 'components/contexts/DeploymentSettingsContext.tsx'
import { GlobalSettingsAiProvider } from 'components/settings/global/GlobalSettingsAiProvider.tsx'

export const breadcrumbs = [{ label: 'plural ai' }]

export default function AI() {
  useSetBreadcrumbs(breadcrumbs)

  const settings = useDeploymentSettings()

  return settings.ai?.enabled ? <AIEnabled /> : <AiDisabled />
}

function AiDisabled() {
  return (
    <Flex
      direction="column"
      gap="medium"
      padding="large"
      marginBottom={30}
      height="100%"
      overflow="hidden"
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
        ?.filter((pin): pin is AiPinFragment => Boolean(pin)) ?? [],
    [pinsQuery.data?.aiPins?.edges]
  )

  const filteredThreads = useMemo(
    () =>
      threadsQuery.data?.chatThreads?.edges
        ?.map((edge) => edge?.node)
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
      padding="large"
      marginBottom={30}
      height="100%"
      overflow="hidden"
    >
      <Header />
      <Flex
        direction="column"
        gap="xlarge"
        height="100%"
      >
        <PinnedSection
          filteredPins={filteredPins}
          pinsQuery={pinsQuery}
        />
        <AllThreadsSection
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
      gap="medium"
      maxHeight="40%"
    >
      <StackedText
        first="Pinned"
        second="Pin important threads and insights."
        firstPartialType="subtitle2"
        secondPartialType="body2"
      />
      <AIPinsTable
        filteredPins={filteredPins}
        pinsQuery={pinsQuery}
      />
    </Flex>
  )
}

function AllThreadsSection({
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
        first="All threads"
        firstPartialType="subtitle2"
      />
      <AIThreadsTable
        filteredThreads={filteredThreads}
        threadsQuery={threadsQuery}
      />
    </Flex>
  )
}
