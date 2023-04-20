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
import styled from 'styled-components'

import Button from './Button'
import CaretUpIcon from './icons/CaretUpIcon'
import ArrowRightIcon from './icons/ArrowRightIcon'
import { FillLevelProvider } from './contexts/FillLevelContext'

export type TableProps =
  | Omit<
      DivProps,
      | 'data'
      | 'columns'
      | 'getRowCanExpand'
      | 'renderExpanded'
      | 'loose'
      | 'stickyColumn'
      | 'scrollTopMargin'
      | 'virtualizeRows'
      | 'virtualizerOptions'
      | 'reactTableOptions'
      | 'onRowClick'
    > & {
      data: any[]
      columns: any[]
      getRowCanExpand?: any
      renderExpanded?: any
      loose?: boolean
      stickyColumn?: boolean
      scrollTopMargin?: number
      virtualizeRows?: boolean
      lockColumnsOnFirstScroll?: boolean
      reactVirtualOptions?: Omit<
        Parameters<typeof useVirtualizer>,
        'parentRef' | 'size'
      >
      reactTableOptions?: Omit<
        Parameters<typeof useReactTable>,
        'data' | 'columns'
      >
      onRowClick?: (e: MouseEvent<HTMLTableRowElement>, row: Row<any>) => void
    }

const propTypes = {}

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

const T = styled.table<{ gridTemplateColumns: string }>(
  ({ theme, gridTemplateColumns }) => ({
    gridTemplateColumns,
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

const Tr = styled.tr<{ clickable?: boolean; lighter?: boolean }>(
  ({ theme, clickable = false, lighter = false }) => ({
    display: 'contents',
    backgroundColor: lighter
      ? theme.colors['fill-one']
      : theme.colors['fill-one-hover'],

    ...(clickable && {
      cursor: 'pointer',

      '&:hover': {
        backgroundColor: theme.colors['fill-one-selected'],
      },
    }),
  })
)

const Th = styled.th<{
  stickyColumn: boolean
  cursor?: CSSProperties['cursor']
}>(({ theme, stickyColumn, cursor }) => ({
  padding: 0,
  position: 'sticky',
  top: 0,
  zIndex: 4,
  '.thOuterWrap': {
    position: 'relative',
    backgroundColor: theme.colors['fill-two'],
    zIndex: 4,
    borderBottom: theme.borders['fill-three'],
    color: theme.colors.text,
    height: 48,
    minHeight: 48,
    whiteSpace: 'nowrap',
    padding: '14px 12px',
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
      borderBottom: theme.borders['fill-three'],
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
}))

// TODO: Set vertical align to top for tall cells (~3 lines of text or more). See ENG-683.
const Td = styled.td<{
  firstRow?: boolean
  loose?: boolean
  stickyColumn: boolean
  truncateColumn: boolean
  center?: boolean
}>(
  ({
    theme,
    firstRow,
    loose,
    stickyColumn,
    truncateColumn = false,
    center,
  }) => ({
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: center ? 'center' : 'flex-start',
    height: 'auto',
    minHeight: 52,

    backgroundColor: 'inherit',
    borderTop: firstRow ? '' : theme.borders.default,
    color: theme.colors.text,

    padding: loose ? '16px 12px' : '8px 12px',
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
  color: theme.colors.text,
  height: 'auto',
  minHeight: 52,
  padding: '16px 12px',
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
  ...props
}: {
  columns: unknown[]
  height: number
  index: number
  stickyColumn: boolean
}) {
  return (
    <Tr
      aria-hidden="true"
      lighter={index % 2 === 0}
    >
      <Td
        aria-hidden="true"
        stickyColumn={stickyColumn}
        style={{
          height,
          minHeight: height,
          maxHeight: height,
          padding: 0,
          gridColumn: '1 / -1',
        }}
        colSpan={columns.length}
        truncateColumn={false}
        center={false}
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

function useOnFirstScroll(
  ref: MutableRefObject<HTMLElement>,
  onFirstScroll: () => void
) {
  const [hasScrolled, setHasScrolled] = useState(false)

  useEffect(() => {
    if (!hasScrolled && ref.current) {
      const el = ref.current

      const scrollHandler = () => {
        setHasScrolled(true)

        onFirstScroll()
      }

      el.addEventListener('scroll', scrollHandler, { passive: true })

      return () => {
        el.removeEventListener('scroll', scrollHandler)
      }
    }
  }, [hasScrolled, onFirstScroll, ref])
}

function TableRef(
  {
    data,
    columns,
    getRowCanExpand,
    renderExpanded,
    loose = false,
    stickyColumn = false,
    scrollTopMargin = 500,
    width,
    virtualizeRows = false,
    lockColumnsOnFirstScroll,
    reactVirtualOptions: virtualizerOptions,
    reactTableOptions,
    onRowClick,
    ...props
  }: TableProps,
  forwardRef: Ref<any>
) {
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
    ...reactTableOptions,
  })
  const [fixedGridTemplateColumns, setFixedGridTemplateColumns] = useState<
    string | null
  >(null)

  const { rows: tableRows } = table.getRowModel()
  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    overscan: 1,
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
    ...virtualizerOptions,
  })
  const virtualRows = rowVirtualizer.getVirtualItems()
  const virtualHeight = rowVirtualizer.getTotalSize()

  lockColumnsOnFirstScroll = lockColumnsOnFirstScroll ?? virtualizeRows
  useOnFirstScroll(
    tableContainerRef,
    useCallback(() => {
      if (lockColumnsOnFirstScroll) {
        const thCells = tableContainerRef.current?.querySelectorAll('th')

        const columns = Array.from(thCells)
          .map((th) => {
            const { width } = th.getBoundingClientRect()

            return `${width}px`
          })
          .join(' ')

        setFixedGridTemplateColumns(columns)
      }
    }, [lockColumnsOnFirstScroll])
  )
  useEffect(() => {
    if (!lockColumnsOnFirstScroll) {
      setFixedGridTemplateColumns(null)
    }
  }, [lockColumnsOnFirstScroll])

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
        border="1px solid border-fill-two"
        borderRadius="large"
        overflow="auto"
        ref={tableContainerRef}
        onScroll={({ target }: { target: HTMLDivElement }) =>
          setScrollTop(target?.scrollTop)
        }
        width="100%"
        {...props}
      >
        <T gridTemplateColumns={gridTemplateColumns}>
          <Thead>
            {headerGroups.map((headerGroup) => (
              <Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Th
                    key={header.id}
                    stickyColumn={stickyColumn}
                    {...(header.column.getCanSort()
                      ? {
                          cursor:
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
              const row: Row<unknown> = isRow(maybeRow)
                ? maybeRow
                : tableRows[maybeRow.index]
              const i = row.index

              return (
                <Fragment key={row.id}>
                  <Tr
                    key={row.id}
                    onClick={(e) => onRowClick?.(e, row)}
                    lighter={i % 2 === 0}
                    clickable={!!onRowClick}
                    // data-index is required for virtual scrolling to work
                    data-index={row.index}
                    {...(virtualizeRows
                      ? { ref: rowVirtualizer.measureElement }
                      : {})}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <Td
                        key={cell.id}
                        firstRow={i === 0}
                        loose={loose}
                        stickyColumn={stickyColumn}
                        truncateColumn={cell.column?.columnDef?.meta?.truncate}
                        center={cell.column?.columnDef?.meta?.center}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </Td>
                    ))}
                  </Tr>
                  {row.getIsExpanded() && (
                    <Tr lighter={i % 2 === 0}>
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
              behavior: 'smooth',
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

Table.propTypes = propTypes

export default Table
