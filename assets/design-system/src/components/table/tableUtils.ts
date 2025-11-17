import { rankItem } from '@tanstack/match-sorter-utils'
import type {
  ColumnDef,
  FilterFn,
  Row,
  TableOptions,
} from '@tanstack/react-table'
import type { VirtualItem } from '@tanstack/react-virtual'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  ReactElement,
  type CSSProperties,
  type MouseEvent,
  type RefObject,
  type UIEventHandler,
} from 'react'

import { type FillLevel } from '../../index'
import { type EmptyStateProps } from '../EmptyState'

export type TableProps = Omit<CSSProperties, keyof TableBaseProps> &
  TableBaseProps

export type TableBaseProps = {
  ref?: RefObject<HTMLDivElement>
  data: any[]
  columns: any[]
  loading?: boolean
  loadingSkeletonRows?: number
  hideHeader?: boolean
  padCells?: boolean
  expandedRowType?: 'default' | 'custom'
  fullHeightWrap?: boolean
  fillLevel?: TableFillLevel
  rowBg?: 'base' | 'raised' | 'stripes'
  highlightedRowId?: string
  getRowCanExpand?: any
  renderExpanded?: any
  loose?: boolean
  stickyColumn?: boolean
  scrollTopMargin?: number
  flush?: boolean
  virtualizeRows?: boolean
  lockColumnsOnScroll?: boolean
  reactVirtualOptions?: Partial<
    Omit<Parameters<typeof useVirtualizer>[0], 'count' | 'getScrollElement'>
  >
  reactTableOptions?: Partial<Omit<TableOptions<any>, 'data' | 'columns'>>
  onRowClick?: (e: MouseEvent<HTMLTableRowElement>, row: Row<any>) => void
  getRowLink?: (row: Row<unknown>) => Nullable<string | ReactElement>
  emptyStateProps?: EmptyStateProps
  hasNextPage?: boolean
  fetchNextPage?: () => void
  isFetchingNextPage?: boolean
  onVirtualSliceChange?: (slice: VirtualSlice) => void
  onScrollCapture?: UIEventHandler<HTMLDivElement>
}

export type TableFillLevel = Exclude<FillLevel, 3>

export type VirtualSlice = {
  start: VirtualItem | undefined
  end: VirtualItem | undefined
}

export function getGridTemplateCols(
  columnDefs: ColumnDef<unknown>[] = []
): string {
  return columnDefs
    .reduce(
      (val: string[], columnDef): string[] => [
        ...val,
        columnDef.meta?.gridTemplate
          ? columnDef.meta?.gridTemplate
          : columnDef.meta?.truncate
            ? 'minmax(100px, 1fr)'
            : 'auto',
      ],
      [] as string[]
    )
    .join(' ')
}

export function isRow<T>(row: Row<T> | VirtualItem): row is Row<T> {
  return typeof (row as Row<T>).getVisibleCells === 'function'
}

export function isValidId(id: unknown) {
  return typeof id === 'number' || (typeof id === 'string' && id.length > 0)
}

export const defaultGlobalFilterFn: FilterFn<any> = (
  row,
  columnId,
  value,
  addMeta
) => {
  // Rank the item
  const itemRank = rankItem(row.getValue(columnId), value)

  // Store the ranking info
  addMeta(itemRank)

  // Return if the item should be filtered in/out
  return itemRank.passed
}

export function measureElementHeight(element: Element): number {
  // Since <td>s are rendered with `display: contents`, we need to calculate
  // row height from contents using Range
  if (
    element?.getBoundingClientRect().height <= 0 &&
    element?.hasChildNodes()
  ) {
    const range = document.createRange()
    range.setStart(element, 0)
    range.setEnd(element, element.childNodes.length)
    return range.getBoundingClientRect().height
  }
  return element.getBoundingClientRect().height
}
