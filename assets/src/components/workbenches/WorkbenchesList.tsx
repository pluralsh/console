import {
  ArrowRightIcon,
  Button,
  Card,
  Flex,
  IconFrame,
  PlusIcon,
} from '@pluralsh/design-system'
import * as DesignSystem from '@pluralsh/design-system'
import {
  CardGrid,
  CardGridSkeleton,
} from 'components/self-service/catalog/CatalogsGrid'
import { WorkbenchTabHeader } from 'components/workbenches/common/WorkbenchTabHeader'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { Body2P, CaptionP } from 'components/utils/typography/Text'
import { WorkbenchTinyFragment, useWorkbenchesQuery } from 'generated/graphql'
import { Link } from 'react-router-dom'
import { WORKBENCHES_CREATE_REL_PATH } from 'routes/workbenchesRoutesConsts'
import { ComponentType } from 'react'
import styled, { useTheme } from 'styled-components'
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
        description="Configurable, reusable agent definitions for common DevOps tasks. Each workbench bundles prompts, tools, and skills that can spawn multiple agents on demand."
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
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Button
              small
              as={Link}
              to={WORKBENCHES_CREATE_REL_PATH}
              startIcon={<PlusIcon />}
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
  const { spacing } = useTheme()
  const { id, name, description, tools: t, repository } = workbench
  const tools = t?.filter(isNonNullable) ?? []
  return (
    <CardSC
      clickable
      forwardedAs={Link}
      to={id}
    >
      <StackedText
        first={name}
        firstPartialType="body2Bold"
        firstColor="text"
        second={repository?.httpsPath}
      />
      <Body2P
        $color="text-light"
        css={{ flex: 1 }}
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
        <ArrowRightIcon
          color="icon-xlight"
          size={spacing.xlarge}
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
