import {
  ComponentPropsWithRef,
  ElementType,
  memo,
  MouseEventHandler,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'

import { CSSProperties, styled, useTheme } from 'styled-components'
import { resolveSpacersAndSanitizeCss, SpacerProps } from '../theme/spacing'
import { applyNodeToRefs } from '../utils/applyNodeToRefs'
import Flex, { FlexProps } from './Flex'
import { Spinner } from './Spinner'

type ButtonSize = 'small' | 'medium' | 'large'
type ButtonType =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'tertiaryNoPadding'
  | 'floating'
  | 'destructive'

export type ButtonProps = {
  startIcon?: ReactNode
  endIcon?: ReactNode
  loading?: Nullable<boolean>
  loadingIndicator?: ReactNode
  children?: ReactNode
  innerFlexProps?: FlexProps
  // flags- keeping this pattern instead of using "size" and "type" for backwards compatibility
  small?: boolean
  large?: boolean
  primary?: boolean
  secondary?: boolean
  tertiary?: boolean
  floating?: boolean
  destructive?: boolean
  // type overrides that are more permissive but functionally the same
  onClick?: Nullable<MouseEventHandler<HTMLButtonElement>>
  disabled?: Nullable<boolean>
  // flexible typing for links
  as?: ElementType
  to?: string
  href?: string
  target?: string
  rel?: string
} & SpacerProps &
  Omit<ComponentPropsWithRef<'button'>, 'onClick' | 'disabled'> &
  // a few commonly used css props for QOL
  Pick<
    CSSProperties,
    | 'width'
    | 'minWidth'
    | 'height'
    | 'minHeight'
    | 'flex'
    | 'alignSelf'
    | 'justifyContent'
  >

const Button = memo(
  ({
    ref,
    startIcon,
    endIcon,
    loading,
    loadingIndicator,
    disabled,
    children,
    small,
    large,
    secondary,
    tertiary,
    destructive,
    floating,
    // common css props
    height,
    minHeight,
    width,
    minWidth,
    flex,
    alignSelf,
    justifyContent = 'center',
    innerFlexProps,
    ...props
  }: ButtonProps) => {
    const theme = useTheme()
    const buttonRef = useRef<HTMLButtonElement>(null)
    const [measuredHeight, setMeasuredHeight] = useState<number | 'auto'>(
      'auto'
    )

    const buttonSize = large ? 'large' : small ? 'small' : 'medium'
    const buttonType = secondary
      ? 'secondary'
      : tertiary
        ? 'tertiary'
        : destructive
          ? 'destructive'
          : floating
            ? 'floating'
            : 'primary'

    useEffect(() => {
      if (!buttonRef.current) return

      setMeasuredHeight(buttonRef.current.offsetHeight)
    }, [])

    const { rest, css } = resolveSpacersAndSanitizeCss(props, theme)

    return (
      <ButtonBaseSC
        ref={(node: HTMLButtonElement) =>
          applyNodeToRefs([buttonRef, ref], node)
        }
        $size={buttonSize}
        $type={buttonType}
        $noPadding={props.padding === 'none'}
        disabled={disabled}
        css={{
          width,
          minWidth,
          height,
          minHeight,
          flex,
          alignSelf,
          justifyContent,
          ...css,
        }}
        {...(loading && { inert: true })}
        {...rest}
      >
        {!!startIcon && (
          <IconSC
            $position="start"
            $size={buttonSize}
            $loading={loading}
          >
            {startIcon}
          </IconSC>
        )}
        {loading && (
          <LoadingIndicatorWrapperSC>
            {loadingIndicator || (
              <Spinner
                color={theme.colors.text}
                size={
                  typeof measuredHeight === 'number'
                    ? (measuredHeight * 3) / 5
                    : 16
                }
              />
            )}
          </LoadingIndicatorWrapperSC>
        )}
        <Flex
          alignItems="center"
          visibility={loading ? 'hidden' : 'inherit'}
          width={justifyContent === 'flex-start' ? '100%' : undefined}
          {...innerFlexProps}
        >
          {children}
        </Flex>
        {!!endIcon && (
          <IconSC
            $position="end"
            $size={buttonSize}
            $loading={loading}
          >
            {endIcon}
          </IconSC>
        )}
      </ButtonBaseSC>
    )
  }
)

const ButtonBaseSC = styled.button<{
  $size: ButtonSize
  $type: ButtonType
  $noPadding: boolean
}>(
  ({
    theme: { colors, spacing, partials, borderRadiuses, boxShadows },
    $size,
    $type,
    $noPadding,
  }) => ({
    // default styles that were baked into honorable (and not already being overridden)
    cursor: 'pointer',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    alignContent: 'center',
    minHeight: 38,
    userSelect: 'none',
    textDecoration: 'none',
    transition:
      'color 150ms ease, background-color 150ms ease, border 150ms ease',
    flexShrink: 0,
    // primary/baseline styles
    ...partials.text.buttonMedium,
    borderRadius: borderRadiuses.medium,
    color: colors['text-always-white'],
    background: colors['action-primary'],
    border: '1px solid transparent',
    padding: `${spacing.xsmall - 1}px ${spacing.medium - 1}px`,
    '&:focus': { outline: 'none' },
    '&:focus-visible': {
      outline: 'none',
      borderColor: colors['border-outline-focused'],
    },
    '&:hover': { background: colors['action-primary-hover'] },
    '&:active': { background: colors['action-primary'] },
    '&:disabled': {
      cursor: 'not-allowed',
      color: colors['text-primary-disabled'],
      '&:hover': { background: colors['action-primary-disabled'] },
      background: colors['action-primary-disabled'],
    },
    // secondary styles
    ...($type === 'secondary' && {
      color: colors['text-light'],
      background: 'transparent',
      borderColor: colors['border-input'],
      '&:hover': {
        color: colors['text'],
        background: colors['action-input-hover'],
        borderColor: colors['border-input'],
      },
      '&:active': { color: colors['text'], background: 'transparent' },
      '&:focus-visible': {
        color: colors['text'],
        background: colors['action-input-hover'],
      },
      '&:disabled': {
        cursor: 'not-allowed',
        color: colors['text-disabled'],
        background: 'transparent',
      },
    }),
    // tertiary styles
    ...($type === 'tertiary' && {
      color: colors['text-light'],
      background: 'transparent',
      borderColor: 'transparent',
      '&:hover': {
        color: colors['text'],
        background: colors['action-input-hover'],
      },
      '&:active': { background: 'transparent', color: colors['text'] },
      '&:focus-visible': {
        color: colors['text'],
        background: colors['action-input-hover'],
      },
      '&:disabled': {
        cursor: 'not-allowed',
        color: colors['text-disabled'],
        background: 'transparent',
      },
      // tertiary no padding styles
      ...($noPadding && {
        paddingLeft: 0,
        paddingRight: 0,
        '&:active': { color: colors['text-light'] },
        '&:hover, &:active, &:focus-visible': {
          background: 'transparent',
          textDecoration: 'underline',
        },
      }),
    }),
    // destructive styles
    ...($type === 'destructive' && {
      color: colors['text-danger'],
      background: 'transparent',
      borderColor: colors['border-danger'],
      '&:hover': { background: colors['action-input-hover'] },
      '&:focus-visible': { background: colors['action-input-hover'] },
      '&:active': { background: 'transparent' },
      '&:disabled': {
        cursor: 'not-allowed',
        color: colors['text-disabled'],
        borderColor: colors['border-disabled'],
        '&:hover': { background: 'transparent' },
      },
    }),
    // floating styles
    ...($type === 'floating' && {
      color: colors['text-light'],
      background: colors['fill-two'],
      borderColor: colors['border-input'],
      boxShadow: boxShadows.slight,
      '&:hover': {
        color: colors['text'],
        background: colors['fill-two'],
        borderColor: colors['border-input'],
        boxShadow: boxShadows.moderate,
      },
      '&:active': {
        color: colors['text'],
        background: colors['fill-two-hover'],
        borderColor: colors['border-input'],
      },
      '&:focus-visible': {
        color: colors['text'],
        background: colors['fill-two-selected'],
      },
      '&:disabled': {
        cursor: 'not-allowed',
        color: colors['text-disabled'],
        borderColor: colors['border-input'],
        background: 'transparent',
        '&:hover': {
          borderColor: colors['border-input'],
          background: 'transparent',
        },
      },
    }),
    // sizes besides medium (default)
    ...($size === 'large' && {
      ...partials.text.buttonLarge,
      padding: `${spacing.small - 1}px ${spacing.large - 1}px`,
    }),
    ...($size === 'small' && {
      ...partials.text.buttonSmall,
      padding: `${spacing.xxsmall - 1}px ${spacing.medium - 1}px`,
      minHeight: 32,
    }),
  })
)

const IconSC = styled.span<{
  $loading: Nullable<boolean>
  $size: ButtonSize
  $position: 'start' | 'end'
}>(({ theme, $loading, $size, $position }) => {
  const marginSize =
    $size === 'large' ? theme.spacing.medium : theme.spacing.small
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    visibility: $loading ? 'hidden' : 'inherit',
    // adapted from honorable theme styles
    margin:
      $position === 'start' ? `0 ${marginSize}px 0 0` : `0 0 0 ${marginSize}px`,
  }
})

const LoadingIndicatorWrapperSC = styled.span({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
})

export default Button
