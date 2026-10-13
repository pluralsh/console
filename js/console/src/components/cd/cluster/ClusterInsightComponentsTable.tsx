import {
  CaretRightIcon,
  Chip,
  ComponentsIcon,
  IconFrame,
  Table,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { capitalize } from 'lodash'
import { Link } from 'react-router-dom'

import { AiInsightSummaryIcon } from 'components/utils/AiInsights.tsx'
import { ClusterInsightComponentFragment } from 'generated/graphql.ts'
import {
  ClusterInsightComponentLabel,
  ClusterInsightServiceChip,
  priorityToSeverity,
} from './ClusterInsightComponentParts.tsx'

const columnHelper = createColumnHelper<ClusterInsightComponentFragment>()

const columns = [
  columnHelper.accessor((component) => component, {
    id: 'component',
    header: 'Component',
    meta: { gridTemplate: 'minmax(240px, 3fr)' },
    cell: function Cell({ getValue }) {
      return (
        <ClusterInsightComponentLabel
          truncate
          component={getValue()}
          icon={
            <IconFrame
              size="medium"
              icon={<ComponentsIcon size={16} />}
            />
          }
        />
      )
    },
  }),
  columnHelper.accessor((component) => component.priority, {
    id: 'priority',
    header: 'Priority',
    meta: { gridTemplate: 'minmax(110px, 0.7fr)' },
    cell: function Cell({ getValue }) {
      const priority = getValue()

      return priority ? (
        <Chip
          size="small"
          severity={priorityToSeverity(priority)}
        >
          {capitalize(priority)}
        </Chip>
      ) : null
    },
  }),
  columnHelper.accessor((component) => component.service, {
    id: 'service',
    header: 'Service',
    meta: { gridTemplate: 'minmax(140px, 1.5fr)' },
    cell: function Cell({ getValue }) {
      return <ClusterInsightServiceChip service={getValue()} />
    },
  }),
  columnHelper.accessor((component) => component, {
    id: 'insight',
    header: '',
    meta: { gridTemplate: 'min-content' },
    cell: function Cell({ getValue }) {
      const component = getValue()

      return (
        <AiInsightSummaryIcon
          insight={component.insight}
          navPath={component.id}
          preserveSpace
        />
      )
    },
  }),
  columnHelper.display({
    id: 'arrow',
    header: '',
    meta: { gridTemplate: 'min-content' },
    cell: () => (
      <IconFrame
        icon={<CaretRightIcon color="icon-xlight" />}
        size="medium"
        type="tertiary"
      />
    ),
  }),
]

export function ClusterInsightComponentsTable({
  components,
  loading = false,
}: {
  components: ClusterInsightComponentFragment[]
  loading?: boolean
}) {
  return (
    <Table
      fullHeightWrap
      fillLevel={0}
      data={components}
      columns={columns}
      loading={loading}
      getRowLink={({ original }) => (
        <Link to={(original as ClusterInsightComponentFragment).id} />
      )}
    />
  )
}
