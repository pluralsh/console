import type { RowData } from '@tanstack/react-table'
import { LazyQueryExecFunction } from '@apollo/client'
import type { OperationVariables } from '@apollo/client/core'

// ColumnMeta is augmented by @pluralsh/design-system
declare module '@tanstack/table-core' {
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
