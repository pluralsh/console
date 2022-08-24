import { Div, DivProps } from 'honorable'
import { forwardRef } from 'react'

import { Card } from '../index'

import { CardProps } from './Card'

export type ContentCardProps = CardProps & {
  innerProps?: DivProps
} & DivProps

const ContentCard = forwardRef<HTMLDivElement, ContentCardProps>(({
  children, innerProps, ...props
}, ref) => (
  <Card
    ref={ref}
    overflowY="auto"
    paddingHorizontal="xlarge"
    {...props}
  >
    <Div
      width="100%"
      marginLeft="auto"
      marginRight="auto"
      paddingVertical="xlarge"
      maxWidth={608}
      {...innerProps}
    >
      {children}
    </Div>
  </Card>
))

export default ContentCard
