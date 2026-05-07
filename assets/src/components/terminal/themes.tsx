import * as themes from 'xterm-theme'

export const normalizedThemes = Object.entries(themes)
  .filter(([key]) => key !== 'default')
  .sort(([a], [b]) => a.localeCompare(b))
  .reduce((acc, [key, theme]) => ({ ...acc, [key.toLowerCase()]: theme }), {})
export const themeNames = Object.keys(normalizedThemes)
