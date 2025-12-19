import {
  CaretRightIcon,
  Chip,
  ChipProps,
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
  InfraResearchStatus,
  useInfraResearchesQuery,
} from 'generated/graphql'
import { capitalize, isEmpty } from 'lodash'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AI_INFRA_RESEARCH_REL_PATH } from 'routes/aiRoutesConsts'
import { fromNow } from 'utils/datetime'
import { mapExistingNodes } from 'utils/graphql'
import { getAIBreadcrumbs } from '../AI'
import { getInfraResearchDefaultTab } from './details/InfraResearch'
import { exampleCards, InfraResearchExampleCard } from './InfraResearchExamples'
import { InfraResearchInput } from './InfraResearchInput'

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

  useSetBreadcrumbs(useMemo(() => getInfraResearchesBreadcrumbs(), []))

  return (
    <Flex
      direction="column"
      gap="xlarge"
      overflow="auto"
    >
      <Flex
        direction="column"
        gap="large"
        paddingRight={160}
      >
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
        <Divider backgroundColor="border" />
        {isEmpty(infraResearches) && (
          <Title2H1>What is your investigation question?</Title2H1>
        )}
        <InfraResearchInput />
        <Flex gap="xsmall">
          {exampleCards.map((card) => (
            <InfraResearchExampleCard
              key={card.title}
              {...card}
            />
          ))}
        </Flex>
      </Flex>
      {!isEmpty(infraResearches) && !error && (
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
          />
          {error ? (
            <GqlError error={error} />
          ) : (
            <Table
              hideHeader
              fullHeightWrap
              virtualizeRows
              rowBg="raised"
              loading={!data && loading}
              data={infraResearches}
              columns={columns}
              hasNextPage={pageInfo?.hasNextPage}
              fetchNextPage={fetchNextPage}
              isFetchingNextPage={loading}
              onVirtualSliceChange={setVirtualSlice}
              emptyStateProps={{ message: 'No infra research runs found.' }}
              getRowLink={({ original }) => {
                const { id, status } = original as InfraResearchFragment
                return (
                  <Link to={`${id}/${getInfraResearchDefaultTab(status)}`} />
                )
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
    cell: ({ getValue }) => <InfraResearchStatusChip status={getValue()} />,
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

function statusSeverity(status: InfraResearchStatus) {
  switch (status) {
    case InfraResearchStatus.Completed:
      return 'success'
    case InfraResearchStatus.Failed:
      return 'danger'
    default:
      return 'info'
  }
}

export function InfraResearchStatusChip({
  status,
  ...props
}: {
  status: Nullable<InfraResearchStatus>
} & ChipProps) {
  if (!status) return null
  return (
    <Chip
      {...props}
      severity={statusSeverity(status)}
    >
      {capitalize(status)}
    </Chip>
  )
}
