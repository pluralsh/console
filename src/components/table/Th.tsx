import type { CSSProperties } from 'react'
import styled from 'styled-components'

import { tableFillLevelToBorder, tableHeaderColor } from './colors'
import { type TableFillLevel } from './tableUtils'

export const Th = styled.th<{
  $fillLevel: TableFillLevel
  $stickyColumn: boolean
  $highlight?: boolean
  $cursor?: CSSProperties['cursor']
  $hideHeader?: boolean
}>(
  ({
    theme,
    $fillLevel: fillLevel,
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
      backgroundColor: theme.colors[tableHeaderColor(fillLevel, highlight)],
      zIndex: 4,
      borderBottom: highlight
        ? undefined
        : theme.borders[tableFillLevelToBorder[fillLevel]],
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
        backgroundColor: theme.colors[tableHeaderColor(fillLevel, false)],
        borderBottom: hideHeader
          ? 'none'
          : theme.borders[tableFillLevelToBorder[fillLevel]],
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
