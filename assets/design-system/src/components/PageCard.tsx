import { ComponentPropsWithRef, type ReactNode } from 'react'

import styled from 'styled-components'
import AppIcon, { type AppIconProps } from './AppIcon'
import Flex, { type FlexProps } from './Flex'

type PageCardProps = {
  icon: Omit<AppIconProps, 'size'>
  heading?: ReactNode
  subheading?: ReactNode
  subheadingIcon?: ReactNode
  headingProps?: ComponentPropsWithRef<'h1'>
  subheadingProps?: ComponentPropsWithRef<'h2'>
} & FlexProps

function PageCard({
  ref,
  icon = {},
  heading,
  headingProps,
  subheading,
  subheadingProps,
  subheadingIcon,
  children,
  ...props
}: PageCardProps) {
  return (
    <WrapperSC>
      <Flex
        ref={ref}
        gap="medium"
        align="center"
        {...props}
      >
        <AppIcon
          size="small"
          {...icon}
        />
        <div>
          {heading && <HeadingSC {...headingProps}>{heading}</HeadingSC>}
          {subheading && (
            <SubheadingSC {...subheadingProps}>
              {subheadingIcon && (
                <Flex
                  width={12}
                  alignItems="center"
                  color="action-link-inline"
                  {...{ '& svg': { width: '100%' } }}
                >
                  {subheadingIcon}
                </Flex>
              )}
              <div>{subheading}</div>
            </SubheadingSC>
          )}
        </div>
      </Flex>
      {children && <ChildrenSC>{children}</ChildrenSC>}
    </WrapperSC>
  )
}
const WrapperSC = styled.div(({ theme }) => ({
  paddingLeft: theme.spacing.medium,
  'h1, h2': { margin: 0 },
  wordBreak: 'break-word',
}))
const HeadingSC = styled.h1(({ theme }) => ({
  ...theme.partials.text.subtitle1,
}))
const SubheadingSC = styled.h2(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xxsmall,
}))
const ChildrenSC = styled.div(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-xlight'],
  marginTop: theme.spacing.small,
}))

export default PageCard
export type { PageCardProps }
