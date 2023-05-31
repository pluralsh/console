import { mergeTheme } from 'honorable'
import defaultTheme from 'honorable-theme-default'
import mapperRecipe from 'honorable-recipe-mapper'

import {
  blue,
  green,
  grey,
  purple,
  red,
  semanticColors,
  yellow,
} from './theme/colors'
import { spacing } from './theme/spacing'
import { fontFamilies } from './theme/fonts'
import { textPartials } from './theme/text'
import {
  borderRadiuses,
  borderStyles,
  borderWidths,
  borders,
} from './theme/borders'
import { boxShadows } from './theme/boxShadows'
import { scrollBar } from './theme/scrollBar'
import { zIndexes } from './theme/zIndexes'
import { focusPartials } from './theme/focus'
import { resetPartials } from './theme/resets'
import { marketingTextPartials } from './theme/marketingText'
import gradients from './theme/gradients'

export type StringObj = { [key: string]: string | StringObj }

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
    desktopSmall: 1000,
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
    mapperRecipe('gap', spacing),
    ...Object.entries(spacers).map(
      ([key, nextKeys]) =>
        (props: any) =>
          props[key] !== null &&
          typeof props[key] !== 'undefined' &&
          Object.fromEntries(
            nextKeys.map((nextKey) => [
              nextKey,
              spacing[props[key]] || props[key],
            ])
          )
    ),
    ({ fill }: any) =>
      fill === true && {
        // === true to prevent the `fill` css property to apply here
        width: '100%',
        height: '100%',
      },
    /* Border radiuses */
    mapperRecipe('borderRadius', borderRadiuses),
    /* Shadows */
    mapperRecipe('boxShadow', boxShadows),
    /* Texts */
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
    ({ body2LooseLineHeight, bold }: any) => ({
      ...(body2LooseLineHeight && textPartials.body2LooseLineHeight),
      ...(body2LooseLineHeight && bold && textPartials.bodyBold),
    }),
    ({ caption }: any) => caption && textPartials.caption,
    ({ badgeLabel }: any) => badgeLabel && textPartials.badgeLabel,
    ({ buttonMedium }: any) => buttonMedium && textPartials.buttonMedium,
    ({ buttonLarge }: any) => buttonLarge && textPartials.buttonLarge,
    ({ buttonSmall }: any) => buttonSmall && textPartials.buttonSmall,
    ({ overline }: any) => overline && textPartials.overline,
    ({ truncate }: any) => truncate && textPartials.truncate,
    /* Deprecated */
    ({ body0 }: any) =>
      body0 && {
        fontSize: 18,
        lineHeight: '28px',
      },
    /* Deprecated */
    ({ font }: any) =>
      font === 'action' && {
        fontFamily: 'Monument',
        letterSpacing: 1,
        fontWeight: 500,
      },
    /* deprecated in favor of _hover */
    ({ hoverIndicator }: any) =>
      hoverIndicator && {
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
      ({ ghost }: any) =>
        ghost && {
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
        _focus: {
          outline: 'none',
        },
        _focusVisible: {
          ...focusPartials.button,
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
          color: 'text-primary-disabled',
          backgroundColor: 'action-primary-disabled',
          border: '1px solid action-primary-disabled',
          ':hover': {
            backgroundColor: 'action-primary-disabled',
            border: '1px solid action-primary-disabled',
          },
        },
      },
      ({ secondary }: any) =>
        secondary && {
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
          ':focus-visible': {
            color: 'text',
            backgroundColor: 'action-input-hover',
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
      ({ tertiary }: any) =>
        tertiary && {
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
          ':focus-visible': {
            color: 'text',
            backgroundColor: 'action-input-hover',
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
      ({ tertiary, padding }: any) =>
        tertiary &&
        padding === 'none' && {
          color: 'text-light',
          backgroundColor: 'transparent',
          border: '1px solid transparent',
          paddingHorizontal: '0',
          ':hover': {
            backgroundColor: 'transparent',
            textDecoration: 'underline',
          },
          ':active': {
            textDecoration: 'underline',
          },
          ':focus-visible': {
            backgroundColor: 'transparent',
            textDecoration: 'underline',
          },
        },
      ({ destructive }: any) =>
        destructive && {
          color: 'text-danger',
          backgroundColor: 'transparent',
          border: '1px solid border-danger',
          ':hover': {
            backgroundColor: 'action-input-hover',
            border: '1px solid border-danger',
          },
          ':active': {
            backgroundColor: 'transparent',
            border: '1px solid border-danger',
          },
          ':focus-visible': {
            backgroundColor: 'action-input-hover',
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
      ({ floating }: any) =>
        floating && {
          color: 'text-light',
          backgroundColor: 'fill-two',
          border: '1px solid border-input',
          // boxShadow isn't getting set when placed in the root here,
          // but using the '&' prop gets around it
          '&': {
            boxShadow: boxShadows.slight,
          },
          ':hover': {
            color: 'text',
            backgroundColor: 'fill-two-hover',
            border: '1px solid border-input',
            boxShadow: boxShadows.moderate,
          },
          ':active': {
            color: 'text',
            backgroundColor: 'fill-two-hover',
            border: '1px solid border-input',
          },
          ':focus-visible': {
            color: 'text',
            backgroundColor: 'fill-two-selected',
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
      ({ large }: any) =>
        large && {
          buttonLarge: true,
          paddingTop: spacing.small - 1,
          paddingBottom: spacing.small - 1,
          paddingRight: spacing.large - 1,
          paddingLeft: spacing.large - 1,
        },
      ({ small }: any) =>
        small && {
          buttonSmall: true,
          paddingTop: spacing.xxsmall - 1,
          paddingBottom: spacing.xxsmall - 1,
          paddingRight: spacing.medium - 1,
          paddingLeft: spacing.medium - 1,
          minHeight: 32,
        },
    ],
    StartIcon: [
      {
        margin: '0 12px 0 0 !important',
      },
      ({ large }: any) =>
        large && {
          margin: '0 16px 0 0 !important',
        },
      ({ small }: any) =>
        small && {
          margin: '0 12px 0 0 !important',
        },
    ],
    EndIcon: [
      {
        margin: '0 0 0 12px !important',
      },
      ({ large }: any) =>
        large && {
          margin: '0 0 0 16px !important',
        },
      ({ small }: any) =>
        small && {
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
      ({ direction }: any) =>
        direction === 'row' && {
          '& > button': {
            borderLeft: '1px solid border',
            '&:first-of-type': {
              borderLeft: '1px solid transparent',
            },
          },
        },
      ({ direction }: any) =>
        direction === 'column' && {
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
      ({ small }: any) =>
        small && {
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
      ({ small }: any) =>
        small && {
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
        overflow: 'hidden',
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
      ({ valid }: any) =>
        valid && {
          borderColor: 'border-outline',
        },
      ({ error }: any) =>
        error && {
          borderColor: 'border-danger',
        },
      ({ small }: any) =>
        small && {
          caption: true,
        },
      ({ disabled }: any) =>
        disabled && {
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
      ({ small }: any) =>
        small && {
          height: '30px',
          lineHeight: '30px',
        },
      ({ large }: any) =>
        large && {
          height: '46px',
          lineHeight: '46px',
        },
      ({ disabled }: any) =>
        disabled && {
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
      ({ disabled }: any) =>
        disabled && {
          '& *': {
            color: 'text-disabled',
          },
        },
    ],
    EndIcon: [
      {
        marginLeft: 'small',
      },
      ({ disabled }: any) =>
        disabled && {
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
      ({ active }: any) =>
        active && {
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
        paddingTop: 'large',
        paddingRight: 'large',
        paddingBottom: 'large',
        paddingLeft: 'large',
      },
    ],
    Backdrop: [
      {
        backgroundColor: 'modal-backdrop',
        zIndex: zIndexes.modal,
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
  Spinner: {
    Root: [
      {
        '&:before': {
          borderTop: '2px solid white',
        },
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
    gradients,
    partials: {
      text: textPartials,
      marketingText: marketingTextPartials,
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
