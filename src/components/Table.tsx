import { Div, type DivProps } from 'honorable'
import {
  type CSSProperties,
  type ComponentProps,
  Fragment,
  type MouseEvent,
  type MutableRefObject,
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
  SortDirection,
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
import styled, { useTheme } from 'styled-components'
import { isEmpty, isNil } from 'lodash-es'

import usePrevious from '../hooks/usePrevious'
import { InfoOutlineIcon, Tooltip } from '../index'

import Button from './Button'
import CaretUpIcon from './icons/CaretUpIcon'
import ArrowRightIcon from './icons/ArrowRightIcon'
import { FillLevelProvider } from './contexts/FillLevelContext'
import EmptyState from './EmptyState'
import { Spinner } from './Spinner'

export type TableProps = DivProps & {
  data: any[]
  columns: any[]
  hideHeader?: boolean
  padCells?: boolean
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
  emptyStateProps?: ComponentProps<typeof EmptyState>
  hasNextPage?: boolean
  fetchNextPage?: () => void
  isFetchingNextPage?: boolean
  onVirtualSliceChange?: (slice: {
    start: VirtualItem | undefined
    end: VirtualItem | undefined
  }) => void
}

type VirtualSlice = {
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

const T = styled.table<{ $gridTemplateColumns: string }>(
  ({ theme, $gridTemplateColumns }) => ({
    gridTemplateColumns: $gridTemplateColumns,
    backgroundColor: theme.colors['fill-one'],
    borderSpacing: 0,
    display: 'grid',
    borderCollapse: 'collapse',
    minWidth: '100%',
    width: '100%',
    ...theme.partials.text.body2LooseLineHeight,
  })
)

const TheadUnstyled = forwardRef<
  HTMLTableSectionElement,
  ComponentProps<'thead'>
>((props, ref) => (
  <FillLevelProvider value={2}>
    <thead
      {...props}
      ref={ref}
    />
  </FillLevelProvider>
))

const Thead = styled(TheadUnstyled)(({ theme }) => ({
  display: 'contents',
  position: 'sticky',
  top: 0,
  zIndex: 3,
  backgroundColor: theme.colors['fill-two'],
}))

const TbodyUnstyled = forwardRef<
  HTMLTableSectionElement,
  ComponentProps<'tbody'>
>((props, ref) => (
  <FillLevelProvider value={1}>
    <tbody
      ref={ref}
      {...props}
    />
  </FillLevelProvider>
))

const Tbody = styled(TbodyUnstyled)(({ theme }) => ({
  display: 'contents',
  backgroundColor: theme.colors['fill-one'],
}))

const Tr = styled.tr<{
  $highlighted?: boolean
  $selected?: boolean
  $selectable?: boolean
  $clickable?: boolean
  $raised?: boolean
}>(
  ({
    theme,
    $clickable: clickable = false,
    $raised: raised = false,
    $selectable: selectable = false,
    $selected: selected = false,
    $highlighted: highlighted = false,
  }) => ({
    display: 'contents',
    backgroundColor: highlighted
      ? theme.colors['fill-two']
      : selected
      ? theme.colors['fill-zero-hover']
      : raised || (selectable && !selected)
      ? theme.colors['fill-zero-selected']
      : theme.colors['fill-zero'],

    ...(clickable && {
      cursor: 'pointer',

      // highlight when hovered, but don't highlight if a child button is hovered
      '&:not(:has(button:hover)):hover': {
        backgroundColor: selectable
          ? selected
            ? theme.colors['fill-zero-hover']
            : theme.colors['fill-zero-selected']
          : theme.colors['fill-zero-hover'],
      },
    }),
  })
)

const Th = styled.th<{
  $stickyColumn: boolean
  $highlight?: boolean
  $cursor?: CSSProperties['cursor']
  $hideHeader?: boolean
}>(
  ({
    theme,
    $stickyColumn: stickyColumn,
    $highlight: highlight,
    $cursor: cursor,
    $hideHeader: hideHeader,
  }) => ({
    padding: 0,
    position: 'sticky',
    top: 0,
    zIndex: 4,
    '.thOuterWrap': {
      alignItems: 'center',
      display: hideHeader ? 'none' : 'flex',
      position: 'relative',
      backgroundColor: highlight
        ? theme.colors['fill-two']
        : theme.colors['fill-one'],
      zIndex: 4,
      borderBottom: theme.borders.default,
      color: theme.colors.text,
      height: 48,
      minHeight: 48,
      whiteSpace: 'nowrap',
      padding: '0 12px',
      textAlign: 'left',
      ...(cursor ? { cursor } : {}),
      '.thSortIndicatorWrap': {
        display: 'flex',
        gap: theme.spacing.xsmall,
      },
    },
    '&:last-child': {
      /* Hackery to hide unpredictable visible gap between columns */
      zIndex: 3,
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 10000,
        backgroundColor: theme.colors['fill-two'],
        borderBottom: hideHeader ? 'none' : theme.borders.default,
      },
    },
    '&:first-child': {
      ...(stickyColumn
        ? {
            backgroundColor: 'inherit',
            position: 'sticky',
            left: 0,
            zIndex: 5,
            '.thOuterWrap': {
              boxShadow: theme.boxShadows.slight,
              zIndex: 5,
            },
          }
        : {}),
    },
  })
)

// TODO: Set vertical align to top for tall cells (~3 lines of text or more). See ENG-683.
const Td = styled.td<{
  $firstRow?: boolean
  $loose?: boolean
  $padCells?: boolean
  $stickyColumn: boolean
  $highlight?: boolean
  $truncateColumn: boolean
  $center?: boolean
}>(
  ({
    theme,
    $firstRow: firstRow,
    $loose: loose,
    $padCells: padCells,
    $stickyColumn: stickyColumn,
    $highlight: highlight,
    $truncateColumn: truncateColumn = false,
    $center: center,
  }) => ({
    ...theme.partials.text.body2LooseLineHeight,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: center ? 'center' : 'flex-start',
    height: 'auto',
    minHeight: 52,

    backgroundColor: highlight ? theme.colors['fill-two'] : 'inherit',
    borderTop: firstRow ? '' : theme.borders.default,
    color: theme.colors['text-light'],

    padding: padCells ? (loose ? '16px 12px' : '8px 12px') : 0,
    '&:first-child': stickyColumn
      ? {
          boxShadow: theme.boxShadows.slight,
          position: 'sticky',
          left: 0,
          zIndex: 1,
        }
      : {},
    ...(truncateColumn
      ? {
          '*': {
            width: '100%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          },
        }
      : {}),
  })
)

const TdExpand = styled.td(({ theme }) => ({
  '&:last-child': {
    gridColumn: '2 / -1',
  },
  backgroundColor: 'inherit',
  color: theme.colors['text-light'],
  height: 'auto',
  minHeight: 52,
  padding: '16px 12px',
}))

const TdLoading = styled(Td)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gridColumn: '1 / -1',
  textAlign: 'center',
  gap: theme.spacing.xsmall,
  color: theme.colors['text-xlight'],
  minHeight: theme.spacing.large * 2 + theme.spacing.xlarge,
}))

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

