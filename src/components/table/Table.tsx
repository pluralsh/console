import type { Row } from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { isEmpty, isNil } from 'lodash-es'
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import styled, { useTheme } from 'styled-components'

import { InfoOutlineIcon, Tooltip, WrapWithIf } from '../../index'
import Button from '../Button'
import EmptyState from '../EmptyState'
import CaretUpIcon from '../icons/CaretUpIcon'
import { Spinner } from '../Spinner'

import { toTableFillLevel } from '../contexts/FillLevelContext'
import {
  tableFillLevelToBg,
  tableFillLevelToBorderColor,
  tableFillLevelToHighlightedCellBg,
} from './colors'
import { FillerRows } from './FillerRows'
import { useOnVirtualSliceChange } from './hooks'
import { Skeleton } from './Skeleton'
import { SortIndicator } from './SortIndicator'
import { T } from './T'
import {
  defaultGlobalFilterFn,
  getGridTemplateCols,
  isRow,
  isValidId,
  measureElementHeight,
  TableProps,
} from './tableUtils'
import { Tbody } from './Tbody'
import { Td, TdBasic, TdExpand, TdLoading } from './Td'
import { Th } from './Th'
import { Thead } from './Thead'
import { Tr } from './Tr'

function Table({
  ref: forwardedRef,
  data,
  columns,
  loading = false,
  loadingSkeletonRows = 10,
  hideHeader = false,
  getRowCanExpand,
  renderExpanded,
  loose = false,
  padCells = true,
  expandedRowType = 'default',
  fullHeightWrap = false, // TODO: default this to true after regression testing
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
  onScrollCapture,
  ...props
}: TableProps) {
  const theme = useTheme()
  const tableContainerRef = useRef<HTMLDivElement>(undefined)
  const [hover, setHover] = useState(false)
  const [scrollTop, setScrollTop] = useState(0)
  const [expanded, setExpanded] = useState({})

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
    onExpandedChange: setExpanded,
    ...reactTableOptions,
    state: {
      expanded,
      ...reactTableOptions?.state,
    },
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
    overscan: 0,
    getItemKey,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 52,
    measureElement: (el) => {
      let totalHeight = measureElementHeight(el)
      // add height of expanded row if present
      const sibling = el.nextElementSibling
      if (sibling?.getAttribute('data-expander-row'))
        totalHeight += measureElementHeight(sibling)

      return totalHeight
    },
    ...reactVirtualOptions,
  })
  const virtualRows = rowVirtualizer.getVirtualItems()
  const virtualHeight = rowVirtualizer.getTotalSize()

  useOnVirtualSliceChange({ virtualRows, virtualizeRows, onVirtualSliceChange })

  // lock column widths when scrolling
  useEffect(() => {
    if ((lockColumnsOnScroll ?? virtualizeRows) && rowVirtualizer.isScrolling) {
      const thCells = tableContainerRef.current?.querySelectorAll('th')
      const columns = Array.from(thCells)
        .map((th) => {
          const { width } = th.getBoundingClientRect()
          return `${width}px`
        })
        .join(' ')
      setFixedGridTemplateColumns(columns)
    } else {
      setFixedGridTemplateColumns(null)
    }
  }, [lockColumnsOnScroll, rowVirtualizer.isScrolling, virtualizeRows])

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

  const expanderBorder =
    theme.borders[
      tableFillLevelToHighlightedCellBg[toTableFillLevel(fillLevel)]
    ]

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
    <WrapWithIf
      condition={fullHeightWrap}
      wrapper={<FullHeightWrapSC />}
    >
      <TableWrapSC
        ref={forwardedRef}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        $width={width}
      >
        <TableSC
          ref={tableContainerRef}
          onScroll={(e) => setScrollTop(e.currentTarget?.scrollTop)}
          onScrollCapture={onScrollCapture}
          $fillLevel={fillLevel}
          $flush={flush}
          css={props}
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
                            <Tooltip
                              label={header.column.columnDef.meta.tooltip}
                            >
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
                    const tableRow: Row<unknown> | null = isRow(maybeRow)
                      ? maybeRow
                      : isLoaderRow
                      ? null
                      : tableRows[maybeRow.index]
                    const virtualRow = !isRow(maybeRow) ? maybeRow : null
                    const key =
                      virtualRow?.key ?? tableRow?.id ?? maybeRow.index

                    return (
                      <Fragment key={key}>
                        <Tr
                          key={`${key}-${tableRow?.getIsExpanded()}`} // forces row to be rerendered (and remeasured) when expanded state changes
                          data-index={virtualRow?.index} // required for virtual scrolling to work
                          ref={
                            virtualizeRows
                              ? rowVirtualizer.measureElement
                              : undefined
                          }
                          onClick={(e) => onRowClick?.(e, tableRow)}
                          $fillLevel={fillLevel}
                          $raised={isRaised(i)}
                          $highlighted={tableRow?.id === highlightedRowId}
                          $selectable={tableRow?.getCanSelect() ?? false}
                          $selected={tableRow?.getIsSelected() ?? false}
                          $clickable={!!onRowClick}
                        >
                          {isNil(tableRow) && isLoaderRow ? (
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
                            tableRow?.getVisibleCells().map((cell) => (
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
                        {tableRow?.getIsExpanded() && (
                          <Tr
                            data-expander-row
                            $fillLevel={fillLevel}
                            $raised={isRaised(i)}
                            $type="expander"
                          >
                            {expandedRowType === 'default' ? (
                              <>
                                <TdExpand css={{ borderTop: expanderBorder }} />
                                <TdExpand
                                  colSpan={
                                    tableRow.getVisibleCells().length - 1
                                  }
                                  css={{ borderTop: expanderBorder }}
                                >
                                  {renderExpanded({ row: tableRow })}
                                </TdExpand>
                              </>
                            ) : (
                              <TdBasic>
                                {renderExpanded({ row: tableRow })}
                              </TdBasic>
                            )}
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
        </TableSC>
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
      </TableWrapSC>
    </WrapWithIf>
  )
}

const FullHeightWrapSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
})

const TableWrapSC = styled.div<{
  $width?: TableProps['width']
}>(({ $width }) => ({
  maxHeight: '100%',
  position: 'relative',
  width: $width,
}))

const TableSC = styled.div<{
  $flush?: TableProps['flush']
  $fillLevel?: TableProps['fillLevel']
}>(({ theme, $flush, $fillLevel }) => ({
  backgroundColor: theme.colors[tableFillLevelToBg[$fillLevel]],
  border: $flush
    ? 'none'
    : `1px solid ${theme.colors[tableFillLevelToBorderColor[$fillLevel]]}`,
  borderRadius: $flush
    ? `0 0 ${theme.borderRadiuses.large}px ${theme.borderRadiuses.large}px`
    : theme.borderRadiuses.large,
  height: '100%',
  overflow: 'auto',
  width: '100%',
}))

export default Table
