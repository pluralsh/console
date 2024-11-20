import type { Row } from '@tanstack/react-table'
import type { VirtualItem } from '@tanstack/react-virtual'

import { type TableFillLevel } from './Table'
import { Td } from './Td'
import { Tr } from './Tr'

function FillerRow({
  columns,
  height,
  index,
  stickyColumn,
  selectable,
  fillLevel,
  ...props
}: {
  columns: unknown[]
  height: number
  index: number
  stickyColumn: boolean
  selectable?: boolean
  fillLevel: TableFillLevel
}) {
  return (
    <Tr
      aria-hidden="true"
      $raised={index % 2 === 1}
      $selected={false}
      $selectable={selectable}
      $fillLevel={fillLevel}
    >
      <Td
        aria-hidden="true"
        $fillLevel={fillLevel}
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

export function FillerRows({
  rows,
  height,
  position,
  fillLevel,
  ...props
}: {
  rows: Row<unknown>[] | VirtualItem[]
  columns: unknown[]
  height: number
  position: 'top' | 'bottom'
  stickyColumn: boolean
  clickable?: boolean
  selectable?: boolean
  fillLevel: TableFillLevel
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
        fillLevel={fillLevel}
        {...props}
      />
      <FillerRow
        height={position === 'top' ? height : 0}
        index={
          position === 'top'
            ? rows[0].index - 1
            : rows[rows.length - 1].index + 2
        }
        fillLevel={fillLevel}
        {...props}
      />
    </>
  )
}
