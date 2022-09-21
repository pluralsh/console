import { mergeTheme } from 'honorable'
import defaultTheme from 'honorable-theme-default'
import { CSSObject } from 'styled-components'
import chroma from 'chroma-js'

export const fontFamilies = {
  mono: '"Monument Mono", monospace',
  semi: '"Monument Semi-Mono", "Monument", "Inter", "Helvetica", "Arial", "sans-serif"',
  sans: '"Inter", "Helvetica", "Arial", "sans-serif"',
}

export const grey = {
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

export const purple = {
  950: '#020318',
  900: '#030530',
  850: '#050848',
  800: '#070A5F',
  700: '#0A0F8F',
  600: '#0D14BF',
  500: '#111AEE',
  400: '#4A51F2',
  350: '#5D63F4',
  300: '#747AF6',
  200: '#9FA3F9',
  100: '#CFD1FC',
  50: '#F1F1FE',
}

export const blue = {
  950: '#001019',
  900: '#002033',
  850: '#00304D',
  800: '#004166',
  700: '#006199',
  600: '#0081CC',
  500: '#06A0F9',
  400: '#33B4FF',
  350: '#4DBEFF',
  300: '#66C7FF',
  200: '#99DAFF',
  100: '#C2E9FF',
  50: '#F0F9FF',
}

export const green = {
  950: '#032117',
  900: '#053827',
  850: '#074F37',
  800: '#0A6B4A',
  700: '#0F996A',
  600: '#13C386',
  500: '#17E86E',
  400: '#3CECAF',
  300: '#6AF1C2',
  200: '#99F5D5',
  100: '#C7FAE8',
  50: '#F1FEF9',
}

export const yellow = {
  950: '#242000',
  900: '#3D2F00',
  850: '#573B00',
  800: '#755200',
  700: '#A87E00',
  600: '#D6AF00',
  500: '#FFC800',
  400: '#FFD129',
  300: '#FFF170',
  200: '#FFF59E',
  100: '#FFF9C2',
  50: '#FFFEF0',
}

export const red = {
  950: '#130205',
  900: '#200308',
  850: '#38060E',
  800: '#660A19',
  700: '#8B0E23',
  600: '#BA1239',
  500: '#E81748',
  400: '#ED456A',
  300: '#F2788D',
  200: '#F599A8',
  100: '#FAC7D0',
  50: '#FFF0F2',
}

export const semanticColors = {
  // Fill
  'fill-zero': grey[900],
  'fill-zero-hover': grey[850],
  'fill-zero-selected': grey[825],
  'fill-one': grey[850],
  'fill-one-hover': grey[825],
  'fill-one-selected': grey[775],
  'fill-two': grey[800],
  'fill-two-hover': grey[775],
  'fill-two-selected': grey[725],
  'fill-three': grey[750],
  'fill-three-hover': grey[725],
  'fill-three-selected': grey[675],
  // Action
  'action-primary': purple[400],
  'action-primary-hover': purple[350],
  'action-primary-disabled': grey[825],
  'action-link-inactive': grey[200],
  'action-link-active': grey[50],
  'action-link-inline': blue[200],
  'action-link-inline-hover': blue[350],
  'action-link-inline-visited': purple[300],
  'action-input-hover': `${chroma('#E9ECF0').alpha(0.04)}`,
  // Border
  border: grey[800],
  'border-input': grey[700],
  'border-fill-two': grey[750],
  'border-fill-three': grey[700],
  'border-disabled': grey[700],
  'border-outline-focused': blue[300],
  'border-primary': purple[300],
  'border-success': green[500],
  'border-warning': yellow[400],
  'border-error': red[400],
  // Content
  text: grey[50],
  'text-light': grey[200],
  'text-xlight': grey[400],
  'text-disabled': grey[700],
  'text-primary-accent': blue[200],
  'text-primary-disabled': grey[500],
  'text-success': green[500],
  'text-success-light': green[200],
  'text-warning': yellow[400],
  'text-warning-light': yellow[100],
  'text-error': red[400],
  'text-error-light': red[200],
  // Icon
  'icon-success': green[500],
  'icon-warning': yellow[400],
  'icon-error': red[400],
}

export const borderWidths = {
  default: 1,
  focus: 1.5,
}

export const borderStyles = {
  default: 'solid',
}

export const zIndexes = {
  base: 0,
  selectPopover: 500,
  modal: 1000,
  tooltip: 2000,
}

export const scrollBar = ({ hue = 'default' } = {}) => {
  const trackColor
    = hue === 'lighter'
      ? semanticColors['fill-three']
      : semanticColors['fill-two']
  const barColor
    = hue === 'lighter'
      ? semanticColors['text-xlight']
      : semanticColors['fill-three']
  const barWidth = 6
  const barRadius = barWidth / 2

  const style: CSSObject = {
    scrollbarWidth: 'thin',
    scrollbarColor: `${barColor} ${trackColor}`,
    '&::-webkit-scrollbar-track': {
      backgroundColor: trackColor,
      borderRadius: `${barRadius}px`,
    },
    '&::-webkit-scrollbar': {
      width: `${barWidth}px`,
      height: `${barWidth}px`,
      borderRadius: `${barRadius}px`,
      backgroundColor: trackColor,
    },
    '&::-webkit-scrollbar-thumb': {
      borderRadius: `${barRadius}px`,
      backgroundColor: barColor,
    },
    '&::-webkit-scrollbar-corner': {
      backgroundColor: 'transparent',
    },
  }

  return style
}

export const borders = {
  default: `${borderWidths.default}px ${borderStyles.default} ${semanticColors.border}`,
  'fill-one': `${borderWidths.default}px ${borderStyles.default} ${semanticColors.border}`,
  'fill-two': `${borderWidths.default}px ${borderStyles.default} ${semanticColors['border-fill-two']}`,
  'fill-three': `${borderWidths.default}px ${borderStyles.default} ${semanticColors['border-input']}`,
  input: `${borderWidths.default}px ${borderStyles.default} ${semanticColors['border-input']}`,
}

export const borderRadiuses = {
  medium: 3,
  large: 6,
  normal: 3, // deprecated in favor of medium
}

export const boxShadows = {
  slight: `0px 2px 4px ${chroma(grey[950]).alpha(0.14)}, 0px 2px 7px ${chroma(grey[950]).alpha(0.18)}`,
  moderate: `0px 3px 6px ${chroma(grey[950]).alpha(0.2)}, 0px 10px 20px ${chroma(grey[950]).alpha(0.3)}`,
  modal: `0px 20px 50px ${chroma(grey[950]).alpha(0.6)}`,
  focused: `0px 0px 0px 1.5px ${semanticColors['border-outline-focused']}`,
}

export const spacing = {
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

const bodyBaseStyle = {
  fontFamily: fontFamilies.sans,
  fontWeight: 400,
  letterSpacing: '0.5px',
  '& b, & strong': {
    fontWeight: 600,
  },
}

function asElementTypes<T>() {
  return function ret<Obj>(obj: { [K in keyof Obj]: T }) {
    return obj
  }
}

export const textPartials = asElementTypes<CSSObject>()({
  h1: {
    fontFamily: fontFamilies.semi,
    fontSize: 72,
    lineHeight: '110%',
    fontWeight: 400,
    letterSpacing: '-1px',
  },
  h2: {
    fontFamily: fontFamilies.semi,
    fontSize: 60,
    lineHeight: '115%',
    fontWeight: 500,
    letterSpacing: '-1px',
  },
  h3: {
    fontFamily: fontFamilies.semi,
    fontSize: 48,
    lineHeight: '120%',
    fontWeight: 400,
    letterSpacing: '-0.5px',
  },
  h4: {
    fontFamily: fontFamilies.semi,
    fontSize: 36,
    lineHeight: '45px',
    fontWeight: 400,
    letterSpacing: '-0.25px',
  },
  title1: {
    fontFamily: fontFamilies.semi,
    fontSize: 30,
    lineHeight: '40px',
    fontWeight: 500,
    letterSpacing: '-0.25px',
  },
  title2: {
    fontFamily: fontFamilies.semi,
    fontSize: 24,
    lineHeight: '32px',
    fontWeight: 500,
    letterSpacing: '-0.25px',
  },
  subtitle1: {
    fontFamily: fontFamilies.semi,
    fontSize: 20,
    lineHeight: '24px',
    fontWeight: 500,
    letterSpacing: 0,
  },
  subtitle2: {
    fontFamily: fontFamilies.semi,
    fontSize: 18,
    lineHeight: '24px',
    fontWeight: 500,
    letterSpacing: 0,
  },
  body1: {
    ...bodyBaseStyle,
    ...{
      fontSize: 16,
      lineHeight: '24px',
    },
  },
  body2: {
    ...bodyBaseStyle,
    ...{
      fontSize: 14,
      lineHeight: '20px',
    },
  },
  bodyBold: {
    fontWeight: 600,
  },
  caption: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: '16px',
    fontWeight: 400,
    letterSpacing: '0.5px',
  },
  badgeLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: '100%',
    fontWeight: 700,
    letterSpacing: '0.5px',
  },
  buttonMedium: {
    fontFamily: fontFamilies.semi,
    fontSize: 14,
    lineHeight: '24px',
    fontWeight: 500,
    letterSpacing: '0.5px',
  },
  buttonLarge: {
    fontFamily: fontFamilies.semi,
    fontSize: 16,
    lineHeight: '24px',
    fontWeight: 500,
    letterSpacing: '0.5px',
  },
  buttonSmall: {
    fontFamily: fontFamilies.semi,
    fontSize: 12,
    lineHeight: '24px',
    fontWeight: 500,
    letterSpacing: '0.5px',
  },
  overline: {
    fontFamily: fontFamilies.semi,
    fontSize: 12,
    lineHeight: '16px',
    fontWeight: 400,
    letterSpacing: '1.25px',
    textTransform: 'uppercase',
  },
  truncate: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  inlineLink: {
    color: semanticColors['action-link-inline'],
    textDecoration: 'underline',
    '&:hover': {
      color: semanticColors['action-link-inline-hover'],
    },
    '&:visited, &:active': {
      color: semanticColors['action-link-inline-visited'],
    },
  },
  body1Bold: {},
  body2Bold: {},
})
textPartials.body1Bold = { ...textPartials.body1, ...textPartials.bodyBold }
textPartials.body2Bold = { ...textPartials.body2, ...textPartials.bodyBold }

