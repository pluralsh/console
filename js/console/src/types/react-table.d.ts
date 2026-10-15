import '@tanstack/react-table'
import { LazyQueryExecFunction } from '@apollo/client'
import type { OperationVariables } from '@apollo/client/core'
import { TooltipProps } from '@pluralsh/design-system'

declare module '@tanstack/table-core' {
  interface ColumnMeta<TData extends RowData, TValue> {
    truncate?: boolean
    gridTemplate?: string
    center?: boolean
    right?: boolean
    highlight?: boolean
    tooltip?: ReactNode
    tooltipProps?: Omit<TooltipProps, 'label' | 'children'>
  }
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
