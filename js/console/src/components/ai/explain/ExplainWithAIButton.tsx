import { DefaultTheme } from 'styled-components'

export const aiGradientBorderStyles = (
  theme: DefaultTheme,
  backgroundColor: keyof DefaultTheme['colors'] = 'fill-zero'
) => ({
  backgroundImage: `linear-gradient(${theme.colors[backgroundColor]}, ${theme.colors[backgroundColor]}), linear-gradient(to bottom, ${theme.colors.semanticBlue}, ${theme.colors['border-input']})`,
  backgroundClip: 'padding-box, border-box',
  backgroundOrigin: 'border-box',
  border: '1px solid transparent',
})
