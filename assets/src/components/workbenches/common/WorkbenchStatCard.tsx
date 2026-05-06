import { Card } from '@pluralsh/design-system'
import { Overline } from 'components/cd/utils/PermissionsModal'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { CaptionP } from 'components/utils/typography/Text'
import { useTheme } from 'styled-components'

export function WorkbenchStatCard({
  label,
  value,
  helper,
  loading,
  valueColor,
}: {
  label: string
  value: string
  helper: string
  loading?: boolean
  valueColor?: string
}) {
  const theme = useTheme()

  return (
    <Card
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.xxsmall,
        padding: theme.spacing.large,
      }}
    >
      <Overline>{label}</Overline>
      {loading ? (
        <RectangleSkeleton
          $height={32}
          $width="45%"
        />
      ) : (
        <div
          css={{
            fontSize: 36,
            fontWeight: 600,
            letterSpacing: '-0.25px',
            lineHeight: '32px',
            color: valueColor,
          }}
        >
          {value}
        </div>
      )}
      <CaptionP $color="text-xlight">{helper}</CaptionP>
    </Card>
  )
}
