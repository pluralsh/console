import { Card, InfoOutlineIcon, Tooltip } from '@pluralsh/design-system'
import { Overline } from 'components/cd/utils/PermissionsModal'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { CaptionP } from 'components/utils/typography/Text'
import type { ReactNode } from 'react'
import { useTheme } from 'styled-components'

type WorkbenchStatProps = {
  label: string
  value: string
  helper: string
  info?: ReactNode
  loading?: boolean
  valueColor?: string
}

export function WorkbenchStatCard(props: WorkbenchStatProps) {
  const theme = useTheme()

  return (
    <Card
      css={{
        border: theme.borders.default,
        padding: theme.spacing.large,
      }}
    >
      <WorkbenchStat {...props} />
    </Card>
  )
}

export function WorkbenchStat({
  label,
  value,
  helper,
  info,
  loading,
  valueColor,
}: WorkbenchStatProps) {
  const theme = useTheme()

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
      }}
    >
      <div
        css={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.xsmall,
        }}
      >
        <Overline>{label}</Overline>
        {info && (
          <Tooltip
            label={info}
            placement="top"
          >
            <InfoOutlineIcon
              aria-label={`How ${label.toLowerCase()} is calculated`}
              color="icon-xlight"
              size={12}
            />
          </Tooltip>
        )}
      </div>
      {loading ? (
        <RectangleSkeleton
          $height={32}
          $width="45%"
        />
      ) : (
        <div
          css={{
            fontSize: '2.25rem',
            fontWeight: 600,
            letterSpacing: '-0.025em',
            lineHeight: '2rem',
            color: valueColor,
          }}
        >
          {value}
        </div>
      )}
      <CaptionP $color="text-xlight">{helper}</CaptionP>
    </div>
  )
}
