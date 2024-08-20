// drop-in replacement for anywhere 'honorable' Flex is used

import {
  type CSSProperties,
  type ReactNode,
  type Ref,
  forwardRef,
  memo,
} from 'react'
import { useTheme } from 'styled-components'

type FlexBaseProps = {
  /**
   * Alias for flexDirection
   */
  direction?: 'row' | 'column'
  /**
   * wrap flex property
   */
  wrap?: 'wrap' | 'nowrap' | 'wrap-reverse' | boolean
  /**
   * Alias for flexBasis
   */
  basis?: string | number
  /**
   * Alias for flexGrow
   */
  grow?: boolean | number
  /**
   * Alias for flexShrink
   */
  shrink?: boolean | number
  /**
   * Alias for alignItems
   */
  align?: 'flex-start' | 'flex-end' | 'center' | 'baseline' | 'stretch'
  /**
   * Alias for justifyContent
   */
  justify?:
    | 'flex-start'
    | 'flex-end'
    | 'center'
    | 'space-between'
    | 'space-around'
    | 'space-evenly'

  gap?: string

  children?: ReactNode
}

type FlexProps = Omit<CSSProperties, keyof FlexBaseProps> & FlexBaseProps

function FlexRef(props: FlexProps, ref: Ref<any>) {
  const {
    direction,
    wrap,
    basis,
    grow,
    shrink,
    align,
    justify,
    gap,
    children,
    ...otherProps
  } = props
  const theme = useTheme()

  return (
    <div
      ref={ref}
      style={{
        display: 'flex',
        flexDirection: direction,
        flexWrap: typeof wrap === 'boolean' ? 'wrap' : wrap,
        flexBasis: basis,
        flexGrow: typeof grow === 'boolean' ? 1 : grow,
        flexShrink: typeof shrink === 'boolean' ? 1 : shrink,
        alignItems: align,
        justifyContent: justify,
        gap: (theme.spacing as any)[gap] || 0,
        ...otherProps,
      }}
    >
      {children}
    </div>
  )
}

const BaseFlex = forwardRef(FlexRef)

const Flex = memo(BaseFlex)

export default Flex
