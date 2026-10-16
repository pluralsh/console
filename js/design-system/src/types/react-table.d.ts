import '@tanstack/react-table'
import { type ReactNode } from 'react'
import { TooltipProps } from '../components/Tooltip'

declare module '@tanstack/table-core' {
  interface ColumnMeta<TData extends RowData, TValue> {
    truncate?: boolean
    gridTemplate?: string
    center?: boolean
    right?: boolean
    tooltip?: ReactNode
    tooltipProps?: Omit<TooltipProps, 'label' | 'children'>
    highlight?: boolean
  }
}
