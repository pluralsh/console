import React from 'react'

import { isEmpty } from 'lodash'

import { Maybe, ObservableMetric } from '../../../generated/graphql'

export default function StackObservabilityMetrics({
  observableMetrics,
}: {
  observableMetrics?: Maybe<Maybe<ObservableMetric>[]>
}) {
  if (isEmpty(observableMetrics)) return 'No metrics'

  return (
    <div>
      {observableMetrics?.map((metric) => <div>{metric?.identifier}</div>)}
    </div>
  )
}
