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
  meta: { truncate: true, gridTemplate: 'minmax(0, 1fr)' },
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
    meta: { truncate: true, gridTemplate: 'minmax(0, 140px)' },
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
  meta: { gridTemplate: 'auto' },
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
  meta: { gridTemplate: 'auto' },
  cell: function Cell({ getValue }) {
    const theme = useTheme()
    const type = getValue()

    if (!type) return '--'

    return (
      <Chip
        size="small"
        fillLevel={1}
        css={{
          borderRadius: 20,
          minWidth: 80,
          justifyContent: 'center',
        }}
      >
        <span css={{ color: theme.colors['text-xlight'] }}>
          {startCase(type.toLowerCase())}
        </span>
      </Chip>
    )
  },
})

export const ColActions = columnHelper.display({
  id: 'actions',
  meta: { gridTemplate: 'auto' },
  cell: ({ row: { original } }) => (
    <IconFrame
      icon={<CaretRightIcon />}
      textValue={`View ${original?.node?.name} details`}
    />
  ),
})
