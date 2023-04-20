import { type CSSObject } from 'styled-components'

import { type StringObj } from '../theme'

import { type FillLevel } from '../components/contexts/FillLevelContext'

import { semanticColors } from './colors'

export const scrollBar = ({ fillLevel }: { fillLevel: FillLevel }) => {
  const trackColor =
    fillLevel >= 2 ? semanticColors['fill-three'] : semanticColors['fill-two']
  const barColor =
    fillLevel >= 2
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

  // Type-cast allows to be used in Honorable, Emotion and
  // styled-components components
  return style as StringObj
}
