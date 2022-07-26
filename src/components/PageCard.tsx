import {
  Div, DivProps, Flex, H1, H2,
} from 'honorable'
import { ReactNode, forwardRef } from 'react'

import IconFrame, { IconFrameProps } from './IconFrame'

type PageCardProps = {
  icon: Omit<IconFrameProps, 'size'>
  heading?: ReactNode
  subheading?: ReactNode
  subheadingIcon?: ReactNode
} & DivProps

const PageCard = forwardRef<HTMLDivElement, PageCardProps>(({
  icon = {},
  heading,
  headingProps,
  subheading,
  subheadingProps,
  subheadingIcon,
  children,
  ...props
},
ref) => (
  <Div paddingLeft="medium">
    <Flex
      ref={ref}
      gap="medium"
      alignItems="center"
      {...props}
    >
      <IconFrame
        size="small"
        hue="default"
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
))

export default PageCard
export { PageCardProps }
