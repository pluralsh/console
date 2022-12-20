import {
  Children,
  ComponentProps,
  ReactElement,
  cloneElement,
  forwardRef,
} from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { TabBaseProps } from '@pluralsh/design-system'

import { UnstyledLink } from './Link'

const LinkTabWrapUnstyled = forwardRef(({
  className,
  active,
  vertical,
  children,
  textValue: _textValue,
  subTab: _,
  ...props
}: ComponentProps<typeof Link> &
      TabBaseProps & { children: ReactElement; subTab: any },
ref) => (
  <UnstyledLink
    ref={ref as any}
    className={className}
    $extendStyle={{ display: 'block' }}
    {...props}
  >
    {cloneElement(Children.only(children), {
      active,
      vertical,
    })}
  </UnstyledLink>
))

export const LinkTabWrap = styled(LinkTabWrapUnstyled)(({
  theme, vertical, subTab, $extendStyle,
}) => ({
  ...(vertical ? { width: '100%' } : {}),
  ...(subTab ? { borderRadius: theme.borderRadiuses.medium } : {}),
  ...$extendStyle,
}))
