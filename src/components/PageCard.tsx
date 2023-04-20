import {
  Div,
  type DivProps,
  Flex,
  H1,
  type H1Props,
  H2,
  type H2Props,
} from 'honorable'
import { type ReactNode, forwardRef } from 'react'

import AppIcon, { type AppIconProps } from './AppIcon'

type PageCardProps = {
  icon: Omit<AppIconProps, 'size'>
  heading?: ReactNode
  subheading?: ReactNode
  subheadingIcon?: ReactNode
  headingProps?: H1Props
  subheadingProps?: H2Props
} & DivProps

const PageCard = forwardRef<HTMLDivElement, PageCardProps>(
  (
    {
      icon = {},
      heading,
      headingProps,
      subheading,
      subheadingProps,
      subheadingIcon,
      children,
      ...props
    },
    ref
  ) => (
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
)

export default PageCard
export type { PageCardProps }
