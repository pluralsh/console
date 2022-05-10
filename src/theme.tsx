import { mergeTheme } from 'honorable'
import defaultTheme from 'honorable-theme-default'

export default mergeTheme(defaultTheme, {
  name: 'plural',
  mode: 'dark',
  colors: {
    primary: '#0639FF',
    secondary: '#222534',
    background: {
      light: 'white',
      dark: '#111525',
    },
    'background-middle': {
      light: '#EEEEEE',
      dark: '#222534',
    },
    'background-top': {
      light: 'white',
      dark: '#323643',
    },
    // text has already been declared by the default theme
    'text-strong': {
      light: '#000000',
      dark: 'white',
    },
    'text-light': {
      light: '#444444',
      dark: '#CCCCCC',
    },
    'text-xlight': {
      light: '#666666',
      dark: '#999999',
    },
    border: {
      light: '#CCCCCC',
      dark: '#303340',
    },
    success: '#07E5A7',
    warning: '#EF931D',
    error: '#E03E43',
    'background-success': '#07E5A733',
    'background-warning': '#EF931D66',
    'background-error': '#E03E4366',
    'background-info': '#0190C266',
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
  html: [
    {
      fontSize: 14,
      fontFamily: 'Monument',
    },
  ],
  global: [
    ({ hoverIndicator }: any) => hoverIndicator && {
      '&:hover': {
        backgroundColor: hoverIndicator,
      },
    },
  ],
  A: {
    Root: [
      {
        color: 'text',
        '&:visited, &:hover, &:active': {
          color: 'text',
        },
      },
    ],
  },
  Button: {
    Root: [
      ({ secondary }: any) => secondary && {
        backgroundColor: 'secondary',
        color: 'white',
        borderColor: 'secondary',
        '&:hover': {
          backgroundColor: 'darken(secondary, 2)',
          borderColor: 'darken(secondary, 2)',
        },
        '&:active': {
          backgroundColor: 'darken(secondary, 5)',
          borderColor: 'darken(secondary, 5)',
        },
      },
    ],
  },
  Checkbox: {
    Root: [
      {
        width: 16,
        height: 16,
      },
    ],
  },
  DropdownButton: {
    Button: {
      Children: [
        ({ install }: any) => install && {
          fontSize: 16,
          fontWeight: 600,
        },
      ],
    },
  },
  Menu: {
    Root: [
      {
        backgroundColor: 'background-middle',
      },
    ],
  },
  MenuItem: {
    Inner: [
      {
        border: 'none',
      },
      ({ active }: any) => active && {
        backgroundColor: 'background-top',
        color: 'white',
        border: 'none',
      },
    ],
  },
  P: {
    Root: [
      ({ body0 }: any) => body0 && {
        fontSize: 18,
      },
      ({ body1 }: any) => body1 && {
        fontSize: 16,
      },
      ({ body2 }: any) => body2 && {
        fontSize: 14,
      },
      ({ body3 }: any) => body3 && {
        fontSize: 12,
      },
      ({ truncate }: any) => truncate && {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      },
    ],
  },
})
