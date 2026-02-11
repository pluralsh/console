import {
  CaretRightIcon,
  Divider,
  Flex,
  IconFrame,
  Table,
  TelescopeIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { CaptionP, Title2H1 } from 'components/utils/typography/Text'
import {
  InfraResearchFragment,
  useInfraResearchesQuery,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AI_INFRA_RESEARCH_REL_PATH } from 'routes/aiRoutesConsts'
import styled from 'styled-components'
import { fromNow } from 'utils/datetime'
import { mapExistingNodes } from 'utils/graphql'
import { getAIBreadcrumbs } from '../AI'
import { InfraResearchInput } from './InfraResearchInput'
import { RunStatusChip } from './details/InfraResearch'
import { AIExampleCard, infraResearchExamples } from '../AIExampleCard'

export const getInfraResearchesBreadcrumbs = () =>
  getAIBreadcrumbs(AI_INFRA_RESEARCH_REL_PATH)

export function InfraResearches() {
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData({
      queryHook: useInfraResearchesQuery,
      keyPath: ['infraResearches'],
    })
  const infraResearches = useMemo(
    () => mapExistingNodes(data?.infraResearches),
    [data?.infraResearches]
  )
  const isLoading = !data && loading
  const noExistingData = isEmpty(infraResearches) && !(isLoading || error)

  useSetBreadcrumbs(useMemo(() => getInfraResearchesBreadcrumbs(), []))

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
              gap="xxsmall"
              align="center"
              height={40}
            >
              <IconFrame
                size="small"
                icon={<TelescopeIcon />}
              />
              <span>Infrastructure research</span>
            </Flex>
          }
          firstPartialType="body2Bold"
          firstColor="text"
          second="Run an agentic investigation to generate an architecture diagram of your infrastructure. Plural AI uses its semantic index, references source code, and live queries Kuberenetes when necessary to gather relevant data."
          secondPartialType="body2"
          secondColor="text-light"
          gap="xsmall"
        />
        {noExistingData && (
          <>
            <Divider backgroundColor="border" />
            <Title2H1>What is your investigation question?</Title2H1>
          </>
        )}
        <InfraResearchInput />
        <Flex
          gap="xsmall"
          overflow="auto"
          css={{ [`@container (max-width: ${800}px)`]: { display: 'none' } }}
        >
          {infraResearchExamples.map((card) => (
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
            first="Research questions"
            firstPartialType="body2Bold"
            firstColor="text"
            second="Previous prompts and questions"
            secondPartialType="body2"
            secondColor="text-light"
            loading={isLoading}
          />
          {error ? (
            <GqlError error={error} />
          ) : (
            <Table
              hideHeader
              fullHeightWrap
              virtualizeRows
              loading={isLoading}
              data={infraResearches}
              columns={columns}
              hasNextPage={pageInfo?.hasNextPage}
              fetchNextPage={fetchNextPage}
              isFetchingNextPage={loading}
              onVirtualSliceChange={setVirtualSlice}
              emptyStateProps={{ message: 'No infra research runs found.' }}
              getRowLink={({ original }) => {
                const { id } = original as InfraResearchFragment
                return <Link to={id} />
              }}
            />
          )}
        </Flex>
      )}
    </Flex>
  )
}

const columnHelper = createColumnHelper<InfraResearchFragment>()

const columns = [
  columnHelper.accessor('prompt', {
    id: 'prompt',
    header: 'Prompt',
    meta: { gridTemplate: '1fr', truncate: true },
  }),
  columnHelper.accessor('insertedAt', {
    id: 'createdAt',
    cell: ({ getValue }) => (
      <CaptionP $color="text-xlight">{fromNow(getValue())}</CaptionP>
    ),
  }),
  columnHelper.accessor('status', {
    id: 'status',
    header: 'Status',
    cell: ({ getValue }) => (
      <RunStatusChip
        fillLevel={2}
        status={getValue()}
      />
    ),
  }),
  columnHelper.accessor(({ id }) => id, {
    id: 'actions',
    header: '',
    cell: ({ getValue }) => {
      return (
        <IconFrame
          clickable
          as={Link}
          to={getValue()}
          tooltip="View details"
          icon={<CaretRightIcon />}
        />
      )
    },
  }),
]

const PromptSectionSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  paddingRight: 160,
  [`@container (max-width: ${theme.breakpoints.desktop}px)`]: {
    paddingRight: theme.spacing.small,
  },
}))
