import { Div, type DivProps } from 'honorable'
import {
  Fragment,
  type MouseEvent,
  type Ref,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type {
  ColumnDef,
  FilterFn,
  Row,
  TableOptions,
} from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'
import type { VirtualItem } from '@tanstack/react-virtual'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useTheme } from 'styled-components'
import { isEmpty, isNil } from 'lodash-es'

import { type FillLevel, InfoOutlineIcon, Tooltip } from '../../index'
import Button from '../Button'
import CaretUpIcon from '../icons/CaretUpIcon'
import EmptyState, { type EmptyStateProps } from '../EmptyState'
import { Spinner } from '../Spinner'

import { tableFillLevelToBg, tableFillLevelToBorderColor } from './colors'
import { FillerRows } from './FillerRows'
import { useIsScrolling, useOnVirtualSliceChange } from './hooks'
import { Skeleton } from './Skeleton'
import { SortIndicator } from './SortIndicator'
import { T } from './T'
import { Tbody } from './Tbody'
import { Td, TdExpand, TdLoading } from './Td'
import { Th } from './Th'
import { Thead } from './Thead'
import { Tr } from './Tr'

export type TableProps = DivProps & {
  data: any[]
  columns: any[]
  loading?: boolean
  loadingSkeletonRows?: number
  hideHeader?: boolean
  padCells?: boolean
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
  emptyStateProps?: EmptyStateProps
  hasNextPage?: boolean
  fetchNextPage?: () => void
  isFetchingNextPage?: boolean
  onVirtualSliceChange?: (slice: VirtualSlice) => void
}

export type TableFillLevel = Exclude<FillLevel, 3>

export type VirtualSlice = {
  start: VirtualItem | undefined
  end: VirtualItem | undefined
}

