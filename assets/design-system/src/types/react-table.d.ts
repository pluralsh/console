import '@tanstack/react-table'
import { type ReactNode } from 'react'
import { TooltipProps } from '../components/Tooltip'

declare module '@tanstack/table-core' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    truncate?: boolean
    gridTemplate?: string
    center?: boolean
    tooltip?: ReactNode
    tooltipProps?: Omit<TooltipProps, 'label' | 'children'>
    highlight?: boolean
  }
}
