import { type ReactNode } from 'react'
import { type DefaultTheme, useTheme } from 'styled-components'

import { type SemanticColorKey } from '../../theme/colors'
import Icon, { type IconProps as IconLayoutProps } from '../Icon'

type IconBaseProps = {
  size?: number | string
  color?: string
  fullColor?: boolean
  secondaryColor?: string
  mode?: string
}

export type IconProps = IconLayoutProps & IconBaseProps

function resolveThemeColor(
  color: string | undefined,
  colors: DefaultTheme['colors']
) {
  if (color == null) return color
  const resolved = colors[color as SemanticColorKey]

  return typeof resolved === 'string' ? resolved : color
}

function createIcon(render: (props: IconBaseProps) => ReactNode) {
  function CreatedIcon({
    ref,
    size = 16,
    color = 'currentColor',
    fullColor,
    secondaryColor,
    ...props
  }: IconProps) {
    const theme = useTheme()

    return (
      <Icon
        ref={ref}
        {...props}
      >
        {render({
          size,
          color: resolveThemeColor(color, theme.colors),
          secondaryColor: resolveThemeColor(secondaryColor, theme.colors),
          fullColor,
          mode: theme.mode,
        })}
      </Icon>
    )
  }

  return CreatedIcon
}

export default createIcon
