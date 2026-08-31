import { Flex, useSetBreadcrumbs } from '@pluralsh/design-system'
import { InsightRefresh } from 'components/ai/insights/InsightRefresh.tsx'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { AISuggestFix } from '../../ai/chatbot/AISuggestFix.tsx'
import { InsightDisplay } from '../../ai/insights/InsightDisplay.tsx'
import { SendInsightToWorkbenchButton } from '../../ai/insights/SendInsightToWorkbench'
import { getBreadcrumbs, StackOutletContextT } from '../Stacks'

export function StackInsights() {
  const { stack, loading } = useOutletContext() as StackOutletContextT

  useSetBreadcrumbs(
    useMemo(
      () => [...getBreadcrumbs(stack.id, stack.name), { label: 'insights' }],
      [stack]
    )
  )

  return (
    <Flex
      direction="column"
      overflow="hidden"
      height="100%"
    >
      <InsightDisplay
        insight={stack.insight}
        kind="stack"
        loading={loading}
        headerActions={
          <>
            {stack.insight && (
              <InsightRefresh
                size="medium"
                insight={stack.insight}
              />
            )}
            <SendInsightToWorkbenchButton
              small
              insight={stack.insight}
            />
            <AISuggestFix
              small
              insight={stack.insight}
            />
          </>
        }
      />
    </Flex>
  )
}
