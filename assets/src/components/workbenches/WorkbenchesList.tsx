import {
  ArrowRightIcon,
  Button,
  Card,
  Flex,
  IconFrame,
  PlusIcon,
  WorkbenchIcon,
} from '@pluralsh/design-system'
import {
  CardGrid,
  CardGridSkeleton,
} from 'components/self-service/catalog/CatalogsGrid'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { Body2P, Title2H1 } from 'components/utils/typography/Text'
import { WorkbenchTinyFragment, useWorkbenchesQuery } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { WorkbenchCreateOrEdit } from './workbench/create-edit/WorkbenchCreateOrEdit'

export function WorkbenchesList() {
  const [isCreating, setIsCreating] = useState(false)
  const { data, error, loading, pageInfo, fetchNextPage } =
    useFetchPaginatedData({
      queryHook: useWorkbenchesQuery,
      keyPath: ['workbenches'],
    })
  const workbenches = mapExistingNodes(data?.workbenches)

  return (
    <WrapperSC>
      {!isCreating && (
        <StackedText
          first={
            <Flex
              align="center"
              height={40}
              gap="xsmall"
            >
              <IconFrame
                size="small"
                icon={<WorkbenchIcon />}
              />
              <span>Workbenches</span>
            </Flex>
          }
          firstPartialType="body2Bold"
          firstColor="text"
          second="Configurable, reusable agent definitions for common DevOps tasks. Each workbench bundles prompts, tools, and skills that can spawn multiple agents on demand."
          secondPartialType="body2"
          secondColor="text-light"
          gap="xsmall"
          css={{ maxWidth: 840 }}
        />
      )}
      {error && <GqlError error={error} />}
      {isCreating ? (
        <>
          <Title2H1>
            Create {isEmpty(workbenches) ? 'your first' : 'a'} workbench
          </Title2H1>
          <WorkbenchCreateOrEdit
            mode="create"
            onCancel={() => setIsCreating(false)}
            onCompleted={() => setIsCreating(false)}
          />
        </>
      ) : !data && loading ? (
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
              startIcon={<PlusIcon />}
              onClick={() => setIsCreating(true)}
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
  return (
    <CardSC
      clickable
      forwardedAs={Link}
      to={workbench.id}
    >
      <Flex
        direction="column"
        gap="xsmall"
      >
        <StackedText
          first={workbench.name}
          firstPartialType="body2Bold"
          firstColor="text"
          second={workbench.repository?.httpsPath}
        />

        <Body2P $color="text-light">{workbench.description}</Body2P>
        <Flex
          gap="xsmall"
          height={32}
        >
          {workbench.tools?.map((tool) => (
            <div key={tool?.id}>{tool?.name}</div>
          )) ?? []}
        </Flex>
      </Flex>
      <ArrowRightIcon
        color="icon-xlight"
        size={spacing.xlarge}
        css={{ alignSelf: 'flex-end', padding: spacing.xsmall }}
      />
    </CardSC>
  )
}

const CardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.small,
  padding: theme.spacing.medium,
  height: '100%',
  textDecoration: 'none',
}))

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  overflow: 'hidden',
  height: '100%',
}))
