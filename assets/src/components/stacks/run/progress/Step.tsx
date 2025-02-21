import {
  CaretDownIcon,
  CaretRightIcon,
  CheckIcon,
  ErrorIcon,
  Flex,
  Spinner,
} from '@pluralsh/design-system'
import { Div } from 'honorable'
import sortBy from 'lodash/sortBy'
import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  RunLogs,
  RunStep,
  StepStatus,
  useLogsDeltaSubscription,
} from '../../../../generated/graphql'
import CommandLog from '../../../utils/CommandLog.tsx'
import styled from 'styled-components'

interface StepProps {
  step: RunStep
  open?: boolean
}

export default function Step({ step, open }: StepProps): ReactNode {
  const ref = useRef<HTMLDivElement>(undefined)

  const [folded, setFolded] = useState<boolean | undefined>(undefined)
  const [logs, setLogs] = useState(step?.logs as Array<RunLogs>)
  const show = folded === undefined ? open && logs.length > 0 : !folded

  const command = useMemo(
    () => `${step.cmd} ${step.args?.join(' ')}`,
    [step.args, step.cmd]
  )

  const toLogsString = useCallback(
    (logs: Array<RunLogs>) =>
      sortBy(logs ?? [], ['insertedAt'])
        .map((l) => l!.logs)
        .join(''),
    []
  )

  useLogsDeltaSubscription({
    skip: step.status !== StepStatus.Running,
    variables: { id: step.id },
    onData: ({ data: { data } }) =>
      setLogs(
        (logs) => [...logs, data?.runLogsDelta?.payload] as Array<RunLogs>
      ),
  })

  useEffect(() => {
    setLogs(step?.logs as Array<RunLogs>)
  }, [step?.logs])

  useEffect(() => {
    if (open) {
      ref?.current?.scrollIntoView({ block: 'end' })
    }
  }, [open, ref])

  return (
    <Div ref={ref}>
      <TriggerSC
        $hasLogs={logs.length > 0}
        onClick={() => logs.length > 0 && setFolded(!(folded ?? !open))}
      >
        <Flex
          gap="small"
          align="center"
          grow={1}
        >
          {!show ? (
            <CaretRightIcon
              size={12}
              paddingRight="small"
            />
          ) : (
            <CaretDownIcon
              size={12}
              paddingRight="medium"
            />
          )}
          <span>{command}</span>
        </Flex>
        <Status status={step.status} />
      </TriggerSC>
      {show && (
        <CommandLog
          text={toLogsString(logs)}
          follow={step.status === StepStatus.Running}
        />
      )}
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
      return (
        <Spinner
          size={12}
          css={{ alignSelf: 'center' }}
        />
      )
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

const TriggerSC = styled.div<{ $hasLogs: boolean }>(({ theme, $hasLogs }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  gap: theme.spacing.small,
  fontFamily: 'Monument Mono',
  padding: `${theme.spacing.xsmall}px ${theme.spacing.large}px`,
  backgroundColor: theme.colors['fill-two'],
  '&:hover': {
    backgroundColor: $hasLogs ? theme.colors['fill-two-hover'] : 'none',
  },
  position: 'sticky',
  top: 0,
  cursor: $hasLogs ? 'pointer' : 'cursor',
}))
