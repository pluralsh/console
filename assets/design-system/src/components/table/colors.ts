import { type ColorMode } from '../../theme'
import { type SemanticBorderKey } from '../../theme/borders'
import { TableFillLevel } from './tableUtils'

export const tableFillLevelToBorder = {
  0: 'default',
  1: 'fill-one',
  2: 'fill-two',
} as const satisfies Record<TableFillLevel, SemanticBorderKey>

export const tableFillLevelToHeaderBorder = {
  0: 'fill-one',
  1: 'fill-two',
  2: 'fill-three',
} as const satisfies Record<TableFillLevel, SemanticBorderKey>

export const tableFillLevelToBg = {
  0: 'fill-zero',
  1: 'fill-one',
  2: 'fill-two',
} as const satisfies Record<TableFillLevel, string>

const tableFillLevelToHeaderBg = {
  0: 'fill-one',
  1: 'fill-two',
  2: 'fill-three',
} as const satisfies Record<TableFillLevel, string>

const tableFillLevelToCellBg = {
  0: 'fill-zero',
  1: 'fill-one',
  2: 'fill-two',
} as const satisfies Record<TableFillLevel, string>

/** Light: dedicated zebra tokens. Dark: legacy mapping (unchanged live behavior). */
const tableFillLevelToRaisedCellBg = {
  light: {
    0: 'fill-zero-raised',
    1: 'fill-one-raised',
    2: 'fill-two-raised',
  },
  dark: {
    0: 'fill-zero-selected',
    1: 'fill-one-selected',
    2: 'fill-two-selected',
  },
} as const satisfies Record<ColorMode, Record<TableFillLevel, string>>

/** Light: true selection. Dark: legacy mapping used hover tokens for selected rows. */
const tableFillLevelToSelectedCellBg = {
  light: {
    0: 'fill-zero-selected',
    1: 'fill-one-selected',
    2: 'fill-two-selected',
  },
  dark: {
    0: 'fill-zero-hover',
    1: 'fill-one-hover',
    2: 'fill-two-hover',
  },
} as const satisfies Record<ColorMode, Record<TableFillLevel, string>>

export const tableFillLevelToHighlightedCellBg = {
  0: 'fill-two',
  1: 'fill-three',
  2: 'fill-three',
} as const satisfies Record<TableFillLevel, string>

const tableFillLevelToHoverCellBg = {
  0: 'fill-zero-hover',
  1: 'fill-one-hover',
  2: 'fill-two-hover',
} as const satisfies Record<TableFillLevel, string>

const raisedCellBg = (fillLevel: TableFillLevel, mode: ColorMode) =>
  tableFillLevelToRaisedCellBg[mode][fillLevel]

const selectedCellBg = (fillLevel: TableFillLevel, mode: ColorMode) =>
  tableFillLevelToSelectedCellBg[mode][fillLevel]

export const tableHeaderColor = (
  fillLevel: TableFillLevel,
  highlighted: boolean
) =>
  highlighted
    ? tableFillLevelToHighlightedCellBg[fillLevel]
    : tableFillLevelToHeaderBg[fillLevel]

export const tableCellColor = (
  fillLevel: TableFillLevel,
  highlighted: boolean,
  raised: boolean,
  selectable: boolean,
  selected: boolean,
  mode: ColorMode
) =>
  highlighted
    ? tableFillLevelToHighlightedCellBg[fillLevel]
    : selected
      ? selectedCellBg(fillLevel, mode)
      : raised || (selectable && !selected)
        ? raisedCellBg(fillLevel, mode)
        : tableFillLevelToCellBg[fillLevel]

export const tableCellHoverColor = (
  fillLevel: TableFillLevel,
  selectable: boolean,
  selected: boolean,
  mode: ColorMode
) => {
  if (mode === 'light') {
    return selected
      ? selectedCellBg(fillLevel, mode)
      : tableFillLevelToHoverCellBg[fillLevel]
  }

  return selectable
    ? selected
      ? selectedCellBg(fillLevel, mode)
      : raisedCellBg(fillLevel, mode)
    : tableFillLevelToHoverCellBg[fillLevel]
}
