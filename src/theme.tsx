import { mergeTheme } from 'honorable'
import defaultTheme from 'honorable-theme-default'

const fontFamilies = {
  semi: '"Monument Semi-Mono", "Monument", "Inter", "Helvetica", "Arial", "sans-serif"',
  sans: '"Inter", "Helvetica", "Arial", "sans-serif"',
}

const grey = {
  950: '#0E1015',
  900: '#171A21',
  875: '#1C2026',
  850: '#1E2229',
  825: '#23272E',
  800: '#2A2E37',
  775: '#303540',
  750: '#363B45',
  725: '#3C414D',
  700: '#434956',
  675: '#49515F',
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

const borderRadiuses = {
  medium: 3,
  large: 6,
  normal: 3, // deprecated in favor of medium
}

const boxShadows = {
  slight: '0px 2px 4px transparency(grey.950, 88), 0px 3px 6px transparency(grey.950, 85)',
  moderate: '0px 3px 6px transparency(grey.950, 80), 0px 10px 20px transparency(grey.950, 70)',
  modal: '0px 20px 50px transparency(grey.950, 40)',
}

const spacing = {
  none: 0,
  xxxsmall: 2,
  xxsmall: 4,
  xsmall: 8,
  small: 12,
  medium: 16,
  large: 24,
  xlarge: 32,
  xxlarge: 48,
  xxxlarge: 64,
  xxxxlarge: 96,
}

const spacers = {
  margin: ['margin'],
  marginTop: ['marginTop'],
  marginRight: ['marginRight'],
  marginBottom: ['marginBottom'],
  marginLeft: ['marginLeft'],
  marginHorizontal: ['marginLeft', 'marginRight'],
  marginVertical: ['marginTop', 'marginBottom'],
  padding: ['padding'],
  paddingTop: ['paddingTop'],
  paddingRight: ['paddingRight'],
  paddingBottom: ['paddingBottom'],
  paddingLeft: ['paddingLeft'],
  paddingHorizontal: ['paddingLeft', 'paddingRight'],
  paddingVertical: ['paddingTop', 'paddingBottom'],
}

export default mergeTheme(defaultTheme, {
  name: 'Plural',
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
    'fill-zero-hover': 'grey.825',
    'fill-zero-selected': 'grey.775',
    'fill-one': 'grey.850',
    'fill-one-hover': 'grey.775',
    'fill-one-selected': 'grey.725',
    'fill-two': 'grey.800',
    'fill-two-hover': 'grey.725',
    'fill-two-selected': 'grey.675',
    'fill-three': 'grey.750',
    // Action,
    'action-primary': 'blue.400',
    'action-primary-hover': 'blue.350',
    'action-primary-disabled': 'blue.700',
    'action-link-inactive': 'grey.200',
    'action-link-active': 'grey.50',
    'action-link-inline': 'blue.200',
    'action-input-hover': 'transparency(grey.50, 96)',
    // Border,
    border: 'grey.800',
    'border-input': 'grey.700',
    'border-fill-two': 'grey.750',
    'border-disabled': 'grey.700',
    'border-outline': 'blue.300',
    'border-primary': 'blue.400',
    'border-success': 'green.500',
    'border-warning': 'yellow.400',
    'border-error': 'red.400',
    // Content,
    text: 'grey.50',
    'text-light': 'grey.200',
    'text-xlight': 'grey.400',
    'text-primary': 'blue.200',
    'text-success': 'green.200',
    'text-warning': 'yellow.200',
    'text-error': 'red.200',
    'text-disabled': 'grey.700',
    // Icon,
    'icon-success': 'green.500',
    'icon-warning': 'yellow.400',
    'icon-error': 'red.400',
  },
  stylesheet: {
    html: [
      {
        fontSize: 14,
        fontFamily: fontFamilies.semi,
        backgroundColor: 'fill-zero',
      },
    ],
    '::placeholder': [
      {
        color: 'text-xlight',
      },
    ],
  },
  global: [
    /* Spacing */
    ...Object.entries(spacers).map(([key, nextKeys]) => (props: any) => props[key] !== null && typeof props[key] !== 'undefined' && Object.fromEntries(nextKeys.map(nextKey => [nextKey, spacing[props[key]] || props[key]]))),
    ({ gap }: any) => typeof gap !== 'undefined' && {
      gap: spacing[gap] || gap,
    },
    ({ fill }: any) => fill === true && { // === true to prevent the `fill` css property to apply here
      width: '100%',
      height: '100%',
    },
    /* Border radiuses */
    ({ borderRadius }: any) => typeof borderRadius !== 'undefined' && ({
      borderRadius: borderRadiuses[borderRadius] || borderRadius,
    }),
    /* Shadows */
    ({ boxShadow }: any) => typeof boxShadow !== 'undefined' && ({
      boxShadow: boxShadows[boxShadow] || boxShadow,
    }),
    ({ h1 }: any) => h1 && {
      fontFamily: fontFamilies.semi,
      fontSize: 72,
      lineHeight: '110%',
      fontWeight: 400,
      letterSpacing: '-1px',
    },
    ({ h2 }: any) => h2 && {
      fontFamily: fontFamilies.semi,
      fontSize: 60,
      lineHeight: '115%',
      fontWeight: 500,
      letterSpacing: '-1px',
    },
    ({ h3 }: any) => h3 && {
      fontFamily: fontFamilies.semi,
      fontSize: 48,
      lineHeight: '120%',
      fontWeight: 400,
      letterSpacing: '-0.5px',
    },
    ({ h4 }: any) => h4 && {
      fontFamily: fontFamilies.semi,
      fontSize: 36,
      lineHeight: '45px',
      fontWeight: 400,
      letterSpacing: '-0.25px',
    },
    ({ title1 }: any) => title1 && {
      fontFamily: fontFamilies.semi,
      fontSize: 30,
      lineHeight: '40px',
      fontWeight: 500,
      letterSpacing: '-0.25px',
    },
    ({ title2 }: any) => title2 && {
      fontFamily: fontFamilies.semi,
      fontSize: 24,
      lineHeight: '32px',
      fontWeight: 500,
      letterSpacing: '-0.25px',
    },
    ({ subtitle1 }: any) => subtitle1 && {
      fontFamily: fontFamilies.semi,
      fontSize: 20,
      lineHeight: '24px',
      fontWeight: 500,
      letterSpacing: 0,
    },
    ({ subtitle2 }: any) => subtitle2 && {
      fontFamily: fontFamilies.semi,
      fontSize: 20,
      lineHeight: '24px',
      fontWeight: 500,
      letterSpacing: 0,
    },
    ({ body1, body2, bold }: any) => ({
      ...((body1 || body2) && {
        fontFamily: fontFamilies.sans,
        fontWeight: 400,
        letterSpacing: '0.5px',
        'b&': {
          bodyWeight: 600,
        },
      }),
      ...((body1 || body2) && bold && {
        fontWeight: 600,
      }),
      ...(body1 && {
        fontSize: 16,
        lineHeight: '24px',
      }),
      ...(body2 && {
        fontSize: 14,
        lineHeight: '20px',
      }),
    }),
    ({ caption }: any) => caption && {
      fontFamily: fontFamilies.sans,
      fontSize: 12,
      lineHeight: '16px',
      fontWeight: 400,
      letterSpacing: '0.5px',
    },
    ({ badgeLabel }: any) => badgeLabel && {
      fontFamily: fontFamilies.semi,
      fontSize: 12,
      lineHeight: '100%',
      fontWeight: 700,
      letterSpacing: '0.5px',
    },
    ({ buttonLarge }: any) => buttonLarge && {
      fontFamily: fontFamilies.semi,
      fontSize: 16,
      lineHeight: '24px',
      fontWeight: 500,
      letterSpacing: '0.5px',
    },
    ({ buttonSmall }: any) => buttonSmall && {
      fontFamily: fontFamilies.semi,
      fontSize: 14,
      lineHeight: '24px',
      fontWeight: 500,
      letterSpacing: '0.5px',
    },
    ({ overline }: any) => overline && {
      fontFamily: fontFamilies.semi,
      fontSize: 14,
      lineHeight: '24px',
      fontWeight: 400,
      letterSpacing: '1px',
      textTransform: 'uppercase',
    },
    ({ truncate }: any) => truncate && {
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    /* Deprecated */
    ({ body0 }: any) => body0 && {
      fontSize: 18,
      lineHeight: '28px',
    },
    /* Deprecated */
    ({ font }: any) => font === 'action' && {
      fontFamily: 'Monument',
      letterSpacing: 1,
      fontWeight: 500,
    },
    /* deprecated in favor of _hover */
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
      ({ inline }: any) => inline && {
        color: 'action-link-inline',
        '&:visited, &:hover, &:active': {
          color: 'action-link-inline',
        },
      },
    ],
  },
  Accordion: {
    Root: [
      ({ ghost }: any) => ghost && {
        border: 'none',
        elevation: 0,
        backgroundColor: 'inherit',
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
        display: 'flex',
        font: 'action',
        lineHeight: '24px',
        borderRadius: 'normal',
        backgroundColor: 'action-primary',
        padding: '8px 16px',
        ':hover': {
          backgroundColor: 'action-primary-hover',
        },
        ':active': {
          backgroundColor: 'action-primary',
        },
        ':disabled': {
          color: 'text-disabled',
          backgroundColor: 'action-primary-disabled',
          ':hover': {
            backgroundColor: 'action-primary-disabled',
          },
        },
      },
      ({ secondary }: any) => secondary && {
        border: '1px solid border-input',
        backgroundColor: 'transparent',
        ':hover': {
          backgroundColor: 'action-input-hover',
        },
        ':active': {
          backgroundColor: 'transparent',
        },
        ':disabled': {
          backgroundColor: 'transparent',
          ':hover': {
            backgroundColor: 'transparent',
          },
        },
      },
      ({ tertiary }: any) => tertiary && {
        backgroundColor: 'transparent',
        ':hover': {
          backgroundColor: 'action-input-hover',
        },
        ':active': {
          backgroundColor: 'transparent',
        },
        ':disabled': {
          backgroundColor: 'transparent',
          ':hover': {
            backgroundColor: 'transparent',
          },
        },
      },
      ({ large }: any) => large && {
        padding: '12px 24px',
        fontSize: 16,
      },
      ({ small }: any) => small && {
        padding: '4px 12px',
        fontSize: 12,
      },
    ],
    StartIcon: [
      {
        margin: '0 12px 0 0 !important',
      },
      ({ large }: any) => large && {
        margin: '0 16px 0 0 !important',
      },
      ({ small }: any) => small && {
        margin: '0 12px 0 0 !important',
      },
    ],
    EndIcon: [
      {
        margin: '0 0 0 12px !important',
      },
      ({ large }: any) => large && {
        margin: '0 0 0 16px !important',
      },
      ({ small }: any) => small && {
        margin: '0 0 0 12px !important',
      },
    ],
  },
  Checkbox: {
    Root: [
      ({ checked }: any) => ({
        padding: 8,
        color: checked ? 'text' : 'action-link-inactive',
        '> span': {
          backgroundColor: checked ? 'action-primary' : 'transparent',
          border: `1px solid ${checked ? 'text' : 'border-input'}`,
        },
        ':hover': {
          color: 'text',
          '> span': {
            backgroundColor: checked ? 'action-primary-hover' : 'action-input-hover',
            border: `1px solid ${checked ? 'text' : 'border-input'}`,
          },
        },
      }),
    ],
    Control: [
      {
        width: 24,
        height: 24,
        borderRadius: 'normal',
      },
      ({ small }: any) => small && {
        width: 16,
        height: 16,
      },
    ],
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
  Input: {
    Root: [
      ({ focused }: any) => ({
        color: focused ? 'text' : 'text-light',
        width: 256,
        border: '1px solid border-input',
        borderRadius: 'normal',
        padding: '0px 16px',
      }),
      ({ valid }: any) => valid && {
        borderColor: 'border-outline',
      },
      ({ error }: any) => error && {
        borderColor: 'border-error',
      },
      ({ large }: any) => large && {
        padding: '7px 16px',
      },
      ({ small }: any) => small && {
        padding: '0px 16px',
      },
    ],
    // This duplication is wrong
    // TODO update honorable to remove this
    InputBase: [
      ({ focused }: any) => ({
        color: focused ? 'text' : 'text-light',
      }),
      ({ small }: any) => small && {
        caption: true,
        padding: '7px 0',
      },
    ],
    StartIcon: [
      {
        marginRight: 8,
      },
      ({ small }: any) => small && {
        marginTop: 6.5,
      },
    ],
    EndIcon: [
      {
        marginLeft: 12,
      },
    ],
  },
  Menu: {
    Root: [
      {
        padding: '4px 0',
        backgroundColor: 'fill-one',
        border: '1px solid border',
        borderRadius: 'normal',
        boxShadow: 'moderate',
        elevation: 0, // reset from honorable-theme-default
      },
    ],
  },
  MenuItem: {
    Root: [
      {
        '& > div': {
          borderTop: '1px solid border',
        },
        '&:first-of-type > div': {
          borderTop: 'none',
        },
      },
    ],
    Children: [
      {
        padding: '8px 16px',
      },
      ({ active }: any) => active && {
        backgroundColor: 'fill-one-hover',
        borderColor: 'fill-one-hover',
      },
    ],
  },
  Modal: {
    Root: [
      {
        backgroundColor: 'fill-one',
        border: '1px solid border',
        boxShadow: 'modal',
      },
    ],
    Backdrop: [
      {
        backgroundColor: 'transparency(#171A21, 40)',
      },
    ],
  },
  Radio: {
    Root: [
      ({ checked }: any) => ({
        padding: 8,
        color: checked ? 'text' : 'action-link-inactive',
        '> span': {
          border: `1px solid ${checked ? 'text' : 'border-input'}`,
        },
        '& *': {
          fill: 'action-primary',
        },
        ':hover': {
          color: 'text',
          '> span': {
            backgroundColor: 'action-input-hover',
            border: `1px solid ${checked ? 'text' : 'border-input'}`,
          },
          '& *': {
            fill: 'action-primary-hover',
          },
        },
      }),
    ],
    Control: [
      {
        width: 24,
        height: 24,
        borderRadius: '50%',
      },
      ({ small }: any) => small && {
        width: 16,
        height: 16,
      },
    ],
  },
  Select: {
    Root: [
      {
        border: '1px solid border-input',
      },
    ],
  },
  Switch: {
    Root: [
      ({ checked }: any) => ({
        padding: 8,
        color: checked ? 'text' : 'action-link-inactive',
        '> div:first-of-type': {
          backgroundColor: checked ? 'action-primary' : 'transparent',
          border: `1px solid ${checked ? 'text' : 'border-input'}`,
          '> span': {
            backgroundColor: checked ? 'action-link-active' : 'action-link-inactive',
          },
        },
        ':hover': {
          color: 'text',
          '> div:first-of-type': {
            backgroundColor: checked ? 'action-primary-hover' : 'action-input-hover',
            border: `1px solid ${checked ? 'text' : 'border-input'}`,
            '> span': {
              backgroundColor: checked ? 'action-link-active' : 'action-link-active',
            },
          },
        },
      }),
    ],
    Control: [
      {
        width: 42,
        height: 24,
        borderRadius: 12,
        '&:hover': {
          boxShadow: 'none',
        },
      },
    ],
    Handle: [
      ({ checked }: any) => ({
        width: 16,
        height: 16,
        borderRadius: '50%',
        top: 3,
        left: checked ? 'calc(100% - 16px - 3px)' : 3,
      }),
    ],
  },
  Tooltip: {
    Root: [
      {
        caption: true,
        backgroundColor: 'fill-two',
        paddingVertical: 'xxsmall',
        paddingHorizontal: 'xsmall',
        borderRadius: 'medium',
        boxShadow: 'moderate',
        color: 'text-light',
      },
    ],
    Arrow: [
      {
        backgroundColor: 'fill-two',
        borderRadius: '1px',
        top: '50%',
        left: 0,
        transformOrigin: '50% 50%',
        transform: 'translate(calc(-50% + 1px), -50%) scaleY(0.77) rotate(45deg)',
      },
    ],
  },
})
