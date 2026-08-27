import styled from 'styled-components'

import { tableCellColor, tableCellHoverColor } from './colors'
import { type TableFillLevel } from './tableUtils'
import { SemanticColorKey } from 'src/theme/colors'

export const Tr = styled.tr<{
  $fillLevel: TableFillLevel
  $highlighted?: boolean
  $selected?: boolean
  $selectable?: boolean
  $clickable?: boolean
  $raised?: boolean
  $expandedBgColor?: SemanticColorKey
}>(
  ({
    theme,
    $clickable: clickable = false,
    $raised: raised = false,
    $selectable: selectable = false,
    $selected: selected = false,
    $highlighted: highlighted = false,
    $fillLevel: fillLevel,
    $expandedBgColor: expandedBgColor,
  }) => ({
    display: 'contents',
    backgroundColor:
      theme.colors[
        tableCellColor(
          fillLevel,
          highlighted,
          raised,
          selectable,
          selected,
          theme.mode
        )
      ],
    '&[data-expander-row]': {
      backgroundColor:
        theme.colors[
          expandedBgColor ??
            tableCellHoverColor(fillLevel, selectable, selected, theme.mode)
        ],
    },

    ...(clickable && {
      cursor: 'pointer',

      // highlight when hovered, but not when hovering nested actions
      '&:not(:has(button:hover, [data-clickable="true"]:hover)):hover': {
        backgroundColor:
          theme.colors[
            tableCellHoverColor(fillLevel, selectable, selected, theme.mode)
          ],
      },
    }),
  })
)
