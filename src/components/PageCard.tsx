import { Div, type DivProps, Flex, H1, H2 } from 'honorable'
import { type ComponentProps, type ReactNode } from 'react'

import AppIcon, { type AppIconProps } from './AppIcon'

type PageCardProps = {
  icon: Omit<AppIconProps, 'size'>
  heading?: ReactNode
  subheading?: ReactNode
  subheadingIcon?: ReactNode
  headingProps?: ComponentProps<'h1'>
  subheadingProps?: ComponentProps<'h2'>
} & DivProps

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
    <Div paddingLeft="medium">
      <Flex
        ref={ref}
        gap="medium"
        alignItems="center"
        {...props}
      >
        <AppIcon
          size="small"
          {...icon}
        />
        <Div>
          {heading && (
            <H1
              subtitle1
              {...headingProps}
            >
              {heading}
            </H1>
          )}
          {subheading && (
            <H2
              caption
              color="text-xlight"
              display="flex"
              flexDirection="row"
              alignItems="center"
              {...subheadingProps}
            >
              {subheadingIcon && (
                <Flex
                  width={12}
                  marginRight="xxsmall"
                  alignItems="center"
                  color="action-link-inline"
                  {...{ '& svg': { width: '100%' } }}
                >
                  {subheadingIcon}
                </Flex>
              )}
              <Div>{subheading}</Div>
            </H2>
          )}
        </Div>
      </Flex>
      {children && (
        <Div
          body2
          color="text-xlight"
          marginTop="small"
        >
          {children}
        </Div>
      )}
    </Div>
  )
}

export default PageCard
export type { PageCardProps }
