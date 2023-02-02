import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import IsEqual from 'lodash/isEqual'
import IsEmpty from 'lodash/isEmpty'

import { ContextProps, StepConfig, WizardContext } from './context'

const useActive = <T = unknown>() => {
  const { steps, setSteps, active: activeIdx } = useContext<ContextProps<T>>(WizardContext)
  const active: StepConfig<T> = useMemo<StepConfig<T>>(() => steps.at(activeIdx), [activeIdx, steps])
  const valid = useMemo(() => active.isDefault || active.isValid, [active])
  const completed = useMemo(() => !active.isDefault && active.isCompleted, [active])

  const setValid = useCallback((valid: boolean) => {
    setSteps(steps => {
      const active = steps.at(activeIdx)

      if (valid === active.isValid) {
        return steps
      }

      const updated = { ...active, isValid: valid } as StepConfig<T>
      const arr = Array.from(steps)

      arr[activeIdx] = updated

      return arr
    })
  }, [activeIdx, setSteps])

  const setCompleted = useCallback((completed: boolean) => {
    setSteps(steps => {
      const active = steps.at(activeIdx)

      if (completed === active.isCompleted) {
        return steps
      }

      const updated = { ...active, isCompleted: completed } as StepConfig<T>
      const arr = Array.from(steps)

      arr[activeIdx] = updated

      return arr
    })
  }, [activeIdx, setSteps])

  const setData = useCallback((data: T) => {
    setSteps(steps => {
      const active = steps.at(activeIdx)

      if (IsEmpty(data) || IsEqual(data, active.data)) {
        return steps
      }

      const updated = { ...active, data } as StepConfig<T>
      const arr = Array.from(steps)

      arr[activeIdx] = updated

      return arr
    })
  }, [activeIdx, setSteps])

  return {
    active, setValid, setData, setCompleted, valid, completed,
  }
}

const useNavigation = () => {
  const {
    steps, setSteps, active, setActive,
    setCompleted,
  } = useContext(WizardContext)

  const onNext = useCallback(() => {
    const currentStep = steps.at(active)
    const idx = steps.findIndex(s => s.key === currentStep.key)
    let nextIdx = idx + 1

    if (idx < 0) return -1
    if (idx === steps.length - 1) return idx

    while (steps.at(nextIdx).isPlaceholder) nextIdx++

    setActive(nextIdx)
  }, [steps, active, setActive])

  const onBack = useCallback(() => {
    const currentStep = steps.at(active)
    const idx = steps.findIndex(s => s.key === currentStep.key)
    let prevIdx = idx - 1

    if (idx < 0) return -1
    if (idx === 0) return idx

    while (steps.at(prevIdx).isPlaceholder) prevIdx--

    setActive(prevIdx)
  }, [steps, active, setActive])

  const onReset = useCallback(() => {
    setActive(0)
    setCompleted(false)
    setSteps(steps => steps.filter(step => step.isDefault || step.isPlaceholder))
  }, [setActive, setSteps, setCompleted])

  const onEdit = useCallback((step: StepConfig) => {
    const idx = steps.findIndex(s => s.key === step.key)

    if (idx < 0) return

    setActive(idx)
  }, [setActive, steps])

  const onReturn = useCallback(() => {
    const last = steps.length - 1

    setActive(last)
  }, [setActive, steps])

  const isFirst = useMemo(() => active === 0, [active])
  const isLast = useMemo(() => active === steps.length - 1, [active, steps])

  return {
    onBack,
    onNext,
    onReset,
    onEdit,
    onReturn,
    isFirst,
    isLast,
  }
}

const usePicker = () => {
  const { steps, setSteps } = useContext(WizardContext)

  const onSelect = useCallback((elem: StepConfig) => {
    setSteps(steps => {
      const idx = steps.findIndex(s => s.label === elem.label)
      const isDependency = steps.at(idx)?.isDependency
      const arr = Array.from(steps)

      if (idx > -1) {
        arr.splice(idx, 1)
      }

      if (idx < 0 || (idx > -1 && isDependency)) {
        arr.splice(-2, 0, elem)
      }

      return arr
    })
  }, [setSteps])

  const selected = useMemo(() => steps.filter(step => !step.isDefault && !step.isPlaceholder && !step.isDependency), [steps])
  const requiredLength = useMemo(() => steps.filter(step => step.isRequired).length, [steps])
  const selectedCount = (selected.length || 0) - requiredLength

  return {
    onSelect,
    selected,
    selectedCount,
  }
}

const useStepper = <T = unknown>() => {
  const { steps } = useContext<ContextProps<T>>(WizardContext)
  const selected = useMemo(() => steps.filter(step => !step.isDefault && !step.isPlaceholder), [steps])
  const selectedCount = selected?.length || 0

  return {
    selected,
    selectedCount,
  }
}

const useWizard = (initialSteps: Array<StepConfig> = [], limit = 10): ContextProps => {
  const [steps, setSteps] = useState<Array<StepConfig>>(initialSteps ?? [])
  const [active, setActive] = useState<number>(0)
  const [completed, setCompleted] = useState<boolean>(false)

  useEffect(() => setSteps(initialSteps), [initialSteps])

  return {
    steps,
    setSteps,
    active,
    setActive,
    completed,
    setCompleted,
    limit,
  }
}

const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: 0,
    height: 0,
  })

  const handleResize = useCallback(() => setWindowSize({
    width: window.innerWidth, height: window.innerHeight,
  }), [])

  useEffect(() => {
    window.addEventListener('resize', handleResize)

    // Call handler right away so state gets updated with initial window size
    handleResize()

    // Remove event listener on cleanup
    return () => window.removeEventListener('resize', handleResize)
  }, [handleResize]) // Empty array ensures that effect is only run on mount

  return windowSize
}

export {
  useWizard, useNavigation, useActive, usePicker, useStepper, useWindowSize,
}
