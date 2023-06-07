import { createContext, useContext } from 'react'

const MIN_FILL = 0
const MAX_FILL = 3

export type FillLevel = 0 | 1 | 2 | 3

export const FillLevelContext = createContext<FillLevel>(0)
export const FillLevelProvider = FillLevelContext.Provider
export const useFillLevel = () => useContext(FillLevelContext)

export function toFillLevel(x: number | FillLevel): FillLevel {
  return Math.max(Math.min(Math.floor(x), MAX_FILL), MIN_FILL) as FillLevel
}

const isInteger = (x: unknown): x is number => Number.isInteger(x)

export function isFillLevel(x: unknown): x is FillLevel {
  return isInteger(x) && x <= MAX_FILL && x >= MIN_FILL
}
