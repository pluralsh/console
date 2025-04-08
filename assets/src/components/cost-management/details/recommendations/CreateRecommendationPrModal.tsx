import {
  CheckIcon,
  Flex,
  GearTrainIcon,
  GitCommitIcon,
  GitPullIcon,
  Modal,
  Stepper,
  StepperSteps,
} from '@pluralsh/design-system'
import { useState } from 'react'

import { PrAutomationFragment } from 'generated/graphql'

import { GqlError } from 'components/utils/Alert'

import { PrStepKey } from 'components/pr/automations/CreatePrModal'
import { usePrAutomationForm } from 'components/pr/automations/prConfigurationUtils'
import { CreatePrActions } from 'components/pr/automations/wizard/CreatePrActions'
import {
  ConfigPrStep,
  CreateSuccessPrStep,
  ReviewPrStep,
} from 'components/pr/automations/wizard/CreatePrSteps'
import { isEmpty } from 'lodash'
import {
  PreviewPrStep,
  SelectPrAutomationStep,
  SelectPrTypeStep,
} from './CreateRecommendationPrSteps'

export type MethodType = 'pra' | 'aiGen'

const praSteps = [
  {
    key: 'selectType',
    stepTitle: 'Select a PR type',
    IconComponent: GitCommitIcon,
  },
  {
    key: 'selectPrAutomation',
    stepTitle: 'Select a PR automation',
    IconComponent: GitPullIcon,
  },
  { key: 'config', stepTitle: 'Configuration', IconComponent: GearTrainIcon },
  { key: 'review', stepTitle: 'Branch', IconComponent: GitPullIcon },
] as const satisfies StepperSteps

const aiGenSteps = [
  {
    key: 'selectType',
    stepTitle: 'Select a PR type',
    IconComponent: GitCommitIcon,
  },
  {
    key: 'preview',
    stepTitle: 'Preview PR',
    IconComponent: CheckIcon,
  },
] as const satisfies StepperSteps

export function CreateRecommendationPrModal({
  scalingRecId,
  open,
  onClose,
}: {
  scalingRecId: string
  open: boolean
  onClose: Nullable<() => void>
}) {
  const [type, setType] = useState<MethodType>('pra')
  const [selectedPrAutomation, setSelectedPrAutomation] =
    useState<PrAutomationFragment | null>(null)
  const [currentStep, setCurrentStep] = useState<PrStepKey>('selectType')

  const steps = type === 'pra' ? praSteps : aiGenSteps
  const stepIndex = steps.findIndex((s) => s.key === currentStep)
  const nextStep = steps[stepIndex + 1]?.key

  const { configuration, confirmation } = selectedPrAutomation ?? {}
  const hasConfiguration = !isEmpty(configuration)

  const {
    curConfigVals,
    setCurConfigVals,
    configIsValid,
    filteredConfig,
    reviewFormState,
    setReviewFormState,
    allowSubmit,
    successPr,
    createPr,
    createPrLoading,
    createPrError,
  } = usePrAutomationForm({
    prAutomation: selectedPrAutomation,
    onSuccess: () => setCurrentStep('success'),
  })

  return (
    <Modal
      onOpenAutoFocus={(e) => e.preventDefault()}
      asForm
      onSubmit={(e) => {
        e.preventDefault()
        if (!allowSubmit) return
        switch (currentStep) {
          case 'selectType':
            setCurrentStep(nextStep)
            return
          case 'preview':
            console.log('submit preview') // TODO: do what creating a pr currently does in the table
            return
          case 'config':
            if (configIsValid) setCurrentStep('review')
            return
          case 'review':
            createPr()
        }
      }}
      size="large"
      open={open}
      onClose={onClose || undefined}
      header={
        currentStep === 'success'
          ? `Successfully created PR`
          : currentStep === 'selectType' ||
              currentStep === 'preview' ||
              currentStep === 'selectPrAutomation'
            ? `Cost optimization | Create PR`
            : `Pull request configuration for ${selectedPrAutomation?.name}`
      }
      actions={
        <CreatePrActions
          {...{
            currentStep,
            setCurrentStep,
            allowSubmit,
            successPr,
            loading: createPrLoading,
            onClose,
            hasConfiguration,
            configIsValid,
          }}
        />
      }
    >
      <Flex
        direction="column"
        gap="large"
      >
        {currentStep !== 'success' && hasConfiguration && (
          <Flex>
            <Stepper
              compact
              steps={steps}
              stepIndex={stepIndex}
            />
          </Flex>
        )}
        {currentStep === 'selectType' && (
          <SelectPrTypeStep
            type={type}
            setType={setType}
          />
        )}
        {currentStep === 'selectPrAutomation' && <SelectPrAutomationStep />}
        {currentStep === 'config' && (
          <ConfigPrStep
            configuration={configuration}
            configVals={curConfigVals}
            setConfigVals={setCurConfigVals}
          />
        )}
        {currentStep === 'review' && (
          <ReviewPrStep
            confirmation={confirmation}
            filteredConfig={filteredConfig}
            hasConfiguration={hasConfiguration}
            formState={reviewFormState}
            setFormState={setReviewFormState}
          />
        )}
        {currentStep === 'success' && successPr && (
          <CreateSuccessPrStep pr={successPr} />
        )}
        {currentStep === 'preview' && (
          <PreviewPrStep scalingRecId={scalingRecId} />
        )}
        {createPrError && <GqlError error={createPrError} />}
      </Flex>
    </Modal>
  )
}
