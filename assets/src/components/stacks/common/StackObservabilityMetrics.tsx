import React from 'react'

import { Maybe, ObservableMetric } from '../../../generated/graphql'

export default function StackObservabilityMetrics({
  observableMetrics,
}: {
  observableMetrics?: Maybe<Maybe<ObservableMetric>[]>
}) {
  return (
    <div>
      {observableMetrics?.map((metric) => <div>{metric?.identifier}</div>)}
    </div>
  )
}
