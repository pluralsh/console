import {
  ArrowTopRightIcon,
  Breadcrumb,
  Button,
  Flex,
  FlowIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { EmptyStateCompact } from 'components/ai/AIThreads'
import { CardGrid } from 'components/catalog/CatalogsGrid'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { Body2P, InlineA, Subtitle1H1 } from 'components/utils/typography/Text'
import { useFlowsQuery } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useNavigate } from 'react-router-dom'
import { AI_MCP_SERVERS_ABS_PATH } from 'routes/aiRoutesConsts'
import { FLOWS_ABS_PATH } from 'routes/flowRoutesConsts'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { FlowCard } from './FlowCard'

const breadcrumbs: Breadcrumb[] = [{ label: 'flows', url: FLOWS_ABS_PATH }]
export const FLOW_DOCS_URL = 'https://docs.plural.sh/plural-features/flows'

export function Flows() {
  useSetBreadcrumbs(breadcrumbs)
  const navigate = useNavigate()
  const { data, error, loading, pageInfo, refetch, fetchNextPage } =
    useFetchPaginatedData({
      queryHook: useFlowsQuery,
      keyPath: ['flows'],
    })

  const flows = mapExistingNodes(data?.flows)

  if (!data && loading) return <LoadingIndicator />

  return (
    <WrapperSC>
      <HeaderSC>
        <Flex direction="column">
          <Subtitle1H1>Flows</Subtitle1H1>
          <Body2P $color="text-light">
            Organize services, pipelines, MCP servers, and more into holistic
            units. <InlineA href={FLOW_DOCS_URL}>Learn more</InlineA>
          </Body2P>
        </Flex>
        <Button
          secondary
          endIcon={<ArrowTopRightIcon />}
          onClick={() => navigate(AI_MCP_SERVERS_ABS_PATH)}
        >
          Manage MCP Servers
        </Button>
      </HeaderSC>
      {error && <GqlError error={error} />}
      {isEmpty(flows) ? (
        <FlowEmptyState />
      ) : (
        <CardGrid
          styles={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(370px, 1fr))',
            gridAutoRows: 'min-content',
          }}
          onBottomReached={() =>
            !loading && pageInfo?.hasNextPage && fetchNextPage()
          }
        >
          {flows.map((flow) => (
            <FlowCard
              key={flow.id}
              flow={flow}
              refetch={refetch}
            />
          ))}
        </CardGrid>
      )}
    </WrapperSC>
  )
}

function FlowEmptyState() {
  return (
    <EmptyStateCompact
      message="You do not have any Flows yet"
      description="You can generate your first one via CRD"
      cssProps={{ height: 'fit-content' }}
      icon={
        <FlowIcon
          color="icon-primary"
          size={32}
        />
      }
    >
      <Button
        as="a"
        href={FLOW_DOCS_URL}
        target="_blank"
        rel="noopener noreferrer"
        endIcon={<ArrowTopRightIcon />}
      >
        Read the docs
      </Button>
    </EmptyStateCompact>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  height: '100%',
  width: '100%',
  maxWidth: theme.breakpoints.desktop,
  alignSelf: 'center',
  overflow: 'hidden',
  padding: theme.spacing.large,
}))

const HeaderSC = styled.div({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
})
