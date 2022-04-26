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
    'text-xweak': {
      light: '#666666',
      dark: '#999999',
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
  html: {
    fontSize: 14,
    fontFamily: 'Monument',
  },
  global: {
    // @ts-ignore
    customProps: new Map([
      [
        ({ hoverIndicator }: any) => hoverIndicator,
        ({ hoverIndicator }: any) => ({
          '&:hover': {
            backgroundColor: hoverIndicator,
          },
        }),
      ],
    ]),
  },
  Button: {
    customProps: new Map([
      [
        ({ secondary }: any) => secondary,
        {
          backgroundColor: 'transparent',
          color: 'primary',
          '&:hover': {
            backgroundColor: 'primary',
            color: 'white',
          },
          '&:active': {
            backgroundColor: 'darken(primary, 10)',
          },
        },
      ],
    ]),
  },
  Checkbox: {
    defaultProps: {
      width: 16,
      height: 16,
    },
  },
  P: {
    customProps: new Map([
      [
        ({ size }: any) => size === 'large',
        {
          fontSize: '1.25rem',
        },
      ],
      [
        ({ size }: any) => size === 'small',
        {
          fontSize: '0.90rem',
        },
      ],
      [
        ({ size }: any) => size === 'xsmall',
        {
          fontSize: '0.70rem',
        },
      ],
      [
        ({ truncate }: any) => truncate,
        {
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
      ],
    ]),
  },
})
