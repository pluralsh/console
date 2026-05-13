import { Tooltip, WrapWithIf } from '@pluralsh/design-system'
import { MouseEventHandler } from 'react'
import { evalGradeToColor } from 'components/workbenches/common/evalGrade'
import { useTheme } from 'styled-components'

type WorkbenchEvalGradeBadgeProps = {
  grade: number
  size?: 'small' | 'medium'
  onClick?: MouseEventHandler<HTMLDivElement>
  tooltip?: string
}

const SIZE_BY_VARIANT = {
  small: 32,
  medium: 40,
} as const

export function WorkbenchEvalGradeBadge({
  grade,
  size = 'small',
  onClick,
  tooltip,
}: WorkbenchEvalGradeBadgeProps) {
  const theme = useTheme()
  const pixelSize = SIZE_BY_VARIANT[size]

  return (
    <WrapWithIf
      condition={!!tooltip}
      wrapper={<Tooltip label={tooltip} />}
    >
      <div
        css={{
          alignItems: 'center',
          backgroundColor: theme.colors['fill-two'],
          border: theme.borders['fill-two'],
          borderRadius: '50%',
          color: evalGradeToColor(grade),
          cursor: !!onClick ? 'pointer' : 'default',
          display: 'flex',
          flexShrink: 0,
          fontWeight: 600,
          height: pixelSize,
          justifyContent: 'center',
          width: pixelSize,
        }}
        onClick={onClick}
      >
        {Math.round(grade)}
      </div>
    </WrapWithIf>
  )
}
