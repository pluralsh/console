import {
  ArrowRightIcon,
  Button,
  Card,
  Flex,
  IconFrame,
  AddIcon,
} from '@pluralsh/design-system'
import * as DesignSystem from '@pluralsh/design-system'
import {
  CardGrid,
  CardGridSkeleton,
} from 'components/self-service/catalog/CatalogsGrid'
import { WorkbenchTabHeader } from 'components/workbenches/common/WorkbenchTabHeader'
import { runtimeToIcon } from 'components/settings/ai/agent-runtimes/AIAgentRuntimeIcon'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { TRUNCATE_LEFT } from 'components/utils/truncate'
import { Body2BoldP, Body2P, CaptionP } from 'components/utils/typography/Text'
import {
  AgentRuntimeType,
  WorkbenchTinyFragment,
  useWorkbenchesQuery,
} from 'generated/graphql'
import { Link } from 'react-router-dom'
import { WORKBENCHES_CREATE_REL_PATH } from 'routes/workbenchesRoutesConsts'
import { ComponentType } from 'react'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { WorkbenchToolIcon } from './tools/workbenchToolsUtils'

const WorkbenchIcon = (DesignSystem as { WorkbenchIcon?: ComponentType })
  .WorkbenchIcon

export function WorkbenchesList() {
  const { data, error, loading, pageInfo, fetchNextPage } =
    useFetchPaginatedData({
      queryHook: useWorkbenchesQuery,
      keyPath: ['workbenches'],
    })
  const workbenches = mapExistingNodes(data?.workbenches)

  return (
    <WrapperSC>
      <WorkbenchTabHeader
        title="Workbenches"
        icon={WorkbenchIcon ? <WorkbenchIcon /> : undefined}
        description="Build-your-own agents for common DevOps tasks. Each workbench bundles tools and skills that and orchestrates subagents tailored to observability, infra analysis and coding tasks."
      />
      {error && <GqlError error={error} />}
      {!data && loading ? (
        <CardGridSkeleton count={6} />
      ) : (
        <CardGrid
          onBottomReached={() =>
            !loading && pageInfo?.hasNextPage && fetchNextPage()
          }
        >
          <CardSC
            css={{
              background: 'transparent',
              borderStyle: 'dashed',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Button
              small
              as={Link}
              to={WORKBENCHES_CREATE_REL_PATH}
              startIcon={<AddIcon />}
            >
              Create Workbench
            </Button>
          </CardSC>
          {workbenches.map((workbench) => (
            <WorkbenchCard
              key={workbench.id}
              workbench={workbench}
            />
          ))}
        </CardGrid>
      )}
    </WrapperSC>
  )
}

function WorkbenchCard({ workbench }: { workbench: WorkbenchTinyFragment }) {
  const { id, name, description, agentRuntime, tools: t } = workbench

  const tools = t?.filter(isNonNullable) ?? []

  const RuntimeIcon =
    runtimeToIcon[agentRuntime?.type ?? AgentRuntimeType.Custom]

  return (
    <CardSC
      clickable
      forwardedAs={Link}
      to={id}
    >
      <Flex
        direction="column"
        minWidth={0}
      >
        <Body2BoldP>{name}</Body2BoldP>
        {agentRuntime?.name && (
          <Flex
            align="center"
            gap="xxsmall"
            minWidth={0}
          >
            <RuntimeIcon
              fullColor
              size={12}
            />
            <CaptionP
              $color="text-xlight"
              css={{ ...TRUNCATE_LEFT, minWidth: 0 }}
            >
              {agentRuntime.name}
            </CaptionP>
          </Flex>
        )}
      </Flex>
      <Body2P
        $color="text-light"
        css={{
          flex: 1,
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 2,
          overflow: 'hidden',
        }}
      >
        {description}
      </Body2P>
      <Flex
        gap="xsmall"
        align="center"
        height={32}
      >
        {tools.slice(0, 3).map((tool) => (
          <IconFrame
            key={tool.id}
            circle
            type="secondary"
            icon={<WorkbenchToolIcon type={tool.tool} />}
          />
        ))}
        {tools.length > 3 && (
          <IconFrame
            circle
            type="secondary"
            icon={<CaptionP $color="text-xlight">+{tools.length - 3}</CaptionP>}
          />
        )}
        <div css={{ flex: 1 }} />
        <IconFrame
          icon={<ArrowRightIcon color="icon-xlight" />}
          size={'small'}
        />
      </Flex>
    </CardSC>
  )
}

const CardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  padding: theme.spacing.medium,
  height: '100%',
  minHeight: 164,
  textDecoration: 'none',
}))

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  overflow: 'hidden',
  height: '100%',
}))
