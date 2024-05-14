import { Button } from '@pluralsh/design-system'

import { FormState, stepperSteps } from './CreateStack'

export default function CreateStackActions({
  formState,
  setFormState,
  currentStepIndex,
  initialFormValid,
  repoFormValid,
  close,
  submit,
  loading,
}: {
  formState: FormState
  setFormState: (formState: FormState) => void
  currentStepIndex: number
  initialFormValid: boolean
  repoFormValid: boolean
  close: () => void
  submit: () => void
  loading: boolean
}) {
  return (
    <>
      {formState === FormState.Initial && (
        <Button
          type="submit"
          disabled={!initialFormValid}
          onClick={() => setFormState(FormState.Repository)}
          marginLeft="medium"
        >
          Select repository
        </Button>
      )}

      {formState === FormState.Repository && (
        <Button
          type="submit"
          disabled={!repoFormValid}
          onClick={() => setFormState(FormState.Environment)}
          marginLeft="medium"
        >
          Setup environment
        </Button>
      )}

      {formState === FormState.Environment && (
        <Button
          type="submit"
          onClick={() => submit()}
          loading={loading}
          marginLeft="medium"
        >
          Create
        </Button>
      )}

      {currentStepIndex > 0 && (
        <Button
          secondary
          type="button"
          onClick={(e) => {
            e.preventDefault()
            setFormState(stepperSteps[currentStepIndex - 1]?.key)
          }}
        >
          Go back
        </Button>
      )}

      <Button
        secondary
        onClick={() => close()}
      >
        Cancel
      </Button>
    </>
  )
}
