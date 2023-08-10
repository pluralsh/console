import { useEffect, useState } from 'react'

const getPlatform = () => {
  let modKeyString = 'ctrl' // control key
  let isMac = false

  console.log('navigator', window?.navigator)
  if (
    window?.navigator?.platform.indexOf('Mac') === 0 ||
    window?.navigator?.platform === 'iPhone'
  ) {
    modKeyString = '⌘' // command key
    isMac = true // command key
  }

  return { isMac, modKeyString }
}

export const usePlatform = () => {
  const [platform, setPlatform] = useState(getPlatform())

  useEffect(() => {
    setPlatform(getPlatform())
  }, [])

  return platform
}
