import styled from 'styled-components'

import {
  tableFillLevelToBorder,
  tableFillLevelToHeaderBorder,
  tableFillLevelToHighlightedCellBg,
} from './colors'
import { type TableFillLevel } from './tableUtils'

export const Td = styled.td<{
  $fillLevel: TableFillLevel
  $firstRow?: boolean
  $loose?: boolean
  $padCells?: boolean
  $stickyColumn: boolean
  $highlight?: boolean
  $truncateColumn: boolean
  $center?: boolean
  $rowsHaveLinks?: boolean
}>(
  ({
    theme,
    $fillLevel: fillLevel,
    $firstRow: firstRow,
    $loose: loose,
    $padCells: padCells,
    $stickyColumn: stickyColumn,
    $highlight: highlight,
    $truncateColumn: truncateColumn = false,
    $center: center,
    $rowsHaveLinks: rowsHaveLinks,
  }) => ({
    ...theme.partials.text.body2LooseLineHeight,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: center ? 'center' : 'flex-start',
    height: 'auto',
    minHeight: padCells ? 52 : 0,

    backgroundColor: highlight
      ? theme.colors[tableFillLevelToHighlightedCellBg[fillLevel]]
      : 'inherit',
    borderTop:
      firstRow || highlight
        ? ''
        : theme.borders[tableFillLevelToBorder[fillLevel]],
    'tr[data-expander-row] + tr &': {
      // for when the previous row is expanded
      borderTop: theme.borders[tableFillLevelToHeaderBorder[fillLevel]],
    },
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
    ...(rowsHaveLinks && {
      zIndex: 1,
      // disable pointer events for children besides interactive elements so row links can capture most clicks
      pointerEvents: 'none',
      '& button, & a, & input, & select, & textarea': { pointerEvents: 'auto' },
    }),
  })
)

export const TdExpand = styled.td(({ theme }) => ({
  '&:last-child': {
    gridColumn: '2 / -1',
  },
  backgroundColor: 'inherit',
  color: theme.colors['text-light'],
  height: 'auto',
  minHeight: 52,
  padding: '16px 12px',
}))

export const TdLoading = styled(Td)(({ theme }) => ({
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

export const TdBasic = styled.td({
  gridColumn: '1 / -1',
  padding: 0,
  overflow: 'hidden',
})

export function TdGhostLink({ width, href }: { width: number; href: string }) {
  return (
    <td style={{ position: 'relative', width: 0 }}>
      <a
        style={{ width, position: 'absolute', inset: '0 0 0 auto', zIndex: 0 }}
        href={href}
      />
    </td>
  )
}
