import { getInsightPathInfo } from 'components/ai/AITableEntry'
import { AiInsightSummaryIcon } from 'components/utils/AiInsights'
import { AiInsightSummaryFragment } from 'generated/graphql'

export function FlowInsightIcon({
  insight,
}: {
  insight: Nullable<AiInsightSummaryFragment>
}) {
  const url = getInsightPathInfo(insight)?.url

  return (
    <AiInsightSummaryIcon
      noPadding
      insight={insight}
      navPath={url ? `${url}/insights` : undefined}
    />
  )
}