function getGridTemplateCols(columnDefs: ColumnDef<unknown>[] = []): string {
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

function isRow<T>(row: Row<T> | VirtualItem): row is Row<T> {
  return typeof (row as Row<T>).getVisibleCells === 'function'
}

function isValidId(id: unknown) {
  return typeof id === 'number' || (typeof id === 'string' && id.length > 0)
}

const defaultGlobalFilterFn: FilterFn<any> = (
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

function TableRef(
  {
    data,
    columns,
    loading = false,
    loadingSkeletonRows = 10,
    hideHeader = false,
    getRowCanExpand,
    renderExpanded,
    loose = false,
    padCells = true,
    fillLevel = 0,
    rowBg = 'stripes',
    stickyColumn = false,
    scrollTopMargin = 500,
    flush = false,
    width,
    virtualizeRows = false,
    lockColumnsOnScroll,
    reactVirtualOptions,
    reactTableOptions,
    highlightedRowId,
    onRowClick,
    emptyStateProps,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    onVirtualSliceChange,
    ...props
  }: TableProps,
  forwardRef: Ref<any>
) {
  const theme = useTheme()
  const tableContainerRef = useRef<HTMLDivElement>()
  const [hover, setHover] = useState(false)
  const [scrollTop, setScrollTop] = useState(0)
  const table = useReactTable({
    data,
    columns,
    getRowCanExpand,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowId: (originalRow, i, parent) => {
      if (isValidId(originalRow.id)) {
        return originalRow.id
      }

      return (parent?.id ? `${parent.id}.` : '') + i
    },
    globalFilterFn: defaultGlobalFilterFn,
    defaultColumn: {
      enableColumnFilter: false,
      enableGlobalFilter: false,
      enableSorting: false,
      sortingFn: 'alphanumeric',
    },
    enableRowSelection: false,
    ...reactTableOptions,
  })
  const [fixedGridTemplateColumns, setFixedGridTemplateColumns] = useState<
    string | null
  >(null)

  const { rows: tableRows } = table.getRowModel()
  const getItemKey = useCallback<
    Parameters<typeof useVirtualizer>[0]['getItemKey']
  >((i) => tableRows[i]?.id || i, [tableRows])
  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? tableRows.length + 1 : tableRows.length,
    overscan: 6,
    getItemKey,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 52,
    measureElement: (el) => {
      // Since <td>s are rendered with `display: contents`, we need to calculate
      // row height from contents using Range
      if (el?.getBoundingClientRect().height <= 0 && el?.hasChildNodes()) {
        const range = document.createRange()

        range.setStart(el, 0)
        range.setEnd(el, el.childNodes.length)

        return range.getBoundingClientRect().height
      }

      return el.getBoundingClientRect().height
    },
    ...reactVirtualOptions,
  })
  const virtualRows = rowVirtualizer.getVirtualItems()
  const virtualHeight = rowVirtualizer.getTotalSize()

  useOnVirtualSliceChange({ virtualRows, virtualizeRows, onVirtualSliceChange })

  lockColumnsOnScroll = lockColumnsOnScroll ?? virtualizeRows
  useIsScrolling(tableContainerRef, {
    onIsScrollingChange: useCallback(
      (isScrolling) => {
        if (lockColumnsOnScroll) {
          const thCells = tableContainerRef.current?.querySelectorAll('th')

          const columns = Array.from(thCells)
            .map((th) => {
              const { width } = th.getBoundingClientRect()

              return `${width}px`
            })
            .join(' ')

          setFixedGridTemplateColumns(isScrolling ? columns : null)
        }
      },
      [lockColumnsOnScroll]
    ),
  })
  useEffect(() => {
    if (!lockColumnsOnScroll) {
      setFixedGridTemplateColumns(null)
    }
  }, [lockColumnsOnScroll])

  const { paddingTop, paddingBottom } = useMemo(
    () => ({
      paddingTop:
        virtualizeRows && virtualRows.length > 0
          ? virtualRows?.[0]?.start || 0
          : 0,
      paddingBottom:
        virtualizeRows && virtualRows.length > 0
          ? virtualHeight - (virtualRows?.[virtualRows.length - 1]?.end || 0)
          : 0,
    }),
    [virtualHeight, virtualRows, virtualizeRows]
  )

  const headerGroups = useMemo(() => table.getHeaderGroups(), [table])

  const rows = virtualizeRows ? virtualRows : tableRows

  const skeletonRows = useMemo(
    () => Array(loadingSkeletonRows).fill({}),
    [loadingSkeletonRows]
  )

  const gridTemplateColumns = useMemo(
    () => fixedGridTemplateColumns ?? getGridTemplateCols(columns),
    [columns, fixedGridTemplateColumns]
  )

  const isRaised = useCallback(
    (i: number) => rowBg === 'raised' || (rowBg === 'stripes' && i % 2 === 1),
    [rowBg]
  )

  useEffect(() => {
    const lastItem = virtualRows[virtualRows.length - 1]

    if (
      lastItem &&
      lastItem.index >= tableRows.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage()
    }
  }, [
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    virtualRows,
    tableRows.length,
  ])

  return (
    <Div
      position="relative"
      width={width}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      ref={forwardRef}
    >
      <Div
        backgroundColor={tableFillLevelToBg[fillLevel]}
        border={
          flush ? 'none' : `1px solid ${tableFillLevelToBorderColor[fillLevel]}`
        }
        borderRadius={
          flush
            ? `0 0 ${theme.borderRadiuses.large}px ${theme.borderRadiuses.large}px`
            : 'large'
        }
        overflow="auto"
        ref={tableContainerRef}
        onScroll={({ target }: { target: HTMLDivElement }) =>
          setScrollTop(target?.scrollTop)
        }
        width="100%"
        height="100%"
        {...props}
      >
        <T $gridTemplateColumns={gridTemplateColumns}>
          <Thead>
            {headerGroups.map((headerGroup) => (
              <Tr
                key={headerGroup.id}
                $fillLevel={fillLevel}
              >
                {headerGroup.headers.map((header) => (
                  <Th
                    key={header.id}
                    $fillLevel={fillLevel}
                    $hideHeader={hideHeader}
                    $stickyColumn={stickyColumn}
                    $highlight={header.column.columnDef?.meta?.highlight}
                    {...(header.column.getCanSort()
                      ? {
                          $cursor:
                            header.column.getIsSorted() === 'asc'
                              ? 's-resize'
                              : header.column.getIsSorted() === 'desc'
                              ? 'ns-resize'
                              : 'n-resize',
                          onClick: header.column.getToggleSortingHandler(),
                        }
                      : {})}
                  >
                    <div className="thOuterWrap">
                      <div className="thSortIndicatorWrap">
                        <div>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </div>
                        {header.column.columnDef.meta?.tooltip && (
                          <Tooltip label={header.column.columnDef.meta.tooltip}>
                            <InfoOutlineIcon />
                          </Tooltip>
                        )}
                        <SortIndicator
                          direction={header.column.getIsSorted()}
                        />
                      </div>
                    </div>
                  </Th>
                ))}
              </Tr>
            ))}
          </Thead>
          <Tbody>
            {loading ? (
              <>
                {skeletonRows.map((_, i) => (
                  <Tr
                    key={i}
                    $fillLevel={fillLevel}
                    $raised={isRaised(i)}
                  >
                    {columns.map((_, j) => (
                      <Td
                        key={j}
                        $fillLevel={fillLevel}
                        $firstRow={i === 0}
                        $padCells={padCells}
                        $loose={loose}
                        $stickyColumn={stickyColumn}
                        $truncateColumn={false}
                      >
                        <Skeleton />
                      </Td>
                    ))}
                  </Tr>
                ))}
              </>
            ) : (
              <>
                {paddingTop > 0 && (
                  <FillerRows
                    columns={columns}
                    rows={rows}
                    height={paddingTop}
                    position="top"
                    stickyColumn={stickyColumn}
                    clickable={!!onRowClick}
                    fillLevel={fillLevel}
                  />
                )}
                {rows.map((maybeRow) => {
                  const i = maybeRow.index
                  const isLoaderRow = i > tableRows.length - 1
                  const row: Row<unknown> | null = isRow(maybeRow)
                    ? maybeRow
                    : isLoaderRow
                    ? null
                    : tableRows[maybeRow.index]
                  const key = row?.id ?? maybeRow.index

                  return (
                    <Fragment key={key}>
                      <Tr
                        key={key}
                        onClick={(e) => onRowClick?.(e, row)}
                        $fillLevel={fillLevel}
                        $raised={isRaised(i)}
                        $highlighted={row?.id === highlightedRowId}
                        $selectable={row?.getCanSelect() ?? false}
                        $selected={row?.getIsSelected() ?? false}
                        $clickable={!!onRowClick}
                        // data-index is required for virtual scrolling to work
                        data-index={row?.index}
                        {...(virtualizeRows
                          ? { ref: rowVirtualizer.measureElement }
                          : {})}
                      >
                        {isNil(row) && isLoaderRow ? (
                          <TdLoading
                            key={i}
                            $fillLevel={fillLevel}
                            $firstRow={i === 0}
                            $padCells={padCells}
                            $loose={loose}
                            $stickyColumn={stickyColumn}
                            $truncateColumn={false}
                            $center={false}
                            colSpan={columns.length}
                          >
                            <div>Loading</div>
                            <Spinner color={theme.colors['text-xlight']} />
                          </TdLoading>
                        ) : (
                          row?.getVisibleCells().map((cell) => (
                            <Td
                              key={cell.id}
                              $fillLevel={fillLevel}
                              $firstRow={i === 0}
                              $padCells={padCells}
                              $loose={loose}
                              $stickyColumn={stickyColumn}
                              $highlight={
                                cell.column?.columnDef?.meta?.highlight
                              }
                              $truncateColumn={
                                cell.column?.columnDef?.meta?.truncate
                              }
                              $center={cell.column?.columnDef?.meta?.center}
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </Td>
                          ))
                        )}
                      </Tr>
                      {row?.getIsExpanded() && (
                        <Tr
                          $fillLevel={fillLevel}
                          $raised={i % 2 === 1}
                        >
                          <TdExpand />
                          <TdExpand colSpan={row.getVisibleCells().length - 1}>
                            {renderExpanded({ row })}
                          </TdExpand>
                        </Tr>
                      )}
                    </Fragment>
                  )
                })}
                {paddingBottom > 0 && (
                  <FillerRows
                    rows={rows}
                    columns={columns}
                    height={paddingBottom}
                    position="bottom"
                    stickyColumn={stickyColumn}
                    fillLevel={fillLevel}
                  />
                )}
              </>
            )}
          </Tbody>
        </T>
        {isEmpty(rows) && !loading && (
          <EmptyState
            message="No results match your query"
            {...emptyStateProps}
          />
        )}
      </Div>
      {hover && scrollTop > scrollTopMargin && (
        <Button
          small
          position="absolute"
          right="24px"
          bottom="24px"
          width="140px"
          floating
          endIcon={<CaretUpIcon />}
          onClick={() =>
            tableContainerRef?.current?.scrollTo({
              top: 0,
              behavior: virtualizeRows ? 'instant' : 'smooth',
            })
          }
        >
          Back to top
        </Button>
      )}
    </Div>
  )
}

const Table = forwardRef(TableRef)

export default Table
