import { useTheme } from 'styled-components'

import { type SemanticColorKey } from '../../theme/colors'
import { type IconProps, resolveThemeColor } from './createIcon'
import Icon from '../Icon'

export type SeverityIconLevel = 0 | 1 | 2 | 3
export type SeverityIconSeverity =
  'critical' | 'high' | 'medium' | 'low' | 'undefined'

// Default bars and color per severity. There is no separate "high" mark:
// high and critical are both fully filled, critical in the stronger color.
const SEVERITY_DEFAULTS: Record<
  SeverityIconSeverity,
  { level: SeverityIconLevel; color: SemanticColorKey | 'currentColor' }
> = {
  critical: { level: 3, color: 'icon-danger-critical' },
  high: { level: 3, color: 'icon-danger' },
  medium: { level: 2, color: 'icon-warning' },
  low: { level: 1, color: 'icon-success' },
  undefined: { level: 0, color: 'currentColor' },
}

const BARS = [
  'M2 9.5C2 9.22386 2.22386 9 2.5 9H4.5C4.77614 9 5 9.22386 5 9.5V13.5C5 13.7761 4.77614 14 4.5 14H2.5C2.22386 14 2 13.7761 2 13.5V9.5Z',
  'M6.5 6.5C6.5 6.22386 6.72386 6 7 6H9C9.27614 6 9.5 6.22386 9.5 6.5V13.5C9.5 13.7761 9.27614 14 9 14H7C6.72386 14 6.5 13.7761 6.5 13.5V6.5Z',
  'M11 3.5C11 3.22386 11.2239 3 11.5 3H13.5C13.7761 3 14 3.22386 14 3.5V13.5C14 13.7761 13.7761 14 13.5 14H11.5C11.2239 14 11 13.7761 11 13.5V3.5Z',
]

// Signal-bar severity mark. `severity` (default `undefined`: all bars empty)
// sets how many of the 3 bars are filled and their color; `level` and `color`
// override those. Empty bars use `secondaryColor` (defaults to
// `border-fill-two`).
function SeverityIcon({
  ref,
  severity = 'undefined',
  level,
  size = 16,
  color,
  secondaryColor = 'border-fill-two',
  fullColor: _fullColor,
  ...props
}: IconProps & {
  severity?: SeverityIconSeverity
  level?: SeverityIconLevel
}) {
  const { colors } = useTheme()
  const defaults = SEVERITY_DEFAULTS[severity]
  const filledBars = level ?? defaults.level
  const filled = resolveThemeColor(color ?? defaults.color, colors)
  const empty = resolveThemeColor(secondaryColor, colors)

  return (
    <Icon
      ref={ref}
      {...props}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {BARS.map((d, i) => (
          <path
            key={d}
            d={d}
            fill={i < filledBars ? filled : empty}
          />
        ))}
      </svg>
    </Icon>
  )
}

export default SeverityIcon
