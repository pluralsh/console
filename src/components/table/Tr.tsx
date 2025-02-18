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
  $type?: 'regular' | 'expander'
}>(
  ({
    theme,
    $clickable: clickable = false,
    $raised: raised = false,
    $selectable: selectable = false,
    $selected: selected = false,
    $highlighted: highlighted = false,
    $fillLevel: fillLevel,
    $type: type = 'regular',
  }) => ({
    display: 'contents',
    backgroundColor:
      theme.colors[
        type === 'expander'
          ? tableCellHoverColor(fillLevel, selectable, selected)
          : tableCellColor(fillLevel, highlighted, raised, selectable, selected)
      ],

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
