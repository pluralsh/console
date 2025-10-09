import {
  Flex,
  GearTrainIcon,
  GitPullIcon,
  Modal,
  Stepper,
  StepperSteps,
} from '@pluralsh/design-system'

import { GqlError } from 'components/utils/Alert'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import {
  PrAutomationFragment,
  PrCallAttributes,
  PullRequestFragment,
} from 'generated/graphql'

import { isEmpty } from 'lodash'
import { ComponentProps, Dispatch, useState } from 'react'
import { PrConfigurationFields } from './PrConfigurationFields'
import { usePrAutomationForm } from './prConfigurationUtils'
import { CreatePrActions } from './wizard/CreatePrActions'
import { CreateSuccessPrStep, ReviewPrStep } from './wizard/CreatePrSteps'

export type PrStepKey =
  | 'selectType'
  | 'selectPrAutomation'
  | 'preview'
  | 'config'
  | 'review'
  | 'success'

const steps = [
  { key: 'config', stepTitle: 'Configuration', IconComponent: GearTrainIcon },
  { key: 'review', stepTitle: 'Branch', IconComponent: GitPullIcon },
] as const satisfies StepperSteps

function CreatePrModalBase({
  prAutomation,
  open,
  threadId,
  onClose,
  onSuccess,
  prCallAttributes,
}: {
  prAutomation: PrAutomationFragment
  open: boolean
  threadId?: string
  onClose: Nullable<() => void>
  onSuccess?: Nullable<Dispatch<PullRequestFragment>>
  prCallAttributes?: Nullable<PrCallAttributes>
}) {
  const { configuration, confirmation } = prAutomation
  const hasConfiguration = !isEmpty(configuration)
  const [currentStep, setCurrentStep] = useState<PrStepKey>(
    hasConfiguration ? 'config' : 'review'
  )
  const stepIndex = steps.findIndex((s) => s.key === currentStep)

  const {
    curConfigVals,
    setCurConfigVals,
    configIsValid,
    pageData,
    filteredConfig,
    reviewFormState,
    setReviewFormState,
    allowSubmit,
    successPr,
    createPr,
    createPrLoading,
    createPrError,
  } = usePrAutomationForm({
    prAutomation,
    threadId,
    prCallAttributes,
    onSuccess: () => setCurrentStep('success'),
  })

  return (
    <Modal
      onOpenAutoFocus={(e) => e.preventDefault()}
      asForm
      onSubmit={(e) => {
        e.preventDefault()
        switch (currentStep) {
          case 'config':
            if (configIsValid) setCurrentStep('review')
            return
          case 'review':
            createPr()
        }
      }}
      size="large"
      open={open}
      onClose={() => {
        if (!!successPr) {
          onSuccess?.(successPr)
        }

        onClose?.()
      }}
      header={
        currentStep === 'success'
          ? `Successfully created PR`
          : `Pull request configuration for ${prAutomation?.name}`
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
            pageData,
          }}
        />
      }
    >
      <Flex
        direction="column"
        gap="large"
        minHeight={0}
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
        {createPrError && <GqlError error={createPrError} />}
      </Flex>
    </Modal>
  )
}

export function CreatePrModal(props: ComponentProps<typeof CreatePrModalBase>) {
  return (
    <ModalMountTransition open={props.open}>
      <CreatePrModalBase {...props} />
    </ModalMountTransition>
  )
}
