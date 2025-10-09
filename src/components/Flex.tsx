// almost drop-in replacement for anywhere 'honorable' Flex is used

import { type CSSProperties, type ReactNode, Ref, memo } from 'react'
import styled, { type DefaultTheme } from 'styled-components'

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
  ref?: Ref<HTMLDivElement>
  className?: string
  children?: ReactNode
}

export type FlexProps = Omit<CSSProperties, keyof FlexBaseProps> & FlexBaseProps

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
  children,
  ...otherProps
}: FlexProps) {
  return (
    <FlexSC
      ref={ref}
      className={className}
      {...{
        $direction: direction,
        $wrap: wrap,
        $basis: basis,
        $grow: grow,
        $shrink: shrink,
        $align: align,
        $justify: justify,
        $gap: gap,
        $padding: padding,
      }}
      css={{ ...otherProps }}
    >
      {children}
    </FlexSC>
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
  }) => ({
    display: 'flex',
    flexDirection: $direction,
    flexWrap: $wrap,
    flexBasis: $basis,
    flexGrow: $grow,
    flexShrink: $shrink,
    alignItems: $align,
    justifyContent: $justify,
    gap: theme.spacing[$gap] || 0,
    padding: theme.spacing[$padding] || 0,
  })
)

const Flex = memo(BaseFlex)

export default Flex
