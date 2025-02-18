import { TableFillLevel } from './tableUtils'

export const tableFillLevelToBorder = {
  0: 'fill-two',
  1: 'fill-three',
  2: 'fill-three',
} as const satisfies Record<TableFillLevel, string>

export const tableFillLevelToBorderColor = {
  0: 'border-fill-two',
  1: 'border-fill-three',
  2: 'border-fill-three',
} as const satisfies Record<TableFillLevel, string>

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

const tableFillLevelToRaisedCellBg = {
  0: 'fill-zero-selected',
  1: 'fill-one-selected',
  2: 'fill-two-selected',
} as const satisfies Record<TableFillLevel, string>

const tableFillLevelToSelectedCellBg = {
  0: 'fill-zero-hover',
  1: 'fill-one-hover',
  2: 'fill-two-hover',
} as const satisfies Record<TableFillLevel, string>

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
  selected: boolean
) =>
  highlighted
    ? tableFillLevelToHighlightedCellBg[fillLevel]
    : selected
    ? tableFillLevelToSelectedCellBg[fillLevel]
    : raised || (selectable && !selected)
    ? tableFillLevelToRaisedCellBg[fillLevel]
    : tableFillLevelToCellBg[fillLevel]

export const tableCellHoverColor = (
  fillLevel: TableFillLevel,
  selectable: boolean,
  selected: boolean
) =>
  selectable
    ? selected
      ? tableFillLevelToSelectedCellBg[fillLevel]
      : tableFillLevelToRaisedCellBg[fillLevel]
    : tableFillLevelToHoverCellBg[fillLevel]
