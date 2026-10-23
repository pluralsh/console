import { Flex, Table } from '@pluralsh/design-system'
import { PageToolbarPortal } from 'components/layout/PageToolbar'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { AgentRunFragment } from 'generated/graphql'
import { AgentRunsDocument } from 'generated/graphql-documents'
import { isEmpty } from 'lodash'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { agentRunExamples, AIExampleCard } from '../AIExampleCard'
import { AIAgentRunInput } from './AIAgentRunInput'
import { agentRunsCols } from './AIAgentRunsTableCols'
import { AIAgentRuntimesSelector } from './AIAgentRuntimesSelector'
import { CreateAgentRunModal } from './CreateAgentRun'

export function AIAgentRuns() {
  const { spacing } = useTheme()
  const [selectedRuntimeId, setSelectedRuntimeId] = useState<Nullable<string>>()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { query: AgentRunsDocument, keyPath: ['agentRuns'] },
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
      paddingRight={spacing.small}
    >
      {!noExistingData && (
        <PageToolbarPortal>
          <AIAgentRuntimesSelector
            allowDeselect
            size="small"
            width={240}
            outerStyles={{
              width: 240,
              '.triggerButton .arrow svg': { height: 12, width: 12 },
            }}
            selectedRuntimeId={selectedRuntimeId}
            setSelectedRuntimeId={setSelectedRuntimeId}
          />
        </PageToolbarPortal>
      )}
      <PromptSectionSC>
        <StackedText
          first="Agent Runs"
          firstPartialType="body2Bold"
          firstColor="text"
          second="Create a background agent for managing infrastructure changes. It works directly on your active Infrastructure as Code in Plural, making clear and incremental updates."
          secondPartialType="body2"
          secondColor="text-light"
          gap="xxsmall"
        />
        <AIAgentRunInput />
        <Flex
          gap="xsmall"
          overflow="auto"
          css={{ '@container (max-width: 800px)': { display: 'none' } }}
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
          <StackedText
            first="Agent Run Sessions"
            firstPartialType="body2Bold"
            firstColor="text"
            second="Current and previous agent runs"
            secondPartialType="body2"
            secondColor="text-light"
            gap="xxsmall"
            loading={isLoading}
          />
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
  paddingRight: '10rem',
  [`@container (max-width: ${theme.breakpoints.desktop}px)`]: {
    paddingRight: 0,
  },
}))
