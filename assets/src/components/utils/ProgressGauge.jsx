import { useContext } from 'react'
import { Text, ThemeContext } from 'grommet'
import { CircularProgressbarWithChildren, buildStyles } from 'react-circular-progressbar'
import { normalizeColor } from 'grommet/utils'
import { ResponsiveWaffle } from '@nivo/waffle'

const data = (
  success, progress, error, theme
) => (
  [
    {
      id: 'running',
      label: 'running',
      value: success,
      color: normalizeColor('success', theme),
    },
    {
      id: 'waiting',
      label: 'waiting',
      value: progress,
      color: normalizeColor('progress', theme),
    },
    {
      id: 'error',
      label: 'error',
      value: error,
      color: normalizeColor('error', theme),
    },
  ]
)

export function Waffle({ success, progress, error }) {
  const theme = useContext(ThemeContext)
  const total = success + progress + error
  const rows = Math.ceil(total / 10)
  const cols = Math.min(total, 10)

  return (
    <ResponsiveWaffle
      data={data(
        success, progress, error, theme
      )}
      colors={{ datum: 'color' }}
      borderColor={{ from: 'color', modifiers: [['darker', 0.3]] }}
      animate
      total={total}
      columns={cols}
      rows={rows}
    />
  )
}

export function Gauge({
  current, total, ratio, size, modifier, format: fmt,
}) {
  const theme = useContext(ThemeContext)
  const format = fmt || (x => x)

  return (
    <CircularProgressbarWithChildren
      value={(current / total) * 100}
      circleRatio={ratio || 0.75}
      styles={buildStyles({
        // rotation: 1 / 2 + 1 / 8,
        strokeLinecap: 'butt',
        pathColor: normalizeColor('success', theme),
        // trailColor: normalizeColor('tone-medium', theme)
      })}
    >
      <Text
        size={size || 'small'}
        color="tone-light"
      >
        {format(current)} / {format(total)} {modifier}
      </Text>
    </CircularProgressbarWithChildren>
  )
}
