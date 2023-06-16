import { type PrefixKeys } from '../utils/ts-utils'

export const baseSpacing = {
  xxxsmall: 2, //      1/8 * 16
  xxsmall: 4, //       1/4 * 16
  xsmall: 8, //        1/2 * 16
  small: 12, //        3/4 * 16
  medium: 16, //       1   * 16
  large: 24, //        1.5 * 16
  xlarge: 32, //       2   * 16
  xxlarge: 48, //      3   * 16
  xxxlarge: 64, //     4   * 16
  xxxxlarge: 96, //    6   * 16
  xxxxxlarge: 128, //  8   * 16
  xxxxxxlarge: 192, // 12  * 16
} as const satisfies Record<string, number>

const negativePrefix = 'minus-' as const
const negativeSpacing = Object.fromEntries(
  Object.entries(baseSpacing).map((key, val) => [
    `${negativePrefix}${key}`,
    -val,
  ])
) as PrefixKeys<typeof baseSpacing, typeof negativePrefix, number>

export const spacing = {
  none: 0,
  ...baseSpacing,
  ...negativeSpacing,
} as const satisfies Record<string, number>
