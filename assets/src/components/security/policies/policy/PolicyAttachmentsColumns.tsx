import { createColumnHelper } from '@tanstack/react-table'
import { StackedText } from 'components/utils/table/StackedText'
import { TRUNCATE } from 'components/utils/truncate'
import { CaptionP } from 'components/utils/typography/Text'
import { useTheme } from 'styled-components'
import { fromNow } from 'utils/datetime'

export type PolicyAttachmentRow = {
  id: string
  kind: 'workbench' | 'stack'
  name?: string | null
  description?: string | null
  matchingArgs: string[]
  updatedAt?: string | null
  href?: string
}

const columnHelper = createColumnHelper<PolicyAttachmentRow>()

export const ColWorkbench = columnHelper.accessor((row) => row, {
  id: 'workbench',
  header: 'Workbench',
  meta: { truncate: true, gridTemplate: 'minmax(0, 1fr)' },
  cell: function Cell({ getValue }) {
    const row = getValue()

    return (
      <StackedText
        truncate
        first={row.name}
        second={row.description}
      />
    )
  },
})

export const ColMatchingArg = columnHelper.accessor(
  (row) => row.matchingArgs,
  {
    id: 'matchingArg',
    header: 'Matching arg',
    meta: { truncate: true, gridTemplate: 'minmax(0, 240px)' },
    cell: function Cell({ getValue }) {
      const theme = useTheme()
      const matchingArgs = getValue().filter(Boolean)

      if (matchingArgs.length === 0) {
        return <CaptionP $color="text-xlight">--</CaptionP>
      }

      return (
        <span
          css={{
            ...theme.partials.text.code,
            ...TRUNCATE,
            color: theme.colors['text-xlight'],
          }}
        >
          {matchingArgs.join(', ')}
        </span>
      )
    },
  }
)

export const ColUpdated = columnHelper.accessor((row) => row.updatedAt, {
  id: 'updated',
  header: 'Updated',
  meta: { gridTemplate: 'auto' },
  cell: function Cell({ getValue }) {
    const updatedAt = getValue()

    return (
      <CaptionP $color="text-xlight">
        {updatedAt ? fromNow(updatedAt) : '--'}
      </CaptionP>
    )
  },
})
