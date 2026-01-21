import {
  DiscoverIcon,
  Divider,
  Flex,
  IconFrame,
  Table,
} from '@pluralsh/design-system'
import { ChatSubmitButton } from 'components/ai/chatbot/input/ChatInput'
import { GqlError } from 'components/utils/Alert'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { AgentRunFragment, useAgentRunsQuery } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { agentRunsCols } from './AIAgentRunsTableCols'
import { AIAgentRuntimesSelector } from './AIAgentRuntimesSelector'
import { CreateAgentRunModal } from './CreateAgentRun'
import { agentRunExamples, AIExampleCard } from '../AIExampleCard'

export function AIAgentRuns() {
  const [selectedRuntimeId, setSelectedRuntimeId] = useState<Nullable<string>>()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useAgentRunsQuery, keyPath: ['agentRuns'] },
      { runtimeId: selectedRuntimeId }
    )

  const runs = useMemo(
    () => mapExistingNodes(data?.agentRuns),
    [data?.agentRuns]
  )

  const isLoading = !data && loading
  const noExistingData =
    isEmpty(runs) && !(isLoading || error || selectedRuntimeId)

  return (
    <Flex
      direction="column"
      gap="xlarge"
      overflow="auto"
    >
      <PromptSectionSC>
        <StackedText
          first={
            <Flex
              align="center"
              height={40}
            >
              <IconFrame
                size="small"
                icon={<DiscoverIcon />}
              />
              <span>Agent Runs</span>
            </Flex>
          }
          firstPartialType="body2Bold"
          firstColor="text"
          second="Create a background agent for managing infrastructure changes. It works directly on your active Infrastructure as Code in Plural, making clear and incremental updates."
          secondPartialType="body2"
          secondColor="text-light"
          gap="xsmall"
        />
        {!noExistingData && <Divider backgroundColor="border" />}
        <AgentRunsPromptPlaceholder
          onSubmit={() => setIsCreateModalOpen(true)}
        />
        <Flex
          gap="xsmall"
          overflow="auto"
          css={{ [`@container (max-width: ${800}px)`]: { display: 'none' } }}
        >
          {agentRunExamples.map((card) => (
            <AIExampleCard
              key={card.title}
              {...card}
            />
          ))}
        </Flex>
      </PromptSectionSC>
      {!noExistingData && (
        <Flex
          direction="column"
          gap="small"
          minHeight={260}
        >
          <StretchedFlex>
            <StackedText
              first="Agent Runs"
              firstPartialType="body2Bold"
              firstColor="text"
              second="Current and previous agent runs"
              secondPartialType="body2"
              secondColor="text-light"
              loading={isLoading}
            />
            <AIAgentRuntimesSelector
              allowDeselect
              selectedRuntimeId={selectedRuntimeId}
              setSelectedRuntimeId={setSelectedRuntimeId}
            />
          </StretchedFlex>
          {error ? (
            <GqlError error={error} />
          ) : (
            <Table
              hideHeader
              fullHeightWrap
              virtualizeRows
              data={runs}
              columns={agentRunsCols}
              loading={isLoading}
              hasNextPage={pageInfo?.hasNextPage}
              fetchNextPage={fetchNextPage}
              isFetchingNextPage={loading}
              onVirtualSliceChange={setVirtualSlice}
              emptyStateProps={{ message: 'No runs found.' }}
              getRowLink={({ original }) => {
                const { id } = original as AgentRunFragment
                return <Link to={id} />
              }}
            />
          )}
        </Flex>
      )}
      <CreateAgentRunModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </Flex>
  )
}

function AgentRunsPromptPlaceholder({ onSubmit }: { onSubmit: () => void }) {
  return (
    <PromptInputWrapperSC>
      <PromptPlaceholderTextSC>
        Ask the agent to manage your infrastructure, explore, or analyze.
      </PromptPlaceholderTextSC>
      <PromptFooterSC>
        <Flex
          gap="xsmall"
          wrap="wrap"
        >
          <PlaceholderPillSC>Claude</PlaceholderPillSC>
          <PlaceholderPillSC>Analyze</PlaceholderPillSC>
          <PlaceholderPillSC>Repository / runtime</PlaceholderPillSC>
        </Flex>
        <ChatSubmitButton
          onClick={onSubmit}
          bgColor="fill-primary"
        />
      </PromptFooterSC>
    </PromptInputWrapperSC>
  )
}

const PromptSectionSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  paddingRight: 160,
  [`@container (max-width: ${theme.breakpoints.desktop}px)`]: {
    paddingRight: theme.spacing.small,
  },
}))

const PromptInputWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  position: 'relative',
  minHeight: 130,
  padding: theme.spacing.small,
  borderRadius: theme.borderRadiuses.large,
  backgroundColor: theme.colors['fill-one'],
  border: theme.borders.input,
}))

const PromptPlaceholderTextSC = styled.div(({ theme }) => ({
  color: theme.colors['text-xlight'],
  padding: `${theme.spacing.small}px ${theme.spacing.small}px`,
}))

const PromptFooterSC = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: theme.spacing.small,
  padding: `${theme.spacing.xxsmall}px ${theme.spacing.small}px`,
}))

const PlaceholderPillSC = styled.div(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing.xxsmall,
  padding: `0 ${theme.spacing.small}px`,
  height: 28,
  borderRadius: 25,
  border: theme.borders.input,
  backgroundColor: theme.colors['fill-two'],
  color: theme.colors['text-light'],
  fontSize: 12,
  whiteSpace: 'nowrap',
}))
