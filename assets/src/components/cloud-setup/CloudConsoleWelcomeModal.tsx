import {
  Flex,
  GitHubLogoIcon,
  Modal,
  PlayIcon,
  Stepper,
  StepperSteps,
  TerminalIcon,
} from '@pluralsh/design-system'

import LoadingIndicator from 'components/utils/LoadingIndicator'
import { createContext, ReactNode, Suspense, useMemo, useState } from 'react'
import { AuthenticateStep } from './steps/AuthenticateStep'
import { GitHubSetupStep } from './steps/scm-setup/GitHubSetupStep'
import { LearnStep } from './steps/LearnStep'

export enum CloudWelcomeStep {
  GitHubSetup = 'github-setup',
  Authenticate = 'authenticate',
  Learn = 'learn',
}

export const CloudWelcomeCtx = createContext<{
  setModalActions: (actions: ReactNode) => void
  setStep: (step: CloudWelcomeStep) => void
  setOpen: (open: boolean) => void
}>({
  setModalActions: () => {},
  setStep: () => {},
  setOpen: () => {},
})

export function CloudConsoleWelcomeModal() {
  const [open, setOpen] = useState(true)
  const [modalActions, setModalActions] = useState<ReactNode>(null)
  const [step, setStep] = useState<CloudWelcomeStep>(
    CloudWelcomeStep.GitHubSetup
  )
  const stepIndex = steps.findIndex((s) => s.key === step)

  const ctx = useMemo(
    () => ({ setModalActions, setStep, setOpen }),
    [setModalActions, setStep, setOpen]
  )

  return (
    <Modal
      size="large"
      open={open}
      actions={modalActions}
    >
      <Suspense fallback={<LoadingIndicator />}>
        <Flex
          direction="column"
          gap="large"
        >
          <Stepper
            compact
            stepIndex={stepIndex}
            steps={steps}
          />
          <CloudWelcomeCtx value={ctx}>
            {step === CloudWelcomeStep.GitHubSetup && <GitHubSetupStep />}
            {step === CloudWelcomeStep.Authenticate && <AuthenticateStep />}
            {step === CloudWelcomeStep.Learn && <LearnStep />}
          </CloudWelcomeCtx>
        </Flex>
      </Suspense>
    </Modal>
  )
}

const steps: StepperSteps = [
  {
    key: CloudWelcomeStep.GitHubSetup,
    stepTitle: 'GitHub',
    IconComponent: GitHubLogoIcon,
  },
  {
    key: CloudWelcomeStep.Authenticate,
    stepTitle: 'Authenticate',
    IconComponent: TerminalIcon,
  },
  {
    key: CloudWelcomeStep.Learn,
    stepTitle: 'Learn',
    IconComponent: PlayIcon,
  },
]
