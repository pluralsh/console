import {
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'
import { isEmpty, isEqual } from 'lodash-es'

import { type ContextProps, type StepConfig, WizardContext } from './context'

const useActive = <T = unknown>() => {
  const ctx = useContext(WizardContext) as ContextProps<T>
  const { steps, setSteps, active: activeIdx } = ctx
  const active = useMemo(() => steps.at(activeIdx), [activeIdx, steps])
  const valid = useMemo(
    () => !active || active.isDefault || active.isValid,
    [active]
  )
  const completed = useMemo(
    () => !!active && !active.isDefault && !!active.isCompleted,
    [active]
  )

  const setValid = useCallback(
    (valid: boolean) => {
      setSteps((steps) => {
        const active = steps.at(activeIdx)

        if (!active || valid === active.isValid) {
          return steps
        }

        const updated = { ...active, isValid: valid } as StepConfig<T>
        const arr = Array.from(steps)

        arr[activeIdx] = updated

        return arr
      })
    },
    [activeIdx, setSteps]
  )

  const setCompleted = useCallback(
    (completed: boolean) => {
      setSteps((steps) => {
        const active = steps.at(activeIdx)

        if (!active || completed === active.isCompleted) {
          return steps
        }

        const updated = { ...active, isCompleted: completed } as StepConfig<T>
        const arr = Array.from(steps)

        arr[activeIdx] = updated

        return arr
      })
    },
    [activeIdx, setSteps]
  )

  const setData = useCallback(
    (data: T) => {
      setSteps((steps) => {
        const active = steps.at(activeIdx)

        if (!active || isEmpty(data) || isEqual(data, active.data)) {
          return steps
        }

        const updated = { ...active, data } as StepConfig<T>
        const arr = Array.from(steps)

        arr[activeIdx] = updated

        return arr
      })
    },
    [activeIdx, setSteps]
  )

  return {
    active,
    setValid,
    setData,
    setCompleted,
    valid,
    completed,
  }
}

const useNavigation = () => {
  const { steps, setSteps, active, setActive, setCompleted } = useContext(
    WizardContext
  ) as ContextProps

  const onNext = useCallback(() => {
    const currentStep = steps.at(active)
    if (!currentStep) return -1
    const idx = steps.findIndex((s) => s.key === currentStep.key)
    let nextIdx = idx + 1

    if (idx < 0) return -1
    if (idx === steps.length - 1) return idx

    while (nextIdx < steps.length && steps.at(nextIdx)?.isPlaceholder) {
      nextIdx++
    }

    if (nextIdx >= steps.length) return idx

    setActive(nextIdx)
  }, [steps, active, setActive])

  const onBack = useCallback(() => {
    const currentStep = steps.at(active)
    if (!currentStep) return -1
    const idx = steps.findIndex((s) => s.key === currentStep.key)
    let prevIdx = idx - 1

    if (idx < 0) return -1
    if (idx === 0) return idx

    while (prevIdx >= 0 && steps.at(prevIdx)?.isPlaceholder) {
      prevIdx--
    }

    if (prevIdx < 0) return idx

    setActive(prevIdx)
  }, [steps, active, setActive])

  const onReset = useCallback(() => {
    setActive(0)
    setCompleted(false)
    setSteps((steps) =>
      steps.filter((step) => step.isDefault || step.isPlaceholder)
    )
  }, [setActive, setSteps, setCompleted])

  const onEdit = useCallback(
    (step: StepConfig) => {
      const idx = steps.findIndex((s) => s.key === step.key)

      if (idx < 0) return

      setActive(idx)
    },
    [setActive, steps]
  )

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
  const { steps, setSteps } = useContext(WizardContext) as ContextProps

  const onSelect = useCallback(
    (elem: StepConfig) => {
      setSteps((steps) => {
        const idx = steps.findIndex((s) => s.label === elem.label)
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
    },
    [setSteps]
  )

  const selected = useMemo(
    () =>
      steps.filter(
        (step) => !step.isDefault && !step.isPlaceholder && !step.isDependency
      ),
    [steps]
  )
  const requiredLength = useMemo(
    () => steps.filter((step) => step.isRequired).length,
    [steps]
  )
  const selectedCount = (selected.length || 0) - requiredLength

  return {
    onSelect,
    selected,
    selectedCount,
  }
}

const useStepper = <T = unknown>() => {
  const { steps } = useContext(WizardContext) as ContextProps<T>
  const selected = useMemo(
    () => steps.filter((step) => !step.isDefault && !step.isPlaceholder),
    [steps]
  )
  const selectedCount = selected?.length || 0

  return {
    selected,
    selectedCount,
  }
}

const useWizard = (
  initialSteps: Array<StepConfig> = [],
  limit = 10
): ContextProps => {
  const [steps, setSteps] = useState<Array<StepConfig>>(initialSteps ?? [])
  const [active, setActive] = useState<number>(0)
  const [completed, setCompleted] = useState<boolean>(false)

  const [prevInitialSteps, setPrevInitialSteps] = useState(initialSteps)

  if (initialSteps !== prevInitialSteps) {
    setPrevInitialSteps(initialSteps)
    setSteps(initialSteps)
  }

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

const subscribeToResize = (onChange: () => void) => {
  window.addEventListener('resize', onChange)

  return () => window.removeEventListener('resize', onChange)
}

const useWindowSize = () => {
  const width = useSyncExternalStore(
    subscribeToResize,
    () => window.innerWidth,
    () => 0
  )
  const height = useSyncExternalStore(
    subscribeToResize,
    () => window.innerHeight,
    () => 0
  )

  return { width, height }
}

export {
  useWizard,
  useNavigation,
  useActive,
  usePicker,
  useStepper,
  useWindowSize,
}
