import { Flex } from '@pluralsh/design-system'
import { AISuggestFix } from 'components/ai/chatbot/AISuggestFix.tsx'
import { InsightDisplay } from '../../../ai/insights/InsightDisplay.tsx'
import { SendInsightToWorkbenchButton } from '../../../ai/insights/SendInsightToWorkbench'
import IconFrameRefreshButton from '../../../utils/RefreshIconFrame.tsx'
import { useOutletContext } from 'react-router-dom'
import { StackRunOutletContextT } from '../Route.tsx'

export function StackRunInsights() {
  const { stackRun, refetch, loading } =
    useOutletContext<StackRunOutletContextT>()

  return (
    <Flex
      direction="column"
      overflow="hidden"
      height="100%"
    >
      <InsightDisplay
        insight={stackRun?.insight}
        kind="stack run"
        loading={loading}
        headerActions={
          <>
            <IconFrameRefreshButton
              size="medium"
              loading={loading}
              refetch={refetch}
            />
            <SendInsightToWorkbenchButton
              small
              insight={stackRun?.insight}
            />
            <AISuggestFix
              small
              insight={stackRun?.insight}
            />
          </>
        }
      />
    </Flex>
  )
}
