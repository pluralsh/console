import { Row } from '@tanstack/react-table'
import { AlertFragment } from 'generated/graphql'

export function AlertsTableExpander({ row }: { row: Row<AlertFragment> }) {
  return <div>{row.original.message}</div>
}
