import '@tanstack/react-table'
import type { OperationVariables } from '@apollo/client/core'

declare module '@tanstack/table-core' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    truncate?: boolean
    gridTemplate?: string
    center?: boolean
    highlight?: boolean
    tooltip?: ReactNode
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    refetch?: Nullable<
      (
        variables?: Partial<OperationVariables | unknown> | undefined
      ) => Promise<unknown> | void
    >
    [k: string]: any
  }
}
