import {
  CheckIcon,
  Flex,
  GearTrainIcon,
  GitCommitIcon,
  GitPullIcon,
  Modal,
  Stepper,
  StepperSteps,
  WorkbenchIcon,
} from '@pluralsh/design-system'
import { ComponentProps, useState } from 'react'

import {
  ClusterScalingRecommendationFragment,
  PrAutomationFragment,
  WorkbenchJobFragment,
  useApplyScalingRecommendationMutation,
} from 'generated/graphql'

import {
  SendToWorkbenchForm,
  useWorkbenchOptions,
} from 'components/ai/insights/SendInsightToWorkbench'
import { GqlError } from 'components/utils/Alert'
import { WorkbenchStartedJobPanel } from 'components/workbenches/common/WorkbenchStartedJobPanel'

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
import {
  buildScalingRecommendationWorkbenchPrompt,
  ScalingRecommendationCluster,
} from './scalingRecommendationWorkbenchPrompt'

export type MethodType = 'pra' | 'aiGen' | 'workbench'
type RecommendationStepKey = PrStepKey | 'workbench'

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

const workbenchSteps = [
  {
    key: 'workbench',
    stepTitle: 'Send to workbench',
    IconComponent: WorkbenchIcon,
  },
] as const satisfies StepperSteps

function CreateRecommendationPrModalBase({
  scalingRecId,
  cluster,
  recommendation,
  startWithWorkbench,
  open,
  onClose,
}: {
  scalingRecId: string
  cluster: ScalingRecommendationCluster
  recommendation: ClusterScalingRecommendationFragment
  startWithWorkbench: boolean
  open: boolean
  onClose: Nullable<() => void>
}) {
  const [type, setType] = useState<MethodType>(
    startWithWorkbench ? 'workbench' : 'pra'
  )
  const [selectedPrAutomation, setSelectedPrAutomation] =
    useState<PrAutomationFragment | null>(null)
  const [currentStep, setCurrentStep] = useState<RecommendationStepKey>(
    startWithWorkbench ? 'workbench' : 'selectType'
  )
  const [workbenchJob, setWorkbenchJob] = useState<WorkbenchJobFragment | null>(
    null
  )
  const [workbenchPrompt, setWorkbenchPrompt] = useState(() =>
    buildScalingRecommendationWorkbenchPrompt(cluster, recommendation)
  )
  const { hasWorkbenches } = useWorkbenchOptions()

  const steps =
    type === 'pra' ? praSteps : type === 'aiGen' ? aiGenSteps : workbenchSteps
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
    pageData,
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
      asForm={currentStep !== 'workbench'}
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
            return
        }
      }}
      size="auto"
      css={{ maxWidth: 1024, minWidth: 608 }}
      open={open}
      onClose={onClose || undefined}
      header={
        currentStep === 'workbench'
          ? `Cost optimization | Send to workbench`
          : currentStep === 'success'
            ? `Successfully created PR`
            : currentStep === 'selectType' ||
                currentStep === 'preview' ||
                currentStep === 'selectPrAutomation'
              ? `Cost optimization | Create PR`
              : `Pull request configuration for ${selectedPrAutomation?.name}`
      }
      actions={
        currentStep !== 'workbench' && (
          <CreatePrActions
            {...{
              currentStep,
              setCurrentStep: setCurrentStep as (step: PrStepKey) => void,
              allowSubmit,
              successPr,
              loading: createPrLoading,
              onClose,
              hasConfiguration,
              configIsValid,
              isScalingRec: true,
              pageData,
            }}
          />
        )
      }
    >
      <Flex
        direction="column"
        gap="large"
        overflow="hidden"
        maxHeight={400}
      >
        {currentStep !== 'success' && currentStep !== 'workbench' && (
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
            hasWorkbenches={hasWorkbenches}
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
            pageData={pageData}
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
        {currentStep === 'workbench' &&
          (workbenchJob ? (
            <WorkbenchStartedJobPanel
              initialJob={workbenchJob}
              jobId={workbenchJob.id}
              workbenchId={workbenchJob.workbench?.id ?? ''}
            />
          ) : (
            <SendToWorkbenchForm
              prompt={workbenchPrompt}
              promptKey={0}
              setPrompt={setWorkbenchPrompt}
              setWorkbenchJob={setWorkbenchJob}
            />
          ))}
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
