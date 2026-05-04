import { Card, CardProps } from '@pluralsh/design-system'
import { ReactNode } from 'react'
import { useTheme } from 'styled-components'
import { RectangleSkeleton } from './SkeletonLoaders.tsx'
import { StretchedFlex } from './StretchedFlex.tsx'
import { OverlineH1 } from './typography/Text.tsx'

export default function PropCard({
  title,
  titleContent,
  children,
  loading,
  ...props
}: { title: string; titleContent?: ReactNode; loading?: boolean } & CardProps) {
  const theme = useTheme()

  return (
    <Card
      {...props}
      css={{ ...theme.partials.text.body2Bold, padding: theme.spacing.medium }}
    >
      <StretchedFlex align="baseline">
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
      </StretchedFlex>
      {loading ? (
        <RectangleSkeleton
          $bright
          $height="large"
        />
      ) : (
        children
      )}
    </Card>
  )
}
