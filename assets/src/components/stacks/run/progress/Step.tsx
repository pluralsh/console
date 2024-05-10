import {
  ArrowRightIcon,
  CheckIcon,
  ErrorIcon,
  Spinner,
} from '@pluralsh/design-system'
import { Div, Flex } from 'honorable'
import { ReactNode, useEffect, useMemo, useRef } from 'react'

import { RunStep, StepStatus } from '../../../../generated/graphql'
import CommandLog from '../../../builds/build/progress/CommandLog'

interface StepProps {
  step: RunStep
  follow?: any
}

export default function Step({ step, follow }: StepProps): ReactNode {
  const ref = useRef<any>()
  const command = useMemo(
    () => `${step.cmd} ${step.args?.join(' ')}`,
    [step.args, step.cmd]
  )

  useEffect(() => {
    if (ref && ref.current && follow) ref.current.scrollIntoView()
  }, [follow, ref])

  return (
    <Div ref={ref}>
      <Flex
        gap="small"
        paddingHorizontal="medium"
        paddingVertical="xsmall"
        justify="space-between"
        backgroundColor="fill-two"
        _hover={{ backgroundColor: 'fill-two-hover' }}
      >
        <Flex
          gap="small"
          align="center"
          grow={1}
        >
          <ArrowRightIcon
            size={12}
            paddingRight="small"
          />
          <span>{command}</span>
        </Flex>
        <Status status={step.status} />
      </Flex>
      {step?.logs?.map((l) => (
        <CommandLog
          key={l!.id}
          text={l!.logs}
          follow
        />
      ))}
    </Div>
  )
}

interface StepStatusProps {
  status: StepStatus
}

function Status({ status }: StepStatusProps): ReactNode {
  switch (status) {
    case StepStatus.Pending:
    case StepStatus.Running:
      return <Spinner size={12} />
    case StepStatus.Failed:
      return (
        <ErrorIcon
          color="icon-error"
          cursor="help"
          size={12}
        />
      )
    case StepStatus.Successful:
      return (
        <CheckIcon
          color="icon-success"
          size={12}
        />
      )
  }
}
