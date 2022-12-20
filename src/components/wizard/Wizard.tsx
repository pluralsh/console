import styled from 'styled-components'
import { Flex } from 'honorable'
import {
  MouseEventHandler,
  ReactElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react'
import IsEmpty from 'lodash/isEmpty'

import IconFrame from '../IconFrame'
import { CloseIcon } from '../../icons'
import LoopingLogo from '../LoopingLogo'

import { NavigationProps } from './Navigation'
import { StepConfig } from './Picker'
import {
  useActive,
  useNavigation,
  usePicker,
  useWizard,
} from './hooks'
import { WizardContext } from './context'

const Wizard = styled(WizardUnstyled)(({ theme }) => ({
  height: '100%',
  minHeight: '400px',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',

  '.header': {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    height: '40px',
    marginBottom: '24px',
  },

  '.footer': {
    marginTop: '24px',

    '&.divider': {
      paddingTop: '24px',
      borderTop: '1px solid',
      borderColor: theme.colors.border,
    },
  },

  '.loader': {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    left: 0,
    margin: '-24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,

    '.overlay': {
      background: theme.colors['fill-zero'],
      opacity: 0.5,
      height: '100%',
      width: '100%',
      position: 'absolute',
    },

    '.logo': {
      opacity: 0.8,
    },
  },
}))

type WizardProps = {
  dependencySteps?: Array<StepConfig>
  loading?: boolean
  onClose?: MouseEventHandler<void>
  onComplete?: (completed: boolean) => void
  onSelect?: (selected: Array<StepConfig>) => void
  children?: {
    stepper?: ReactElement,
    navigation?: ReactElement<NavigationProps>
  }
}

function WizardUnstyled({
  dependencySteps, loading, onClose, onComplete, onSelect, children, ...props
}: WizardProps): ReactElement<WizardProps> {
  const { steps, setSteps, completed } = useContext(WizardContext)
  const { active } = useActive()
  const { isFirst, onReset } = useNavigation()
  const { selected } = usePicker()
  const { stepper, navigation } = children

  const hasHeader = useCallback(() => stepper || onClose, [stepper, onClose])

  useEffect(() => onComplete && onComplete(completed || steps.filter(s => !s.isDefault && !s.isPlaceholder).some(s => s.isCompleted)),
    [steps, completed, onComplete])
  useEffect(() => onSelect && onSelect(selected), [onSelect, selected])
  useEffect(() => {
    if (IsEmpty(dependencySteps)) {
      if (steps.some(s => s.isDependency)) onReset()

      return
    }

    const arr = steps.filter(step => !step.isDependency)

    arr.splice(1, 0, ...dependencySteps)
    setSteps(arr)
  }, [dependencySteps])

  return (
    <div {...props}>
      {loading && (
        <div className="loader">
          <div className="overlay" />
          <LoopingLogo className="logo" />
        </div>
      )}
      {/* Top bar */}
      {hasHeader && (
        <div className="header">
          {/* Stepper */}
          {stepper && stepper}
          <Flex flexGrow={1} />
          {onClose && (
            <IconFrame
              icon={<CloseIcon color="icon-light" />}
              onClick={onClose}
              textValue="close"
              clickable
            />
          )}
        </div>
      )}
      {/* Step */}
      {active?.node}
      {/* Navigation */}
      {navigation && (
        <div className={isFirst ? 'footer' : 'footer divider'}>
          {navigation}
        </div>
      )}
    </div>
  )
}

type WizardContextProps = {
  defaultSteps: Array<StepConfig>
  limit?: number
} & WizardProps

function ContextAwareWizard({
  defaultSteps, limit, ...props
}: WizardContextProps): ReactElement<WizardContextProps> {
  const context = useWizard(defaultSteps, limit)
  const memo = useMemo(() => context, [context])

  return (
    <WizardContext.Provider value={memo}>
      <Wizard {...props} />
    </WizardContext.Provider>
  )
}

export { ContextAwareWizard as Wizard }
