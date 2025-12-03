import { useMemo } from 'react'

export type DateOrderChar = 'Y' | 'M' | 'D'
export type DateOrderArr = readonly [
  DateOrderChar,
  DateOrderChar,
  DateOrderChar,
]
export type DateOrderString = 'MDY' | 'DMY' | 'YMD'

const orderStrToArr: Record<DateOrderString, DateOrderArr> = {
  MDY: ['M', 'D', 'Y'],
  DMY: ['D', 'M', 'Y'],
  YMD: ['Y', 'M', 'D'],
}

// detects user's preferred date order from their browser locale
// uses Intl.DateTimeFormat.formatToParts() which is the standard way to get this info
export function useDateFormat(): DateOrderArr {
  return useMemo(() => {
    try {
      const order = new Intl.DateTimeFormat(navigator.language)
        .formatToParts()
        .filter((p) => ['month', 'day', 'year'].includes(p.type))
        .map((p) => p.type?.[0]?.toUpperCase())
        .join('')

      if (order in orderStrToArr)
        return orderStrToArr[order as keyof typeof orderStrToArr]
      return orderStrToArr.MDY
    } catch (e) {
      console.error(e)
      return orderStrToArr.MDY
    }
  }, [])
}
