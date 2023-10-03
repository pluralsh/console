import { AppIcon, WrapWithIf } from '@pluralsh/design-system'
import styled from 'styled-components'
import { ComponentProps } from 'react'
import classNames from 'classnames'
import { Merge } from 'type-fest'

const ColWithIconSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.xsmall,
  alignItems: 'center',
  '.icon': {
    '&, *': {
      width: 'unset',
      overflow: 'unset',
      whiteSpace: 'unset',
    },
  },
  '.content': {
    '&.truncateLeft': {
      direction: 'rtl',
      textAlign: 'left',
      span: {
        direction: 'ltr',
        unicodeBidi: 'bidi-override',
      },
    },
  },
}))

export function ColWithIcon({
  icon,
  children,
  truncateLeft = false,
  ...props
}: Merge<
  ComponentProps<typeof ColWithIconSC>,
  {
    icon: string | ComponentProps<typeof AppIcon>['icon']
    truncateLeft?: boolean
  }
>) {
  return (
    <ColWithIconSC {...props}>
      <div className="icon">
        <AppIcon
          spacing="padding"
          size="xxsmall"
          icon={typeof icon !== 'string' ? icon : undefined}
          url={typeof icon === 'string' ? icon : undefined}
        />
      </div>
      <div className={classNames('content', { truncateLeft: 'truncateLeft' })}>
        <WrapWithIf
          condition={truncateLeft}
          wrapper={<span />}
        >
          {children}
        </WrapWithIf>
      </div>
    </ColWithIconSC>
  )
}
