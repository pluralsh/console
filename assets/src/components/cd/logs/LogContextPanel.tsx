import {
  Button,
  Card,
  CollapseListIcon,
  ExpandListIcon,
  Flex,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import {
  LogAggregationQueryVariables,
  LogFacet,
  LogLineFragment,
  useLogAggregationLazyQuery,
} from 'generated/graphql'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { LogLine } from './LogLine'

const CONTEXT_SIZE = 50

export function LogContextPanel({
  logLine,
  addLabel,
  queryVars,
  curDuration,
}: {
  logLine: LogLineFragment
  addLabel?: (key: string, value: string) => void
  queryVars: Omit<LogAggregationQueryVariables, 'limit' | 'time' | 'query'>
  curDuration: string
}) {
  const [isShowingMore, setIsShowingMore] = useState(false)
  const selectedLogRef = useRef<HTMLDivElement>(null)

  const [
    fetchBeforeContext,
    { data: beforeData, loading: beforeLoading, error: beforeError },
  ] = useLogAggregationLazyQuery({
    variables: {
      ...queryVars,
      limit: CONTEXT_SIZE,
      time: { before: logLine.timestamp, duration: curDuration },
    },
    fetchPolicy: 'cache-and-network',
  })
  const [
    fetchAfterContext,
    { data: afterData, loading: afterLoading, error: afterError },
  ] = useLogAggregationLazyQuery({
    variables: {
      ...queryVars,
      limit: CONTEXT_SIZE,
      time: { after: logLine.timestamp, duration: curDuration, reverse: true },
    },
    fetchPolicy: 'cache-and-network',
  })

  const logs = useMemo(() => {
    const above =
      afterData?.logAggregation
        ?.filter((l): l is LogLineFragment => !!l && l.log !== logLine.log)
        ?.reverse() ?? []
    const below =
      beforeData?.logAggregation?.filter(
        (l): l is LogLineFragment => !!l && l.log !== logLine.log
      ) ?? []
    return isShowingMore ? [...above, logLine, ...below] : [logLine]
  }, [beforeData, logLine, afterData, isShowingMore])

  const initialLoading =
    (!beforeData && beforeLoading) || (!afterData && afterLoading)

  const facets = logLine.facets?.filter((facet): facet is LogFacet => !!facet)

  const centerMainLog = useCallback(
    ({ smooth = true }: { smooth?: boolean } = {}) => {
      selectedLogRef.current?.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'center',
      })
    },
    [selectedLogRef]
  )

  const handleToggleContext = useCallback(() => {
    if (!beforeData && !afterData) {
      Promise.all([fetchBeforeContext(), fetchAfterContext()]).then(() => {
        centerMainLog({ smooth: false })
      })
    }
    setIsShowingMore((prev) => !prev)
  }, [
    afterData,
    beforeData,
    centerMainLog,
    fetchAfterContext,
    fetchBeforeContext,
  ])

  // render needs to finish before centering
  useEffect(() => {
    if (isShowingMore) centerMainLog({ smooth: false })
  }, [isShowingMore, centerMainLog])

  return (
    <Flex
      direction="column"
      gap="medium"
    >
      {(beforeError || afterError) && (
        <GqlError error={beforeError || afterError} />
      )}
      <Card
        fillLevel={1}
        maxHeight="450px"
        overflow="auto"
        header={{
          size: 'large',
          content: (
            <Flex
              align="center"
              justify="space-between"
              width="100%"
            >
              <span>Log</span>
              <Flex gap="small">
                {isShowingMore && !initialLoading && (
                  <Button
                    small
                    secondary
                    onClick={() => centerMainLog()}
                  >
                    Jump to original log
                  </Button>
                )}
                <Button
                  small
                  secondary
                  loading={initialLoading}
                  disabled={initialLoading}
                  startIcon={
                    isShowingMore ? <CollapseListIcon /> : <ExpandListIcon />
                  }
                  onClick={handleToggleContext}
                >
                  {isShowingMore ? 'Show less context' : 'Show more context'}
                </Button>
              </Flex>
            </Flex>
          ),
        }}
      >
        {logs.map((log, i) => (
          <LogLine
            // index is the only way to distinguish occasional duplicate logs, shouldn't cause an issue in this context
            key={`${log.log}-${i}`}
            ref={log.log === logLine.log ? selectedLogRef : undefined}
            line={log}
            inferLevel={isShowingMore && log.log === logLine.log}
            highlighted={isShowingMore && log.log === logLine.log}
          />
        ))}
      </Card>
      {facets && (
        <FacetsCard
          facets={facets}
          addLabel={addLabel}
        />
      )}
    </Flex>
  )
}
function FacetsCard({
  facets,
  addLabel,
}: {
  facets: LogFacet[]
  addLabel?: (key: string, value: string) => void
}) {
  const theme = useTheme()
  return (
    <Card fillLevel={1}>
      <StackedText
        first="labels"
        firstPartialType="overline"
        firstColor="text-xlight"
        second="Select a label below to apply a filter"
        secondPartialType="body2LooseLineHeight"
        secondColor="text-light"
        css={{ padding: theme.spacing.medium }}
      />
      <Flex direction="column">
        {facets?.map((facet) => (
          <FacetRowSC
            key={facet.key}
            onClick={() => {
              addLabel?.(facet.key, facet.value ?? '')
            }}
          >
            <FacetKeySC>{facet.key}</FacetKeySC>
            <FacetValueSC>{facet.value}</FacetValueSC>
          </FacetRowSC>
        ))}
      </Flex>
    </Card>
  )
}

const FacetRowSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.medium,
  borderTop: theme.borders.default,
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  '&:hover': {
    cursor: 'pointer',
    backgroundColor: theme.colors['fill-one-hover'],
  },
}))

const FacetKeySC = styled.div(({ theme }) => ({
  ...theme.partials.text.body1Bold,
  width: '250px',
  overflow: 'auto',
}))

const FacetValueSC = styled.div(({ theme }) => ({
  ...theme.partials.text.body2,
  flex: 1,
  color: theme.colors['text-light'],
  overflow: 'auto',
  wordBreak: 'break-all',
}))
