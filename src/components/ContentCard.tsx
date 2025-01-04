import { useTheme } from 'styled-components'

import Card, { type CardProps } from './Card'

function ContentCard({ ref, children, ...props }: CardProps) {
  const theme = useTheme()

  return (
    <Card
      ref={ref}
      overflowY="auto"
      padding={`0 ${theme.spacing.xlarge}px`}
      {...props}
    >
      <div
        css={{
          width: '100%',
          marginLeft: 'auto',
          marginRight: 'auto',
          padding: `${theme.spacing.xlarge}px 0`,
          maxWidth: 608,
        }}
      >
        {children}
      </div>
    </Card>
  )
}

export default ContentCard
