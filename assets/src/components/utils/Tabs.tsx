import {
  Children,
  ComponentProps,
  ReactElement,
  cloneElement,
  forwardRef,
} from 'react'
import { Link } from 'react-router-dom'
import styled, { CSSProperties } from 'styled-components'
import { TabBaseProps } from '@pluralsh/design-system'

import { UnstyledLink } from './Link'

const LinkTabWrapUnstyled = forwardRef(
  (
    {
      className,
      active,
      vertical,
      children,
      textValue: _textValue,
      subTab: _,
      ...props
    }: ComponentProps<typeof Link> &
      TabBaseProps & { children: ReactElement<any>; subTab?: boolean },
    ref
  ) => (
    <UnstyledLink
      ref={ref as any}
      className={className}
      $extendStyle={{ display: 'block' }}
      {...props}
    >
      {cloneElement(Children.only(children), {
        active,
        vertical,
        tabIndex: -1, // the link itself takes over the tab handling
      })}
    </UnstyledLink>
  )
)

export const LinkTabWrap = styled(LinkTabWrapUnstyled)<{
  $extendStyle?: CSSProperties
}>(({ theme, vertical, subTab, $extendStyle }) => ({
  ...(vertical ? { width: '100%' } : {}),
  ...(subTab ? { borderRadius: theme.borderRadiuses.medium } : {}),
  ...$extendStyle,
}))
