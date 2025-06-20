import {
  Flex,
  GearTrainIcon,
  GitPullIcon,
  Modal,
  Stepper,
  StepperSteps,
} from '@pluralsh/design-system'
import { ComponentProps, useState } from 'react'

import { PrAutomationFragment } from 'generated/graphql'

import { GqlError } from 'components/utils/Alert'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { isEmpty } from 'lodash'
import { usePrAutomationForm } from './prConfigurationUtils'
import { CreatePrActions } from './wizard/CreatePrActions'
import {
  ConfigPrStep,
  CreateSuccessPrStep,
  ReviewPrStep,
} from './wizard/CreatePrSteps'

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
  onClose,
}: {
  prAutomation: PrAutomationFragment
  open: boolean
  onClose: Nullable<() => void>
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
      onClose={onClose || undefined}
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