const sortDirToIcon = {
  asc: (
    <ArrowRightIcon
      size={12}
      transform="rotate(-90deg)"
    />
  ),
  desc: (
    <ArrowRightIcon
      size={12}
      transform="rotate(90deg)"
    />
  ),
}

function SortIndicator({
  direction = false,
}: {
  direction: false | SortDirection
}) {
  if (!direction) return null

  return sortDirToIcon[direction]
}

function FillerRow({
  columns,
  height,
  index,
  stickyColumn,
  selectable,
  ...props
}: {
  columns: unknown[]
  height: number
  index: number
  stickyColumn: boolean
  selectable?: boolean
}) {
  return (
    <Tr
      aria-hidden="true"
      $raised={index % 2 === 1}
      $selected={false}
      $selectable={selectable}
    >
      <Td
        aria-hidden="true"
        $stickyColumn={stickyColumn}
        style={{
          height,
          minHeight: height,
          maxHeight: height,
          padding: 0,
          gridColumn: '1 / -1',
        }}
        colSpan={columns.length}
        $truncateColumn={false}
        $center={false}
        {...props}
      />
    </Tr>
  )
}

function FillerRows({
  rows,
  height,
  position,
  ...props
}: {
  rows: Row<unknown>[] | VirtualItem[]
  columns: unknown[]
  height: number
  position: 'top' | 'bottom'
  stickyColumn: boolean
  clickable?: boolean
  selectable?: boolean
}) {
  return (
    <>
      <FillerRow
        height={position === 'top' ? 0 : height}
        index={
          position === 'top'
            ? rows[0].index - 2
            : rows[rows.length - 1].index + 1
        }
        {...props}
      />
      <FillerRow
        height={position === 'top' ? height : 0}
        index={
          position === 'top'
            ? rows[0].index - 1
            : rows[rows.length - 1].index + 2
        }
        {...props}
      />
    </>
  )
}

