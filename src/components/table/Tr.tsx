import styled from 'styled-components'

import { tableCellColor, tableCellHoverColor } from './colors'
import { type TableFillLevel } from './tableUtils'

export const Tr = styled.tr<{
  $fillLevel: TableFillLevel
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
    $fillLevel: fillLevel,
  }) => ({
    display: 'contents',
    backgroundColor:
      theme.colors[
        tableCellColor(fillLevel, highlighted, raised, selectable, selected)
      ],
    '&[data-expander-row]': {
      backgroundColor:
        theme.colors[tableCellHoverColor(fillLevel, selectable, selected)],
    },

    ...(clickable && {
      cursor: 'pointer',

      // highlight when hovered, but don't highlight if a child button is hovered
      '&:not(:has(button:hover)):hover': {
        backgroundColor:
          theme.colors[tableCellHoverColor(fillLevel, selectable, selected)],
      },
    }),
  })
)
