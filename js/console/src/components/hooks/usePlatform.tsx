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

const PLATFORM = getPlatform()

export const usePlatform = () => PLATFORM
