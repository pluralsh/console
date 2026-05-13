import { Tooltip, WrapWithIf } from '@pluralsh/design-system'
import { MouseEventHandler } from 'react'
import { evalGradeToColor } from 'components/workbenches/common/evalGrade'
import { useTheme } from 'styled-components'

const SIZE_BY_VARIANT = {
  small: 32,
  medium: 40,
} as const

export function WorkbenchEvalGradeBadge({
  grade,
  size = 'small',
  colorBorder = false,
  onClick,
  tooltip,
}: {
  grade: number
  size?: 'small' | 'medium'
  colorBorder?: boolean
  onClick?: MouseEventHandler<HTMLDivElement>
  tooltip?: string
}) {
  const theme = useTheme()
  const pixelSize = SIZE_BY_VARIANT[size]
  const color = evalGradeToColor(grade)

  return (
    <WrapWithIf
      condition={!!tooltip}
      wrapper={<Tooltip label={tooltip} />}
    >
      <div
        css={{
          alignItems: 'center',
          backgroundColor: theme.colors['fill-two'],
          border: colorBorder
            ? `1px solid ${color}`
            : theme.borders['fill-two'],
          borderRadius: '50%',
          color,
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
