import { CSSObject } from 'styled-components'

import { semanticColors } from './colors'

export const scrollBar = ({ hue = 'default' } = {}) => {
  const trackColor = hue === 'lighter'
    ? semanticColors['fill-three']
    : semanticColors['fill-two']
  const barColor = hue === 'lighter'
    ? semanticColors['text-xlight']
    : semanticColors['fill-three']
  const barWidth = 6
  const barRadius = barWidth / 2

  const style: CSSObject = {
    scrollbarWidth: 'thin',
    scrollbarColor: `${barColor} ${trackColor}`,
    '&::-webkit-scrollbar-track': {
      backgroundColor: trackColor,
      borderRadius: `${barRadius}px`,
    },
    '&::-webkit-scrollbar': {
      width: `${barWidth}px`,
      height: `${barWidth}px`,
      borderRadius: `${barRadius}px`,
      backgroundColor: trackColor,
    },
    '&::-webkit-scrollbar-thumb': {
      borderRadius: `${barRadius}px`,
      backgroundColor: barColor,
    },
    '&::-webkit-scrollbar-corner': {
      backgroundColor: 'transparent',
    },
  }

  return style
}