const resetPartials = asElementTypes<CSSObject>()({
  button: {
    textAlign: 'inherit',
    background: 'none',
    color: 'inherit',
    border: 'none',
    padding: 0,
    font: 'inherit',
    cursor: 'pointer',
    outline: 'inherit',
  },
})

const focusPartials = asElementTypes<CSSObject>()({
  default: {
    outline: 'none',
    boxShadow: boxShadows.focused,
  },
  insetAbsolute: {
    outline: 'none',
    position: 'absolute',
    content: "''",
    pointerEvents: 'none',
    top: `${borderWidths.focus}px`,
    right: `${borderWidths.focus}px`,
    left: `${borderWidths.focus}px`,
    bottom: `${borderWidths.focus}px`,
    boxShadow: boxShadows.focused,
  },
})

const portals = {
  default: {
    id: 'honorable-portal',
  },
}

const baseTheme = {
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
    purple,
    // Semantic colors,
    ...semanticColors,
  },
}

const honorableTheme = mergeTheme(defaultTheme, {
  ...baseTheme,
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
  },
  global: [
    /* Spacing */
    ...Object.entries(spacers).map(([key, nextKeys]) => (props: any) => props[key] !== null
          && typeof props[key] !== 'undefined'
          && Object.fromEntries(nextKeys.map(nextKey => [
            nextKey,
            spacing[props[key]] || props[key],
          ]))),
    ({ gap }: any) => typeof gap !== 'undefined' && {
      gap: spacing[gap] || gap,
    },
    ({ fill }: any) => fill === true && {
        // === true to prevent the `fill` css property to apply here
      width: '100%',
      height: '100%',
    },
    /* Border radiuses */
    ({ borderRadius }: any) => typeof borderRadius !== 'undefined' && {
      borderRadius: borderRadiuses[borderRadius] || borderRadius,
    },
    /* Shadows */
    ({ boxShadow }: any) => typeof boxShadow !== 'undefined' && {
      boxShadow: boxShadows[boxShadow] || boxShadow,
    },
    ({ h1 }: any) => h1 && textPartials.h1,
    ({ h2 }: any) => h2 && textPartials.h2,
    ({ h3 }: any) => h3 && textPartials.h3,
    ({ h4 }: any) => h4 && textPartials.h4,
    ({ title1 }: any) => title1 && textPartials.title1,
    ({ title2 }: any) => title2 && textPartials.title2,
    ({ subtitle1 }: any) => subtitle1 && textPartials.subtitle1,
    ({ subtitle2 }: any) => subtitle2 && textPartials.subtitle2,
    ({ body1, body2, bold }: any) => ({
      ...(body1 && textPartials.body1),
      ...(body2 && textPartials.body2),
      ...((body1 || body2) && bold && textPartials.bodyBold),
    }),
    ({ caption }: any) => caption && textPartials.caption,
    ({ badgeLabel }: any) => badgeLabel && textPartials.badgeLabel,
    ({ buttonMedium }: any) => buttonMedium && textPartials.buttonMedium,
    ({ buttonLarge }: any) => buttonLarge && textPartials.buttonLarge,
    ({ buttonSmall }: any) => buttonSmall && textPartials.buttonSmall,
    ({ overline }: any) => overline && textPartials.overline,
    ({ truncate }: any) => truncate && textPartials.truncate,
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
      },
      ({ inline }: any) => inline && textPartials.inlineLink,
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
        ':focus': {
          boxShadow: boxShadows.focused,
        },
        ':disabled': {
          color: 'text-primary-disabled',
          backgroundColor: 'action-primary-disabled',
          border: '1px solid action-primary-disabled',
          ':hover': {
            backgroundColor: 'action-primary-disabled',
            border: '1px solid action-primary-disabled',
          },
        },
      },
      ({ secondary }: any) => secondary && {
        color: 'text-light',
        backgroundColor: 'transparent',
        border: '1px solid border-input',
        ':hover': {
          color: 'text',
          backgroundColor: 'action-input-hover',
          border: '1px solid border-input',
        },
        ':active': {
          color: 'text',
          backgroundColor: 'transparent',
          border: '1px solid border-input',
        },
        ':focus': {
          color: 'text',
          backgroundColor: 'action-input-hover',
          border: '1px solid border-input',
          boxShadow: boxShadows.focused,
        },
        ':disabled': {
          color: 'text-disabled',
          backgroundColor: 'transparent',
          border: '1px solid border-input',
          ':hover': {
            backgroundColor: 'transparent',
            border: '1px solid border-input',
          },
        },
      },
      ({ tertiary }: any) => tertiary && {
        color: 'text-light',
        backgroundColor: 'transparent',
        border: '1px solid transparent',
        ':hover': {
          color: 'text',
          backgroundColor: 'action-input-hover',
          border: '1px solid transparent',
        },
        ':active': {
          color: 'text',
          backgroundColor: 'transparent',
          border: '1px solid transparent',
        },
        ':focus': {
          color: 'text',
          backgroundColor: 'action-input-hover',
          border: '1px solid transparent',
        },
        ':disabled': {
          color: 'text-disabled',
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
        ':focus': {
          boxShadow: 'none',
        },
        ':disabled': {
          color: 'text-disabled',
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
        paddingRight: spacing.medium - 1,
        paddingLeft: spacing.medium - 1,
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
      {
        padding: 8,
        color: 'action-link-inactive',
        '> span': {
          backgroundColor: 'transparent',
          border: '1px solid border-input',
        },
        ':hover': {
          color: 'text',
          '> span': {
            backgroundColor: 'action-input-hover',
            border: '1px solid border-input',
          },
        },
      },
      ({ checked }: any) => checked && {
        color: 'text',
        '> span': {
          backgroundColor: 'action-primary',
        },
        ':hover': {
          '> span': {
            backgroundColor: 'action-primary-hover',
          },
        },
      },
      ({ small }: any) => small && {
        '> span': {
          borderWidth: '.75px',
        },
      },
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
        minHeight: 'auto',
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
        paddingTop: '4px',
        paddingBottom: '4px',
        backgroundColor: 'fill-two',
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
          borderTop: '1px solid border-fill-two',
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
        backgroundColor: 'fill-two-hover',
        borderColor: 'fill-two-hover',
      },
    ],
  },
  Modal: {
    Root: [
      {
        backgroundColor: 'fill-one',
        border: '1px solid border',
        boxShadow: 'modal',
        paddingTop: '0',
        paddingRight: '0',
        paddingBottom: '0',
        paddingLeft: '0',
      },
    ],
    Backdrop: [
      {
        backgroundColor: 'transparency(#171A21, 40)',
        zIndex: zIndexes.modal,
      },
    ],
  },
  Radio: {
    Root: [
      {
        padding: 8,
        color: 'action-link-inactive',
        '> span': {
          border: '1px solid border-input',
        },
        '& *': {
          fill: 'action-primary',
        },
        ':hover': {
          color: 'text',
          '> span': {
            backgroundColor: 'action-input-hover',
            border: '1px solid border-input',
          },
          '& *': {
            fill: 'action-primary-hover',
          },
        },
      },
      ({ checked }: any) => checked && {
        color: 'text',
        '> span': {
          border: '1px solid text',
        },
        ':hover': {
          '> span': {
            border: '1px solid text',
          },
        },
      },
      ({ small }: any) => small && {
        '> span': {
          borderWidth: '.75px',
        },
      },
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
        paddingLeft: 0,
        color: checked ? 'text' : 'action-link-inactive',
        '> div:first-of-type': {
          backgroundColor: checked ? 'action-primary' : 'transparent',
          border: '1px solid border-input',
          '> span': {
            backgroundColor: checked
              ? 'action-link-active'
              : 'action-link-inactive',
          },
        },
        ':hover': {
          color: 'text',
          '> div:first-of-type': {
            backgroundColor: checked
              ? 'action-primary-hover'
              : 'action-input-hover',
            border: '1px solid border-input',
            '> span': {
              backgroundColor: checked
                ? 'action-link-active'
                : 'action-link-active',
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
        transform:
          'translate(calc(-50% + 1px), -50%) scaleY(0.77) rotate(45deg)',
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

export default honorableTheme

export const styledTheme = {
  ...baseTheme,
  ...{
    spacing,
    boxShadows,
    borderRadiuses,
    fontFamilies,
    borders,
    borderStyles,
    borderWidths,
    zIndexes,
    portals,
    partials: {
      text: textPartials,
      focus: focusPartials,
      scrollBar,
      reset: resetPartials,
      dropdown: {
        arrowTransition: ({ isOpen = false }) => ({
          transition: 'transform 0.1s ease',
          transform: `scaleY(${isOpen ? -1 : 1})`,
        }),
      },
    },
  },
}
