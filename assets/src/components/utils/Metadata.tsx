import { Card, SidecarProps } from '@pluralsh/design-system'
import { Div, Flex, H2 } from 'honorable'
import { forwardRef } from 'react'
import styled from 'styled-components'
import { makeGrid } from 'utils/makeGrid'

export const MetadataGrid = styled(Card)(({ theme }) => ({
  ...makeGrid({ maxCols: 4, minColWidth: 186, gap: theme.spacing.xlarge }),
  padding: theme.spacing.large,
}))

export const MetadataItem = forwardRef<HTMLDivElement, SidecarProps>(({
  heading, headingProps, contentProps, children, ...props
}, ref) => (
  <Flex
    ref={ref}
    direction="column"
    gap="xsmall"
    {...props}
  >
    {heading && (
      <H2
        body1
        bold
        color="text-default"
        {...headingProps}
      >
        {heading}
      </H2>
    )}
    {children && (
      <Div
        body1
        color="text-xlight"
        overflowWrap="anywhere"
        {...contentProps}
      >
        {children}
      </Div>
    )}
  </Flex>
))
