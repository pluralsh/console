import { mergeTheme } from 'honorable'
import defaultTheme from 'honorable-theme-default'

const grey = {
  950: '#0E1015',
  900: '#171A21',
  850: '#1E2229',
  800: '#2A2E37',
  750: '#363B45',
  700: '#434956',
  600: '#555C68',
  500: '#757D8A',
  400: '#9096A2',
  300: '#A9B0BC',
  200: '#C4CAD4',
  100: '#DEE2E8',
  50: '#E9ECF0',
}
const blue = {
  950: '#00041A',
  900: '#000933',
  850: '#000B4D',
  800: '#000E66',
  700: '#001299',
  600: '#0011CC',
  500: '#151DF9',
  400: '#293EFF',
  350: '#3853FF',
  300: '#5C77FF',
  200: '#8FB4FF',
  100: '#C2D8FF',
  50: '#F0F5FF',
}
const green = {
  950: '#001409',
  900: '#00240F',
  850: '#023C1A',
  800: '#045827',
  700: '#08873D',
  600: '#0BB151',
  500: '#17E86E',
  400: '#42F08B',
  300: '#71F4A8',
  200: '#A5F8C8',
  100: '#D7FEE7',
  50: '#F5FFF9',
}
const yellow = {
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
const red = {
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
    // Base palette,
    blue,
    grey,
    green,
    yellow,
    red,
    // Semantic colors,
    // Fill,
    'fill-zero': 'grey.900',
    'fill-zero-hover': 'grey.850',
    'fill-zero-selected': 'grey.800',
    'fill-one': 'grey.850',
    'fill-one-hover': 'grey.800',
    'fill-one-selected': 'grey.750',
    'fill-two': 'grey.800',
    'fill-two-hover': 'grey.750',
    'fill-two-selected': 'grey.700',
    'fill-three': 'grey.750',
    // Action,
    'action-primary': 'blue.400',
    'action-primary-hover': 'blue.350',
    'action-primary-disabled': 'blue.750',
    'action-link-inactive': 'gray.200',
    'action-link-active': 'gray.50',
    'action-link-inline': 'blue.200',
    // Border,
    border: 'grey.800',
    'border-input': 'grey.700',
    'border-fill-two': 'grey.750',
    'border-disabled': 'grey.700',
    'border-primary': 'blue.400',
    'border-success': 'green.500',
    'border-warning': 'yellow.400',
    'border-error': 'red.400',
    // Content,
    text: 'grey.50',
    'text-light': 'grey.200',
    'text-xlight': 'grey.400',
    'text-disabled': 'grey.700',
    'text-success': 'green.200',
    'text-warning': 'yellow.200',
    'text-error': 'red.200',
    // Icon,
    'icon-success': 'green.500',
    'icon-warning': 'yellow.400',
    'icon-error': 'red.400',
  },
  html: [
    {
      fontSize: 14,
      fontFamily: 'Inter',
      backgroundColor: 'fill-zero',
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
        backgroundColor: 'action-primary',
        borderRadius: 4, // TODO 3 or 6
        fontWeight: 400,
      },
    ],
  },
  Button: {
    Root: [
      {
        backgroundColor: 'action-primary',
        ':hover': {
          backgroundColor: 'action-primary-hover',
        },
        ':active': {
          backgroundColor: 'action-primary',
        },
      },
      // ({ secondary }: any) => secondary && {
      //   backgroundColor: 'secondary',
      //   color: 'white',
      //   borderColor: 'secondary',
      //   '&:hover': {
      //     backgroundColor: 'darken(secondary, 2)',
      //     borderColor: 'darken(secondary, 2)',
      //   },
      //   '&:active': {
      //     backgroundColor: 'darken(secondary, 5)',
      //     borderColor: 'darken(secondary, 5)',
      //   },
      // },
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
        backgroundColor: 'fill-two',
      },
    ],
  },
  MenuItem: {
    Inner: [
      {
        border: 'none',
      },
      ({ active }: any) => active && {
        backgroundColor: 'fill-two-selected',
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
        backgroundColor: 'fill-',
      },
    ],
    Arrow: [
      {
        backgroundColor: 'background-top',
      },
    ],
  },
})
