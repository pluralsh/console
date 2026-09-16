// Flexible Box layout primitive with shorthand style props

import {
  type CSSProperties,
  type ElementType,
  memo,
  type ReactNode,
  type Ref,
} from 'react'
import styled, {
  type DefaultTheme,
  type StyledObject,
  useTheme,
} from 'styled-components'
import Tooltip, { type TooltipProps } from './Tooltip'
import WrapWithIf from './WrapWithIf'
import { resolveSpacersAndSanitizeCss } from '../theme/spacing'

type FlexBaseProps = {
  /**
   * Alias for flexDirection
   */
  direction?: CSSProperties['flexDirection']
  /**
   * wrap flex property
   */
  wrap?: CSSProperties['flexWrap']
  /**
   * Alias for flexBasis
   */
  basis?: CSSProperties['flexBasis']
  /**
   * Alias for flexGrow
   */
  grow?: CSSProperties['flexGrow']
  /**
   * Alias for flexShrink
   */
  shrink?: CSSProperties['flexShrink']
  /**
   * Alias for alignItems
   */
  align?: CSSProperties['alignItems']
  /**
   * Alias for justifyContent
   */
  justify?: CSSProperties['justifyContent']

  gap?: keyof DefaultTheme['spacing']
  padding?: keyof DefaultTheme['spacing']

  tooltip?: Omit<TooltipProps, 'children'>

  /**
   * in case we want raw css like media/container queries, hover states, etc
   */
  css?: StyledObject

  as?: ElementType
  ref?: Ref<HTMLDivElement>
  className?: string
  children?: ReactNode
}

export type FlexProps = FlexBaseProps &
  Omit<CSSProperties, keyof FlexBaseProps> &
  Record<string, any>

const DOM_PROP_RE =
  /^(as|forwardedAs|href|to|target|rel|download|tabIndex|role|id|type|disabled|name|title|value|children|className|ref|hidden|lang|dir|slot|style|draggable|contentEditable|spellCheck|autoFocus|accessKey|nonce)$|^on[A-Z]|^aria-|^data-/

function splitCssAndDomProps(props: Record<string, unknown>) {
  const css: StyledObject = {}
  const rest: Record<string, unknown> = {}

  Object.entries(props).forEach(([key, value]) => {
    if (DOM_PROP_RE.test(key)) rest[key] = value
    else (css as Record<string, unknown>)[key] = value
  })

  return { css, rest }
}

function BaseFlex({
  ref,
  className,
  direction,
  wrap,
  basis,
  grow,
  shrink,
  align,
  justify,
  gap,
  padding,
  tooltip,
  children,
  css,
  as,
  ...otherProps
}: FlexProps) {
  const theme = useTheme()
  const { css: unprocessedStyleProps, rest } = splitCssAndDomProps(
    otherProps as Record<string, unknown>
  )
  const { css: styleProps } = resolveSpacersAndSanitizeCss(
    unprocessedStyleProps,
    theme
  )

  return (
    <WrapWithIf
      condition={!!tooltip}
      wrapper={<Tooltip {...tooltip!} />}
    >
      <FlexSC
        ref={ref}
        as={as}
        className={className}
        $direction={direction}
        $wrap={wrap}
        $basis={basis}
        $grow={grow}
        $shrink={shrink}
        $align={align}
        $justify={justify}
        $gap={gap}
        $padding={padding}
        $css={{ ...styleProps, ...css }}
        {...rest}
      >
        {children}
      </FlexSC>
    </WrapWithIf>
  )
}

const FlexSC = styled.div<{
  $direction?: FlexProps['direction']
  $wrap?: FlexProps['wrap']
  $basis?: FlexProps['basis']
  $grow?: FlexProps['grow']
  $shrink?: FlexProps['shrink']
  $align?: FlexProps['align']
  $justify?: FlexProps['justify']
  $gap?: FlexProps['gap']
  $padding?: FlexProps['padding']
  $css?: StyledObject
}>(
  ({
    theme,
    $direction,
    $wrap,
    $basis,
    $grow,
    $shrink,
    $align,
    $justify,
    $gap,
    $padding,
    $css,
  }) => ({
    display: 'flex',
    flexDirection: $direction,
    flexWrap: $wrap,
    flexBasis: $basis,
    flexGrow: $grow,
    flexShrink: $shrink,
    alignItems: $align,
    justifyContent: $justify,
    ...($gap != null ? { gap: theme.spacing[$gap] ?? $gap } : {}),
    ...($padding != null
      ? { padding: theme.spacing[$padding] ?? $padding }
      : {}),
    ...$css,
  })
)

const Flex = memo(BaseFlex)

export default Flex
