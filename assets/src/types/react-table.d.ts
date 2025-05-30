import '@tanstack/react-table'
import { LazyQueryExecFunction } from '@apollo/client'
import type { OperationVariables } from '@apollo/client/core'
import { Dispatch } from 'react'

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
    refetch?:
      | Nullable<
          (
            variables?: Partial<OperationVariables | unknown> | undefined
          ) => Promise<any> | any
        >
      | LazyQueryExecFunction<any, any>
    [k: string]: any
  }
}