function useIsScrolling(
  ref: MutableRefObject<HTMLElement>,
  {
    onIsScrollingChange: onScrollingChange,
    restDelay = 350,
  }: { onIsScrollingChange: (isScrolling: boolean) => void; restDelay?: number }
) {
  const [isScrolling, setIsScrolling] = useState(false)
  const timeout = useRef<number | null>(null)

  useEffect(() => {
    onScrollingChange?.(isScrolling)
  }, [isScrolling, onScrollingChange])

  useEffect(() => {
    if (ref.current) {
      const el = ref.current

      const scrollHandler = () => {
        setIsScrolling(true)
        window.clearTimeout(timeout.current)
        timeout.current = window.setTimeout(() => {
          setIsScrolling(false)
        }, restDelay)
      }

      el.addEventListener('scroll', scrollHandler, { passive: true })

      return () => {
        el.removeEventListener('scroll', scrollHandler)
      }
    }
  }, [ref, restDelay])
}

function useOnVirtualSliceChange({
  virtualRows,
  virtualizeRows,
  onVirtualSliceChange,
}: {
  virtualRows: VirtualItem[]
  virtualizeRows: boolean
  onVirtualSliceChange: (slice: VirtualSlice) => void
}) {
  const sliceStartRow = virtualRows[0]
  const sliceEndRow: VirtualItem = virtualRows[virtualRows.length - 1]
  const prevSliceStartRow = usePrevious(virtualRows[0])
  const prevSliceEndRow = usePrevious(virtualRows[virtualRows.length - 1])

  useEffect(() => {
    if (
      virtualizeRows &&
      (prevSliceEndRow !== sliceEndRow || prevSliceStartRow !== sliceStartRow)
    ) {
      onVirtualSliceChange?.({ start: sliceStartRow, end: sliceEndRow })
    }
  }, [
    sliceStartRow,
    sliceEndRow,
    virtualizeRows,
    onVirtualSliceChange,
    prevSliceEndRow,
    prevSliceStartRow,
  ])
}

function TableRef(
  {
    data,
    columns,
    hideHeader = false,
    getRowCanExpand,
    renderExpanded,
    loose = false,
    padCells = true,
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
  const gridTemplateColumns = useMemo(
    () => fixedGridTemplateColumns ?? getGridTemplateCols(columns),
    [columns, fixedGridTemplateColumns]
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
        backgroundColor="fill-two"
        border={flush ? 'none' : '1px solid border-fill-two'}
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
        {...props}
      >
        <T $gridTemplateColumns={gridTemplateColumns}>
          <Thead>
            {headerGroups.map((headerGroup) => (
              <Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Th
                    key={header.id}
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
            {paddingTop > 0 && (
              <FillerRows
                columns={columns}
                rows={rows}
                height={paddingTop}
                position="top"
                stickyColumn={stickyColumn}
                clickable={!!onRowClick}
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
              const raised =
                rowBg === 'raised' || (rowBg === 'stripes' && i % 2 === 1)

              return (
                <Fragment key={key}>
                  <Tr
                    key={key}
                    onClick={(e) => onRowClick?.(e, row)}
                    $raised={raised}
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
                          $firstRow={i === 0}
                          $padCells={padCells}
                          $loose={loose}
                          $stickyColumn={stickyColumn}
                          $highlight={cell.column?.columnDef?.meta?.highlight}
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
                    <Tr $raised={i % 2 === 1}>
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
              />
            )}
          </Tbody>
        </T>
        {isEmpty(rows) && (
          <EmptyState
            message="No results match your query"
            style={{ background: theme.colors['fill-zero-hover'] }}
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
