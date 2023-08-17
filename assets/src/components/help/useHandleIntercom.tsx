import { Dispatch, SetStateAction, useEffect } from 'react'
import { usePrevious } from '@pluralsh/design-system'
import { useIntercom } from 'react-use-intercom'

import { HelpMenuState, HelpOpenState } from './HelpLauncher'

export function useHandleIntercom({
  menuState,
  openState,
  setMenuState,
  setOpenState,
  closeHelp,
}: {
  menuState: HelpMenuState
  openState: HelpOpenState
  setMenuState: Dispatch<SetStateAction<HelpMenuState>>
  setOpenState: Dispatch<SetStateAction<HelpOpenState>>
  closeHelp: () => void
}) {
  const prevMenuState = usePrevious(menuState)
  const prevOpenState = usePrevious(openState)

  const { isOpen: intercomIsOpen, ...intercom } = useIntercom()

  const intercomWasOpen = usePrevious(intercomIsOpen)

  useEffect(() => {
    if (prevMenuState === menuState && prevOpenState === openState) {
      return
    }

    if (
      menuState === HelpMenuState.intercom &&
      openState === HelpOpenState.open
    ) {
      intercom.show()
    } else {
      intercom.hide()
    }
  }, [
    intercom,
    intercomIsOpen,
    menuState,
    openState,
    prevMenuState,
    prevOpenState,
  ])

  useEffect(() => {
    if (intercomIsOpen && !intercomWasOpen) {
      setMenuState(HelpMenuState.intercom)
      setOpenState(HelpOpenState.open)
    }
    if (
      !intercomIsOpen &&
      intercomWasOpen &&
      menuState === HelpMenuState.intercom
    ) {
      closeHelp()
    }
  }, [
    closeHelp,
    intercomIsOpen,
    intercomWasOpen,
    menuState,
    openState,
    setMenuState,
    setOpenState,
  ])
}
