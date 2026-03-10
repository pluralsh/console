import { WorkbenchToolType } from 'generated/graphql'
import { WorkbenchToolFormState } from './WorkbenchToolForm'
import { DeepPartial } from '@apollo/client/utilities'

export function WorkbenchToolFormFields({
  type,
  state,
  update,
}: {
  type: WorkbenchToolType
  state: WorkbenchToolFormState
  update: (update: DeepPartial<WorkbenchToolFormState>) => void
}) {
  switch (type) {
    case WorkbenchToolType.Datadog:
      return (
        <DatadogFormFields
          state={state}
          update={update}
        />
      )
    case WorkbenchToolType.Elastic:
      return (
        <ElasticFormFields
          state={state}
          update={update}
        />
      )
    case WorkbenchToolType.Loki:
      return (
        <LokiFormFields
          state={state}
          update={update}
        />
      )
    case WorkbenchToolType.Prometheus:
      return (
        <PrometheusFormFields
          state={state}
          update={update}
        />
      )
  }
}
