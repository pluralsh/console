import { useEffect, useState } from 'react'

const getPlatform = () => {
  if (
    window?.navigator?.platform.indexOf('Mac') === 0 ||
    window?.navigator?.platform === 'iPhone'
  ) {
    return {
      modKeyString: '⌘', // command key
      altKeyString: '⌥', // option key
      shiftKeyString: '⇧', // shift key
      isMac: true,
      keyCombinerString: ' ', // thin space
    }
  }

  return {
    modKeyString: 'Ctrl',
    altKeyString: 'Alt',
    shiftKeyString: 'Shift',
    isMac: false,
    keyCombinerString: '+',
  }
}

export const usePlatform = () => {
  const [platform, setPlatform] = useState(getPlatform())

  useEffect(() => {
    setPlatform(getPlatform())
  }, [])

  return platform
}
