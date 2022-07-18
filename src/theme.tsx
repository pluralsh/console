import { mergeTheme } from 'honorable'
import defaultTheme from 'honorable-theme-default'

const fontFamilies = {
  semi: '"Monument Semi-Mono", "Monument", "Inter", "Helvetica", "Arial", "sans-serif"',
  sans: '"Inter", "Helvetica", "Arial", "sans-serif"',
}

const grey = {
  950: '#0E1015',
  900: '#171A21',
  875: '#1B1F27',
  850: '#21242C',
  825: '#252932',
  800: '#2A2E37',
  775: '#303540',
  750: '#383D47',
  725: '#3D424D',
  700: '#454954',
  675: '#494E5A',
  600: '#5D626F',
  500: '#747B8B',
  400: '#9095A2',
  300: '#A9AFBC',
  200: '#D6D9E0',
  100: '#DFE2E7',
  50: '#EBEFF0',
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
  'minus-xxxxlarge': -96,
  'minus-xxxlarge': -64,
  'minus-xxlarge': -48,
  'minus-xlarge': -32,
  'minus-large': -24,
  'minus-medium': -16,
  'minus-small': -12,
  'minus-xsmall': -8,
  'minus-xxsmall': -4,
  'minus-xxxsmall': -2,
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
  breakpoints: {
    // We'll add mobile breakpoints later
    desktop: 1280,
    desktopLarge: 1440,
  },
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
    'fill-zero-selected': 'grey.825',
    'fill-one': 'grey.850',
    'fill-one-hover': 'grey.825',
    'fill-one-selected': 'grey.775',
    'fill-two': 'grey.800',
    'fill-two-hover': 'grey.775',
    'fill-two-selected': 'grey.725',
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
    'border-outline-focused': 'blue.300',
    'border-primary': 'blue.400',
    'border-success': 'green.500',
    'border-warning': 'yellow.400',
    'border-error': 'red.400',
    // Content,
    text: 'grey.50',
    'text-light': 'grey.200',
    'text-xlight': 'grey.400',
    'text-disabled': 'grey.700',
    'text-primary-accent': 'blue.200',
    'text-success': 'green.500',
    'text-success-light': 'green.200',
    'text-warning': 'yellow.400',
    'text-warning-light': 'yellow.200',
    'text-error': 'red.400',
    'text-error-light': 'red.200',
    // Icon,
    'icon-success': 'green.500',
    'icon-warning': 'yellow.400',
    'icon-error': 'red.400',
  },
  stylesheet: {
    html: [
      {
        fontSize: 14,
        fontFamily: fontFamilies.sans,
        backgroundColor: 'fill-zero',
      },
    ],
    '::placeholder': [
      {
        color: 'text-xlight',
      },
    ],
    '* ::-webkit-scrollbar-track': [
      {
        borderRadius: '10px',
        backgroundColor: 'fill-one',
      },
    ],
    '* ::-webkit-scrollbar': [
      {
        width: '6px',
        backgroundColor: 'fill-one',
      },
    ],
    '* ::-webkit-scrollbar-thumb': [
      {
        borderRadius: '6px',
        backgroundColor: 'fill-two',
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
      fontSize: 18,
      lineHeight: '24px',
      fontWeight: 500,
      letterSpacing: 0,
    },
    ({ body1, body2, bold }: any) => ({
      ...((body1 || body2) && {
        fontFamily: fontFamilies.sans,
        fontWeight: 400,
        letterSpacing: '0.5px',
        '& b, & strong': {
          fontWeight: 600,
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
    ({ buttonMedium }: any) => buttonMedium && {
      fontFamily: fontFamilies.semi,
      fontSize: 14,
      lineHeight: '24px',
      fontWeight: 500,
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
      fontSize: 12,
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
        buttonMedium: true,
        display: 'flex',
        borderRadius: 'normal',
        backgroundColor: 'action-primary',
        border: '1px solid action-primary',
        paddingTop: spacing.xsmall - 1,
        paddingBottom: spacing.xsmall - 1,
        paddingRight: spacing.medium - 1,
        paddingLeft: spacing.medium - 1,
        _focusVisible: {
          outline: 'none',
          boxShadow: '0px 0px 0px 1.5px border-outline-focused',
        },
        ':hover': {
          backgroundColor: 'action-primary-hover',
          border: '1px solid action-primary-hover',
        },
        ':active': {
          backgroundColor: 'action-primary',
          border: '1px solid action-primary',
        },
        ':disabled': {
          color: 'text-disabled',
          backgroundColor: 'action-primary-disabled',
          border: '1px solid action-primary-disabled',
          ':hover': {
            backgroundColor: 'action-primary-disabled',
            border: '1px solid action-primary-disabled',
          },
        },
      },
      ({ secondary }: any) => secondary && {
        backgroundColor: 'transparent',
        border: '1px solid border-input',
        ':hover': {
          backgroundColor: 'action-input-hover',
          border: '1px solid border-input',
        },
        ':active': {
          backgroundColor: 'transparent',
          border: '1px solid border-input',
        },
        ':disabled': {
          backgroundColor: 'transparent',
          border: '1px solid border-input',
          ':hover': {
            backgroundColor: 'transparent',
            border: '1px solid border-input',
          },
        },
      },
      ({ tertiary }: any) => tertiary && {
        backgroundColor: 'transparent',
        border: '1px solid transparent',
        ':hover': {
          backgroundColor: 'action-input-hover',
          border: '1px solid transparent',
        },
        ':active': {
          backgroundColor: 'transparent',
          border: '1px solid transparent',
        },
        ':disabled': {
          backgroundColor: 'transparent',
          border: '1px solid transparent',
          ':hover': {
            backgroundColor: 'transparent',
            border: '1px solid transparent',
          },
        },
      },
      ({ destructive }: any) => destructive && {
        color: 'text-error',
        backgroundColor: 'transparent',
        border: '1px solid border-error',
        ':hover': {
          backgroundColor: 'action-input-hover',
          border: '1px solid border-error',
        },
        ':active': {
          backgroundColor: 'transparent',
          border: '1px solid border-error',
        },
        ':disabled': {
          backgroundColor: 'transparent',
          border: '1px solid border-disabled',
          ':hover': {
            backgroundColor: 'transparent',
            border: '1px solid border-disabled',
          },
        },
      },
      ({ large }: any) => large && {
        buttonLarge: true,
        paddingTop: spacing.small - 1,
        paddingBottom: spacing.small - 1,
        paddingRight: spacing.large - 1,
        paddingLeft: spacing.large - 1,
      },
      ({ small }: any) => small && {
        buttonSmall: true,
        paddingTop: spacing.xxsmall - 1,
        paddingBottom: spacing.xxsmall - 1,
        paddingRight: spacing.small - 1,
        paddingLeft: spacing.small - 1,
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
  ButtonGroup: {
    Root: [
      {
        border: '1px solid border',
        borderRadius: 4,
        '& > button': {
          border: '1px solid transparent',
        },
        overflow: 'hidden',
      },
      ({ direction }: any) => direction === 'row' && {
        '& > button': {
          borderLeft: '1px solid border',
          '&:first-of-type': {
            borderLeft: '1px solid transparent',
          },
        },
      },
      ({ direction }: any) => direction === 'column' && {
        '& > button': {
          borderTop: '1px solid border',
          '&:first-of-type': {
            borderTop: '1px solid transparent',
          },
        },
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
      {
        body2: true,
        display: 'flex',
        justifyContent: 'space-between',
        align: 'center',
        height: 'auto',
        width: 'auto',
        paddingTop: 0,
        paddingBottom: 0,
        paddingRight: 'medium',
        paddingLeft: 'medium',
        border: '1px solid border-input',
        borderRadius: 'normal',
        _focusWithin: {
          borderColor: 'border-outline-focused',
        },
      },
      ({ valid }: any) => valid && {
        borderColor: 'border-outline',
      },
      ({ error }: any) => error && {
        borderColor: 'border-error',
      },
      ({ small }: any) => small && {
        caption: true,
      },
      ({ disabled }: any) => disabled && {
        backgroundColor: 'transparent',
        color: 'text-disabled',
        borderColor: 'border-disabled',
      },
    ],
    InputBase: [
      {
        width: '100%',
        flex: '1 1',
        height: '38px',
        lineHeight: '38px',
        color: 'text',
        _placeholder: {
          color: 'text-xlight',
        },
      },
      ({ small }: any) => small && {
        height: '30px',
        lineHeight: '30px',
      },
      ({ large }: any) => large && {
        height: '46px',
        lineHeight: '46px',
      },
      ({ disabled }: any) => disabled && {
        backgroundColor: 'transparent',
        color: 'text-disabled',
        _placeholder: {
          color: 'text-disabled',
        },
      },
    ],
    StartIcon: [
      {
        marginRight: 'xsmall',
      },
      ({ disabled }: any) => disabled && {
        '& *': {
          color: 'text-disabled',
        },
      },
    ],
    EndIcon: [
      {
        marginLeft: 'small',
      },
      ({ disabled }: any) => disabled && {
        '& *': {
          color: 'text-disabled',
        },
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
  Ul: {
    Root: [
      {
        marginBlockStart: 0,
        marginBlockEnd: 0,
        paddingInlineStart: 24,
      },
    ],
  },
})
