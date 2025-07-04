import {
  ArrowTopRightIcon,
  Button,
  Callout,
  Card,
  Flex,
  MagicWandIcon,
  Markdown,
  PrOpenIcon,
  Table,
} from '@pluralsh/design-system'
import { AiStream } from 'components/ai/chatbot/AISuggestFix'
import { PRA_DOCS_URL } from 'components/self-service/pr/automations/PrAutomations'
import {
  ColDocumentation,
  ColName,
  ColRepo,
  ColRole,
  ColSelect,
} from 'components/self-service/pr/automations/PrAutomationsColumns'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import {
  PrAutomationFragment,
  PrRole,
  usePrAutomationsQuery,
  useSuggestScalingRecommendationMutation,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useEffect, useMemo, useRef } from 'react'
import styled, { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { MethodType } from './CreateRecommendationPrModal'

export function SelectPrTypeStep({
  type,
  setType,
}: {
  type: MethodType
  setType: (type: MethodType) => void
}) {
  return (
    <Flex gap="medium">
      <PrTypeCardSC
        clickable
        $selected={type === 'pra'}
        onClick={() => setType('pra')}
      >
        <PrOpenIcon size={24} />
        <StackedText
          first="Select a PR automation"
          firstPartialType="body2Bold"
          firstColor="text"
          second="Choose from a list of filtered PR automations to optimize costs."
        />
      </PrTypeCardSC>
      <PrTypeCardSC
        clickable
        $selected={type === 'aiGen'}
        onClick={() => setType('aiGen')}
      >
        <MagicWandIcon size={24} />
        <StackedText
          first="AI-generated PR"
          firstPartialType="body2Bold"
          firstColor="text"
          second="Preview and create an AI-generated PR to optimize costs."
        />
      </PrTypeCardSC>
    </Flex>
  )
}
const PrTypeCardSC = styled(Card)<{ $selected: boolean }>(
  ({ theme, $selected }) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.medium,
    maxWidth: 272,
    textAlign: 'center',
    padding: theme.spacing.large,
    transition: 'border-color 0.2s ease-in-out',
    borderColor: theme.colors[$selected ? 'border-selected' : 'border-input'],
    backgroundColor: theme.colors[$selected ? 'fill-one-selected' : 'fill-one'],
  })
)

export function SelectPrAutomationStep({
  selectFn,
}: {
  selectFn: (prAutomation: PrAutomationFragment) => void
}) {
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: usePrAutomationsQuery, keyPath: ['prAutomations'] },
      { role: PrRole.Cost }
    )

  const prAutomations = useMemo(
    () => mapExistingNodes(data?.prAutomations),
    [data?.prAutomations]
  )

  if (error) return <GqlError error={error} />
  if (isEmpty(prAutomations) && !loading)
    return (
      <Callout
        severity="warning"
        title={
          <StackedText
            first="There are no available PR automations"
            firstPartialType="body1Bold"
            firstColor="text"
            second="If you'd like to set one up, visit the docs to learn how."
            secondPartialType="body2LooseLineHeight"
            secondColor="text-light"
          />
        }
      >
        <Button
          as="a"
          secondary
          href={PRA_DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          endIcon={<ArrowTopRightIcon />}
          style={{
            width: 'fit-content',
            color: 'inherit',
            textDecoration: 'none',
          }}
        >
          PR automation docs
        </Button>
      </Callout>
    )

  return (
    <Table
      fullHeightWrap
      virtualizeRows
      fillLevel={2}
      rowBg="base"
      data={prAutomations}
      loading={!data && loading}
      columns={prAutomationCols}
      reactTableOptions={{ meta: { selectFn } }}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
    />
  )
}

export function PreviewPrStep({ scalingRecId }: { scalingRecId: string }) {
  const { spacing } = useTheme()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [generatePreview, { data, loading, error }] =
    useSuggestScalingRecommendationMutation({ variables: { id: scalingRecId } })
  const previewLoading = !data?.suggestScalingRecommendation || loading

  useEffect(() => {
    generatePreview()
  }, [generatePreview])

  if (error) return <GqlError error={error} />

  return (
    <Card
      ref={wrapperRef}
      css={{
        padding: spacing.medium,
        overflow: 'auto',
        '& code': { backgroundColor: 'transparent' },
      }}
    >
      {previewLoading ? (
        <AiStream
          recommendationId={scalingRecId}
          scrollToBottom={() => {
            wrapperRef.current?.scrollTo({
              top: wrapperRef.current?.scrollHeight,
              behavior: 'smooth',
            })
          }}
          setStreaming={() => {}}
        />
      ) : (
        <Markdown text={data?.suggestScalingRecommendation ?? ''} />
      )}
    </Card>
  )
}

const prAutomationCols = [
  ColName,
  ColDocumentation,
  ColRepo,
  ColRole,
  ColSelect,
]
