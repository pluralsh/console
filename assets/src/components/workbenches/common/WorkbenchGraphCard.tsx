import { Card } from '@pluralsh/design-system'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { Body1P, CaptionP } from 'components/utils/typography/Text'
import { ReactNode } from 'react'
import { useTheme } from 'styled-components'

const MIN_HEIGHT = 360

export function WorkbenchGraphCard({
  title,
  rightContent,
  children,
  hint,
  loading,
}: {
  title: string
  rightContent?: ReactNode
  children: ReactNode
  hint?: string
  loading?: boolean
}) {
  const theme = useTheme()

  return (
    <Card
      css={{
        backgroundColor: theme.colors['fill-zero'],
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.medium,
        padding: theme.spacing.large,
        minHeight: MIN_HEIGHT,
      }}
    >
      <div
        css={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: theme.spacing.medium,
        }}
      >
        <Body1P>{title}</Body1P>
        {rightContent}
      </div>
      <div css={{ minHeight: 0, flex: 1 }}>
        {loading ? (
          <RectangleSkeleton
            $height="100%"
            $width="100%"
          />
        ) : (
          children
        )}
      </div>
      {hint && <CaptionP $color="text-xlight">{hint}</CaptionP>}
    </Card>
  )
}
