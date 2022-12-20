import styled from 'styled-components'
import {
  Dispatch,
  ReactElement,
  useContext,
  useEffect,
} from 'react'

import Button from '../Button'
import InstallIcon from '../icons/InstallIcon'
import { ReturnIcon } from '../../icons'

import {
  useActive,
  useNavigation,
  usePicker,
  useStepper,
} from './hooks'
import { ContextProps, StepConfig, WizardContext } from './context'

const Navigation = styled(NavigationUnstyled)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.medium,

  '.spacer': {
    flex: 1,
  },

  '.text': {
    color: theme.colors['text-xlight'],
    whiteSpace: 'nowrap',
    alignSelf: 'center',
  },
}))

type NavigationProps<T = unknown> = {
  onInstall: Dispatch<Array<StepConfig<T>>>
}

function NavigationUnstyled<T = unknown>({ onInstall, ...props }: NavigationProps<T>): ReactElement<NavigationProps<T>> {
  const {
    completed, setCompleted, limit,
  } = useContext<ContextProps<T>>(WizardContext)
  const { setCompleted: setStepCompleted, valid, completed: stepCompleted } = useActive()
  const {
    isLast, isFirst, onReset, onBack, onNext, onReturn,
  } = useNavigation()
  const { selected: stepperSteps } = useStepper<T>()
  const { selected: pickerSteps } = usePicker()

  useEffect(() => {
    const stepsCompleted = stepperSteps.every(s => s.isCompleted)

    if (!stepsCompleted) {
      setCompleted(false)

      return
    }

    return isLast ? setCompleted(true) : undefined
  }, [isLast, setCompleted, stepperSteps])

  return (
    <div {...props}>
      {completed && stepCompleted && (
        <Button
          secondary
          startIcon={<ReturnIcon />}
          disabled={!valid}
          onClick={() => onReturn()}
        >Return to install
        </Button>
      )}
      <div className="spacer" />
      {isFirst && <div className="text">{pickerSteps?.length || 0} selected {pickerSteps?.length >= limit ? '(max)' : ''}</div>}
      {isFirst && (
        <Button
          secondary
          onClick={() => onReset()}
        >Clear
        </Button>
      )}
      {!isFirst && (
        <Button
          secondary
          onClick={() => onBack()}
        >Back
        </Button>
      )}
      {!isLast && (
        <Button
          disabled={pickerSteps?.length === 0 || !valid}
          onClick={() => {
            setStepCompleted(true)
            onNext()
          }}
        >Continue
        </Button>
      )}
      {isLast && (
        <Button
          startIcon={<InstallIcon />}
          onClick={() => onInstall(stepperSteps)}
        >Install
        </Button>
      )}
    </div>
  )
}

export type { NavigationProps }
export { Navigation }
