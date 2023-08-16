import { useEffect, useState } from 'react'

const getPlatform = () => {
  let modKeyString = 'Ctrl'
  let altKeyString = 'Alt'
  let shiftKeyString = 'Shift'
  let isMac = false
  let keyCombinerString = '+'

  if (
    window?.navigator?.platform.indexOf('Mac') === 0 ||
    window?.navigator?.platform === 'iPhone'
  ) {
    modKeyString = '⌘' // command key
    altKeyString = '⌥' // command key
    shiftKeyString = '⇧' // command key
    isMac = true // command key
    keyCombinerString = ' ' // thin space
  }

  return {
    isMac,
    modKeyString,
    keyCombinerString,
    altKeyString,
    shiftKeyString,
  }
}

export const usePlatform = () => {
  const [platform, setPlatform] = useState(getPlatform())

  useEffect(() => {
    setPlatform(getPlatform())
  }, [])

  return platform
}
