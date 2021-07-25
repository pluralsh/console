import React, { useContext } from 'react'
import { Text, ThemeContext } from 'grommet'
import { CircularProgressbarWithChildren, buildStyles } from 'react-circular-progressbar';
import { normalizeColor } from 'grommet/utils';
import { ResponsiveWaffle } from '@nivo/waffle'
import { ResponsivePie } from '@nivo/pie'

const data = (success, progress, error, theme) => (
  [
    {
      id: 'success', 
      label: 'successful', 
      value: success, 
      color: normalizeColor('success', theme),
    },
    {
      id: 'progress', 
      label: 'in progress', 
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

export function Pie({success, progress, error}) {
  const theme = useContext(ThemeContext)
  const dat = data(success, progress, error, theme)
  console.log(dat)
  return (
    <ResponsivePie
      data={dat}
      theme={{
        tooltip: {container: {color: '#13141a'}},
      }}
      margin={{ top: 40, right: 40, bottom: 40, left: 40 }}
      innerRadius={0.5}
      cornerRadius={3}
      activeOuterRadiusOffset={8}
      borderWidth={1}
      // arcLabel='label'
      borderColor={{ from: 'color', modifiers: [ [ 'darker', 0.2 ] ] }}
      arcLinkLabelsSkipAngle={10}
      arcLinkLabelsTextColor="white"
      arcLinkLabelsThickness={2}
      arcLinkLabelsColor={{ from: 'color' }}
      arcLabelsSkipAngle={10}
      arcLabelsTextColor='white'
      colors={({data: {color, ...rest}}) => {
        console.log(rest)
        console.log(color)
        return color
      }} 
    />
  )
}

export function Waffle({success, progress, error}) {
  const theme = useContext(ThemeContext)
  const total = success + progress + error
  const rows = Math.ceil(total / 10)
  const cols = Math.min(total, 10)
  console.log(total)
  return (
    <ResponsiveWaffle
      data={data(success, progress, error, theme)} 
      colors={{ datum: 'color' }}
      borderColor={{ from: 'color', modifiers: [ [ 'darker', 0.3 ] ] }}
      animate
      total={total}
      columns={cols}
      rows={rows}
    />
  )
}

export function Gauge({current, total, size, modifier}) {
  const theme = useContext(ThemeContext)

  return (
    <CircularProgressbarWithChildren
      value={(current / total) * 100}
      circleRatio={0.75}
      styles={buildStyles({
        rotation: 1 / 2 + 1 / 8,
        strokeLinecap: "round",
        pathColor: normalizeColor('success', theme),
        trailColor: normalizeColor('progress', theme)
      })}>
      <Text size={size || 'small'} color='tone-light'>{current} / {total} {modifier}</Text>
    </CircularProgressbarWithChildren>
  )
}