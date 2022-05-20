import { mergeTheme } from 'honorable'
import defaultTheme from 'honorable-theme-default'

const blue = {
  950: '#00041A',
  900: '#000933',
  850: '#000B4D',
  800: '#000E66',
  700: '#001299',
  600: '#0011CC',
  500: '#151DF9',
  400: '#293EFF',
  300: '#5C77FF',
  200: '#8FB4FF',
  100: '#C2D8FF',
  50: '#F0F5FF',
}

const grey = {
  950: '#0E1015',
  900: '#171A21',
  850: '#1E2229',
  800: '#2A2E37',
  700: '#434956',
  600: '#555C68',
  500: '#757D8A',
  400: '#9096A2',
  300: '#A9B0BC',
  200: '#C4CAD4',
  100: '#DEE2E8',
  50: '#E9ECF0',
}

const success = {
  950: '#001409',
  900: '#00240F',
  850: '#023C1A',
  800: '#045827',
  700: '#08873D',
  600: '#0BB151',
  500: '#17E86E',
  400: '#42F08B',
  300: '#A5F8C8',
  200: '#A5F8C8',
  100: '#D7FEE7',
  50: '#F5FFF9',
}

const warning = {
  950: '#241700',
  900: '#3D2700',
  850: '#573B00',
  800: '#755200',
  700: '#A87E00',
  600: '#D6AF00',
  500: '#FFC800',
  400: '#FFD129',
  300: '#FFE175',
  200: '#FFE78F',
  100: '#FFF2C2',
  50: '#FFFCF0',
}

const error = {
  950: '#140000',
  900: '#240100',
  850: '#3D0100',
  800: '#5A0502',
  700: '#800B05',
  600: '#AE1409',
  500: '#E82817',
  400: '#F66555',
  300: '#FA897A',
  200: '#FDB1A5',
  100: '#FFD8D1',
  50: '#FFF7F5',
}

export default mergeTheme(defaultTheme, {
  name: 'plural',
  mode: 'dark',
  colors: {
    blue,
    grey,
    success,
    warning,
    error,
    primary: '#293EFF',
    secondary: '#222534',
    background: {
      light: 'white',
      dark: 'grey.900',
    },
    'background-light': {
      light: '#F5F5F5',
      dark: 'grey.800',
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
    text: {
      light: 'black',
      dark: 'grey.50',
    },
    'text-strong': {
      light: '#000000',
      dark: 'white',
    },
    'text-light': {
      light: '#444444',
      dark: 'grey.200',
    },
    'text-xlight': {
      light: '#666666',
      dark: 'grey.300',
    },
    border: {
      light: '#CCCCCC',
      dark: '#303340',
    },
    'background-success': '#07E5A733',
    'background-warning': '#EF931D66',
    'background-error': '#E03E4366',
    'background-info': '#0190C266',
  },
  html: [
    {
      fontSize: 14,
      fontFamily: 'Inter',
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
  Avatar: {
    Root: [
      {
        backgroundColor: 'primary',
        borderRadius: 4,
        fontWeight: 400,
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
    Control: [
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
  H1: {
    Root: [
      {
        fontFamily: 'Monument',
      },
    ],
  },
  H2: {
    Root: [
      {
        fontFamily: 'Monument',
      },
    ],
  },
  H3: {
    Root: [
      {
        fontFamily: 'Monument',
      },
    ],
  },
  H4: {
    Root: [
      {
        fontFamily: 'Monument',
      },
    ],
  },
  H5: {
    Root: [
      {
        fontFamily: 'Monument',
      },
    ],
  },
  H6: {
    Root: [
      {
        fontFamily: 'Monument',
      },
    ],
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
  Tooltip: {
    Root: [
      {
        backgroundColor: 'background-top',
      },
    ],
    Arrow: [
      {
        backgroundColor: 'background-top',
      },
    ],
  },
})
