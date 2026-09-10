import { AiInsightSummaryIcon } from 'components/utils/AiInsights'
import { AiInsightSummaryFragment } from 'generated/graphql'
import {
  getServiceComponentPath,
  getServiceDetailsPath,
} from 'routes/cdRoutesConsts'

export function FlowInsightIcon({
  insight,
}: {
  insight: Nullable<AiInsightSummaryFragment>
}) {
  return (
    <AiInsightSummaryIcon
      noPadding
      insight={insight}
      navPath={flowInsightNavPath(insight)}
    />
  )
}

function flowInsightNavPath(
  insight: Nullable<AiInsightSummaryFragment>
): string | undefined {
  if (insight?.service?.cluster?.id && insight.service.id) {
    return `${getServiceDetailsPath({
      clusterId: insight.service.cluster.id,
      serviceId: insight.service.id,
    })}/insights`
  }

  if (
    insight?.serviceComponent?.id &&
    insight.serviceComponent.service?.cluster?.id &&
    insight.serviceComponent.service.id
  ) {
    return `${getServiceComponentPath({
      clusterId: insight.serviceComponent.service.cluster.id,
      serviceId: insight.serviceComponent.service.id,
      componentId: insight.serviceComponent.id,
    })}/insights`
  }
}
