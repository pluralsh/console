import { Chip } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { ArgoStrategyStep } from 'generated/graphql'

const columnHelper = createColumnHelper<ArgoStrategyStep>()
const ColType = columnHelper.accessor((step) => step, {
  id: 'type',
  header: 'Type',
  cell: function Cell({ getValue }) {
    if (getValue().analysis) return <Chip>analysis</Chip>
    if (getValue().experiment) return <Chip>experiment</Chip>
    if (getValue().pause) return <Chip>pause</Chip>

    return <Chip>scale</Chip>
  },
})

const ColWeight = columnHelper.accessor(
  (step) => (step.setWeight ? `${step.setWeight}%` : ''),
  {
    id: 'weight',
    header: 'Weight',
  }
)
const ColPause = columnHelper.accessor((step) => step.pause?.duration, {
  id: 'pause',
  header: 'Pause Duration',
})

const ColConfiguration = columnHelper.accessor(
  (step) =>
    JSON.stringify(
      step.analysis?.templates || step.experiment?.templates || {}
    ),
  {
    id: 'configuration',
    header: 'Configuration',
    cell: function Cell({ getValue }) {
      return <span>{getValue()}</span>
    },
  }
)

export const canarySpecCols = [ColType, ColWeight, ColPause, ColConfiguration]
