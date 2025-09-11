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
import { ComponentProps, useState } from 'react'

import {
  PrAutomationFragment,
  useApplyScalingRecommendationMutation,
} from 'generated/graphql'

import { GqlError } from 'components/utils/Alert'

import { PrStepKey } from 'components/self-service/pr/automations/CreatePrModal'
import { usePrAutomationForm } from 'components/self-service/pr/automations/prConfigurationUtils'
import { CreatePrActions } from 'components/self-service/pr/automations/wizard/CreatePrActions'
import {
  CreateSuccessPrStep,
  ReviewPrStep,
} from 'components/self-service/pr/automations/wizard/CreatePrSteps'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { isEmpty } from 'lodash'
import {
  PreviewPrStep,
  SelectPrAutomationStep,
  SelectPrTypeStep,
} from './CreateRecommendationPrSteps'
import { PrConfigurationFields } from 'components/self-service/pr/automations/PrConfigurationFields'

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

function CreateRecommendationPrModalBase({
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
  let stepIndex = -1
  steps.forEach((step, i) =>
    step.key === currentStep ? (stepIndex = i) : (step.collapseTitle = true)
  )
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
    successPr: successPraPr,
    createPr: createPraPr,
    createPrLoading: createPraPrLoading,
    createPrError: createPraPrError,
  } = usePrAutomationForm({
    prAutomation: selectedPrAutomation,
    onSuccess: () => setCurrentStep('success'),
  })

  const [
    createAiGenPr,
    { data, loading: createAiPrLoading, error: createAiPrError },
  ] = useApplyScalingRecommendationMutation({
    variables: { id: scalingRecId },
    onCompleted: () => setCurrentStep('success'),
  })
  const successAiPr = data?.applyScalingRecommendation

  const successPr = successPraPr || successAiPr
  const createPrLoading = createPraPrLoading || createAiPrLoading
  const createPrError = createPraPrError || createAiPrError

  return (
    <Modal
      onOpenAutoFocus={(e) => e.preventDefault()}
      asForm
      onSubmit={(e) => {
        e.preventDefault()
        switch (currentStep) {
          case 'selectType':
            setCurrentStep(nextStep)
            return
          case 'config':
            if (configIsValid) setCurrentStep('review')
            return
          case 'preview':
            createAiGenPr()
            return
          case 'review':
            createPraPr()
        }
      }}
      size="auto"
      css={{ maxWidth: 1024, minWidth: 608 }}
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
            isScalingRec: true,
          }}
        />
      }
    >
      <Flex
        direction="column"
        gap="large"
        overflow="hidden"
        maxHeight={400}
      >
        {currentStep !== 'success' && (
          <Flex>
            <Stepper
              compact
              steps={steps.map((step) => ({
                ...step,
                collapseTitle: step.key !== currentStep,
              }))}
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
        {currentStep === 'selectPrAutomation' && (
          <SelectPrAutomationStep
            selectFn={(prAutomation) => {
              setSelectedPrAutomation(prAutomation)
              setCurrentStep('config')
            }}
          />
        )}
        {currentStep === 'config' && (
          <PrConfigurationFields
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

export function CreateRecommendationPrModal(
  props: ComponentProps<typeof CreateRecommendationPrModalBase>
) {
  return (
    <ModalMountTransition open={props.open}>
      <CreateRecommendationPrModalBase {...props} />
    </ModalMountTransition>
  )
}
