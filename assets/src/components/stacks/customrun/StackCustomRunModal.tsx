import {
  DryRunIcon,
  Modal,
  RocketIcon,
  Stepper,
  StepperSteps,
} from '@pluralsh/design-system'
import { CustomStackRunFragment, StackFragment } from 'generated/graphql'
import { useState } from 'react'
import styled from 'styled-components'

import { StackCustomRunChooseTemplate } from './StackCustomRunChooseTemplate'
import { StackCustomRunCommands } from './StackCustomRunCommands'
import { StackCustomRunSettings } from './StackCustomRunSettings'

export default function StackCustomRunModal({
  open,
  onClose,
  stack,
}: {
  open: boolean
  onClose: () => void
  stack: StackFragment
}) {
  const [step, setStep] = useState<StepName>(StepName.ChooseTemplate)
  const [type, setType] = useState<'manual' | 'prebaked'>('manual')

  const [selectedCustomRun, setSelectedCustomRun] =
    useState<CustomStackRunFragment | null>(null)

  const stepIndex = steps.findIndex((s) => s.key === step)

  return (
    <Modal
      size="large"
      scrollable={false}
      header={
        <ModalHeaderSC>
          create custom run
          <Stepper
            stepIndex={stepIndex}
            steps={steps}
          />
        </ModalHeaderSC>
      }
      open={open}
      onClose={onClose}
    >
      {step === StepName.ChooseTemplate && (
        <StackCustomRunChooseTemplate
          stackId={stack.id ?? ''}
          setType={setType}
          setStep={setStep}
          setSelectedCustomRun={setSelectedCustomRun}
        />
      )}
      {step === StepName.Settings &&
        (type === 'manual' ? (
          <StackCustomRunCommands
            stackId={stack.id ?? ''}
            setStep={setStep}
            onClose={onClose}
          />
        ) : type === 'prebaked' && selectedCustomRun ? (
          <StackCustomRunSettings
            customRun={selectedCustomRun}
            stackId={stack.id ?? ''}
            setStep={setStep}
            onClose={onClose}
          />
        ) : null)}
    </Modal>
  )
}

export enum StepName {
  ChooseTemplate = 'choose-template',
  Settings = 'settings',
  Commands = 'commands',
}

const stepBase = {
  circleSize: 32,
  iconSize: 16,
}

export const steps: StepperSteps = [
  {
    key: StepName.ChooseTemplate,
    IconComponent: DryRunIcon,
    ...stepBase,
  },
  { key: StepName.Settings, IconComponent: RocketIcon, ...stepBase },
]

const ModalHeaderSC = styled.header(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  marginBottom: -theme.spacing.xsmall,
}))
