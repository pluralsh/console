import { Card, CardProps } from '@pluralsh/design-system'
import { ReactElement } from 'react'
import { useTheme } from 'styled-components'
import { OverlineH1 } from './typography/Text.tsx'

export default function PropCard({
  title,
  titleContent,
  children,
  ...props
}: { title: string; titleContent?: ReactElement<any> } & CardProps) {
  const theme = useTheme()

  return (
    <Card
      {...props}
      css={{ ...theme.partials.text.body2Bold, padding: theme.spacing.medium }}
    >
      <div
        css={{
          alignItems: 'baseline',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <OverlineH1
          as="h3"
          css={{
            color: theme.colors['text-xlight'],
            marginBottom: theme.spacing.small,
          }}
        >
          {title}
        </OverlineH1>
        {titleContent}
      </div>
      {children}
    </Card>
  )
}
