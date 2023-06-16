import chroma from 'chroma-js'
import { type CSSProperties } from 'styled-components'

export const grey = {
  950: '#0E1015',
  900: '#171A21',
  875: '#1B1F27',
  850: '#21242C',
  825: '#252932',
  800: '#2A2E37',
  775: '#303540',
  750: '#383D47',
  725: '#3D424D',
  700: '#454954',
  675: '#4C505C',
  600: '#5D626F',
  500: '#747B8B',
  400: '#A1A5B0',
  300: '#B2B7C3',
  200: '#C5C9D3',
  100: '#DFE2E7',
  50: '#EBEFF0',
} as const satisfies Record<number, CSSProperties['color']>

export const purple = {
  950: '#020318',
  900: '#030530',
  850: '#050847',
  800: '#070A5F',
  700: '#0A0F8F',
  600: '#0D14BF',
  500: '#111AEE',
  400: '#4A51F2',
  350: '#5D63F4',
  300: '#747AF6',
  200: '#9FA3F9',
  100: '#CFD1FC',
  50: '#F1F1FE',
} as const satisfies Record<number, CSSProperties['color']>

export const blue = {
  950: '#001019',
  900: '#002033',
  850: '#00304D',
  800: '#004166',
  700: '#006199',
  600: '#0081CC',
  500: '#06A0F9',
  400: '#33B4FF',
  350: '#4DBEFF',
  300: '#66C7FF',
  200: '#99DAFF',
  100: '#C2E9FF',
  50: '#F0F9FF',
} as const satisfies Record<number, CSSProperties['color']>

export const green = {
  950: '#032117',
  900: '#053827',
  850: '#074F37',
  800: '#0A6B4A',
  700: '#0F996A',
  600: '#13C386',
  500: '#17E8A0',
  400: '#3CECAF',
  300: '#6AF1C2',
  200: '#99F5D5',
  100: '#C7FAE8',
  50: '#F1FEF9',
} as const satisfies Record<number, CSSProperties['color']>

export const yellow = {
  950: '#242000',
  900: '#3D2F00',
  850: '#574500',
  800: '#756200',
  700: '#A88C00',
  600: '#D6BA00',
  500: '#FFE500',
  400: '#FFEB33',
  300: '#FFF170',
  200: '#FFF59E',
  100: '#FFF9C2',
  50: '#FFFEF0',
} as const satisfies Record<number, CSSProperties['color']>

export const red = {
  950: '#130205',
  900: '#200308',
  850: '#38060E',
  800: '#660A19',
  700: '#8B0E23',
  600: '#BA1239',
  500: '#E81748',
  400: '#E95374',
  300: '#F2788D',
  200: '#F599A8',
  100: '#FAC7D0',
  50: '#FFF0F2',
} as const satisfies Record<number, CSSProperties['color']>

export const baseColors = {
  // Base palette,
  blue,
  grey,
  green,
  yellow,
  red,
  purple,
  'modal-backdrop': `${chroma(grey[900]).alpha(0.6)}`,
} as const
