import React, { useContext } from 'react'
import { Text, ThemeContext } from 'grommet'
import { CircularProgressbarWithChildren, buildStyles } from 'react-circular-progressbar';
import { normalizeColor } from 'grommet/utils';

export function Gauge({current, total, size, modifier}) {
  const theme = useContext(ThemeContext)

  return (
    <CircularProgressbarWithChildren
      value={(current / total) * 100}
      circleRatio={0.75}
      styles={buildStyles({
        rotation: 1 / 2 + 1 / 8,
        strokeLinecap: "butt",
        pathColor: normalizeColor('success', theme),
        trailColor: normalizeColor('progress', theme)
      })}>
      <Text size={size || 'small'} color='tone-light'>{current} / {total} {modifier}</Text>
    </CircularProgressbarWithChildren>
  )
}