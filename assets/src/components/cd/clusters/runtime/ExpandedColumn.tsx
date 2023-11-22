import { Table } from '@pluralsh/design-system'
import { RuntimeService, expandedColumns } from './columns'
import { useTheme } from 'styled-components'

export default function ExpandedColumn({
  runtimeService,
}: {
  runtimeService: RuntimeService
}) {
  const theme = useTheme()
  console.log(runtimeService)
  const versions = runtimeService?.addon?.versions || []

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        marginBottom: theme.spacing.medium,
      }}
    >
      <div
        css={{
          ...theme.partials.text.body1,
          color: theme.colors['text-light'],
        }}
      >
        Full version history of this add-on:
      </div>
      <Table
        data={versions}
        columns={expandedColumns}
        css={{
          maxHeight: 250,
          height: '100%',
        }}
      />
    </div>
  )
}
