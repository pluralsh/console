import { CaretRightIcon, Chip, IconFrame } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { StackedText } from 'components/utils/table/StackedText'
import { TRUNCATE } from 'components/utils/truncate'
import { CaptionP } from 'components/utils/typography/Text'
import { PolicyTinyFragment } from 'generated/graphql'
import { startCase } from 'lodash'
import { useTheme } from 'styled-components'
import { fromNow } from 'utils/datetime'
import { Edge } from 'utils/graphql'

const columnHelper = createColumnHelper<Edge<PolicyTinyFragment>>()

export const ColName = columnHelper.accessor(({ node }) => node, {
  id: 'name',
  header: 'Policies',
  meta: { truncate: true, gridTemplate: 'minmax(250px, 1fr)' },
  cell: function Cell({ getValue }) {
    const policy = getValue()

    return (
      <StackedText
        truncate
        first={policy?.name}
        second={policy?.description}
      />
    )
  },
})

export const ColProject = columnHelper.accessor(
  ({ node }) => node?.project?.name,
  {
    id: 'project',
    header: 'Project',
    meta: { truncate: true, gridTemplate: 'minmax(120px, 140px)' },
    cell: function Cell({ getValue }) {
      return (
        <CaptionP
          $color="text-xlight"
          css={TRUNCATE}
        >
          {getValue()}
        </CaptionP>
      )
    },
  }
)

export const ColUpdated = columnHelper.accessor(({ node }) => node?.updatedAt, {
  id: 'updated',
  header: 'Updated',
  meta: { gridTemplate: 'max-content' },
  cell: function Cell({ getValue }) {
    const updatedAt = getValue()

    return (
      <CaptionP $color="text-xlight">
        {updatedAt && fromNow(updatedAt)}
      </CaptionP>
    )
  },
})

export const ColType = columnHelper.accessor(({ node }) => node?.type, {
  id: 'type',
  header: 'Type',
  meta: { gridTemplate: 'max-content' },
  cell: function Cell({ getValue }) {
    const theme = useTheme()
    const type = getValue()

    if (!type) return '--'

    return (
      <Chip
        size="small"
        severity="neutral"
        css={{ borderRadius: 12, color: theme.colors['text-disabled'] }}
      >
        {startCase(type.toLowerCase())}
      </Chip>
    )
  },
})

export const ColActions = columnHelper.display({
  id: 'actions',
  meta: { gridTemplate: '40px' },
  cell: ({ row: { original } }) => (
    <IconFrame
      icon={<CaretRightIcon />}
      textValue={`View ${original?.node?.name} details`}
    />
  ),
})
