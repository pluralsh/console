import { Dispatch, ReactElement, SetStateAction, createContext } from 'react'

import createIcon from '../icons/createIcon'

import { Step } from './Step'
import { Picker } from './Picker'
import { Installer } from './Installer'

type ContextProps<T = unknown> = {
  steps: Array<StepConfig<T>>
  setSteps: Dispatch<SetStateAction<Array<StepConfig<T>>>>
  active: number
  setActive: Dispatch<number>
  completed: boolean
  setCompleted: Dispatch<boolean>
  limit: number
}

type StepConfig<T = unknown> = {
  key: string
  label?: string
  tooltip?: string
  imageUrl?: string
  Icon?: ReturnType<typeof createIcon>
  isDefault?: boolean
  isPlaceholder?: boolean
  isDependency?: boolean
  isCompleted?: boolean
  isValid?: boolean
  isRequired?: boolean
  node?: ReactElement<typeof Step | typeof Installer | typeof Picker>
  data?: T | null
  dependencyOf?: Set<string>
}

const createWizardContext = <T = any>() => createContext<ContextProps<T>>(null)
const WizardContext = createWizardContext()

export type { ContextProps, StepConfig }
export { WizardContext }
