import { DiscoverIcon, Flex, IconFrame, Table } from '@pluralsh/design-system'
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
import { agentRunExamples, AIExampleCard } from '../AIExampleCard'
import { AIAgentRunInput } from './AIAgentRunInput'
import { agentRunsCols } from './AIAgentRunsTableCols'
import { AIAgentRuntimesSelector } from './AIAgentRuntimesSelector'
import { CreateAgentRunModal } from './CreateAgentRun'

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
        <AIAgentRunInput />
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

const PromptSectionSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  paddingRight: 160,
  [`@container (max-width: ${theme.breakpoints.desktop}px)`]: {
    paddingRight: theme.spacing.small,
  },
}))
