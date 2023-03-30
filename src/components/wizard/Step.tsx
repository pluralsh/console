import { ReactElement, useEffect } from 'react'
import styled from 'styled-components'

import { useActive } from './hooks'

type StepProps<T = unknown> = {
  children: ReactElement | ReactElement[]
  valid: boolean
  data: T
}

const Step = styled(UnstyledStep)(() => ({
  height: '100%',
  minHeight: '200px',
  overflow: 'auto',
}))

function UnstyledStep<T = unknown>({
  valid,
  data,
  children,
  ...props
}: StepProps<T>): ReactElement<StepProps<T>> {
  const { active, setValid, setData } = useActive()

  useEffect(
    () =>
      !active.isDefault && !active.isPlaceholder ? setValid(valid) : undefined,
    [valid, setValid, active]
  )
  useEffect(() => setData(data), [data, setData])

  return <div {...props}>{children}</div>
}

export type { StepProps }
export { Step }
