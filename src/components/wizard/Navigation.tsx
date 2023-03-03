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
import InfoOutlineIcon from '../icons/InfoOutlineIcon'
import Tooltip from '../Tooltip'

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
  justifyContent: 'flex-end',

  '.spacer': {
    flex: 1,
  },

  '.textContainer': {
    display: 'flex',
    gap: theme.spacing.xsmall,
    color: theme.colors['icon-light'],

    '.text': {
      color: theme.colors['text-xlight'],
      whiteSpace: 'nowrap',
      alignSelf: 'center',
    },
  },
}))

type NavigationProps<T = unknown> = {
  onInstall: Dispatch<Array<StepConfig<T>>>
  tooltip?: string
}

function NavigationUnstyled<T = unknown>({ onInstall, tooltip, ...props }: NavigationProps<T>): ReactElement<NavigationProps<T>> {
  const {
    completed, setCompleted, limit,
  } = useContext<ContextProps<T>>(WizardContext)
  const { setCompleted: setStepCompleted, valid, completed: stepCompleted } = useActive()
  const {
    isLast, isFirst, onReset, onBack, onNext, onReturn,
  } = useNavigation()
  const { selected: stepperSteps } = useStepper<T>()
  const { selected: pickerSteps, selectedCount } = usePicker()

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
      {isFirst && (
        <Button
          secondary
          onClick={() => onReset()}
        >Clear
        </Button>
      )}
      {isFirst && (
        <div className="textContainer">
          <div className="text">{selectedCount}/{limit} selected</div>
          {tooltip && (
            <Tooltip label={tooltip}>
              <InfoOutlineIcon size={16} />
            </Tooltip>
          )}
        </div>
      )}
      {!isFirst && (
        <Button
          secondary
          onClick={() => onBack()}
        >Back
        </Button>
      )}
      <div className="spacer" />
      {completed && stepCompleted && (
        <Button
          secondary
          startIcon={<ReturnIcon />}
          disabled={!valid}
          onClick={() => onReturn()}
        >Return to install
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
