import { Card } from '@pluralsh/design-system'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { Body1P, CaptionP } from 'components/utils/typography/Text'
import { ReactNode } from 'react'
import { useTheme } from 'styled-components'

export function WorkbenchGraphCard({
  title,
  rightContent,
  children,
  hint,
  loading,
  minContentHeight = 200,
}: {
  title: string
  rightContent?: ReactNode
  children: ReactNode
  hint?: string
  loading?: boolean
  minContentHeight?: number
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
      <div css={{ minHeight: minContentHeight, flex: 1 }}>
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
