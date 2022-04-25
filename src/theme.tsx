import { mergeTheme } from 'honorable'
import defaultTheme from 'honorable-theme-default'

export default mergeTheme(defaultTheme, {
  name: 'plural',
  mode: 'dark',
  colors: {
    primary: '#0639FF',
    background: {
      light: 'white',
      dark: '#111525',
    },
    'background-back': {
      light: '#EEEEEE',
      dark: '#111525',
    },
    'background-front': {
      light: 'white',
      dark: '#181B29',
    },
    'background-contrast': {
      light: '#11111111',
      dark: '#222534',
    },
    // text has already been declared by the default theme
    'text-strong': {
      light: '#000000',
      dark: 'white',
    },
    'text-weak': {
      light: '#444444',
      dark: '#CCCCCC',
    },
    border: {
      light: '#CCCCCC',
      dark: '#303340',
    },
    error: '#E03E43',
    warning: '#EF931D',
    success: '#07E5A7',
    'accent-blue': {
      dark: '#0190C2',
      light: '#0190C2',
    },
    'accent-purple': {
      dark: '#9510A1',
      light: '#9510A1',
    },
    'accent-green': {
      dark: '#058E4B',
      light: '#058E4B',
    },
  },
})
