import { Button } from '@pluralsh/design-system'

import { useTheme } from 'styled-components'

import { FormState, stepperSteps } from './CreateStackModal'

export default function CreateStackModalActions({
  formState,
  setFormState,
  currentStepIndex,
  initialFormValid,
  repoFormValid,
  environmentFormValid,
  filesFormValid,
  jobFormValid,
  close,
  submit,
  loading,
}: {
  formState: FormState
  setFormState: (formState: FormState) => void
  currentStepIndex: number
  initialFormValid: boolean
  repoFormValid: boolean
  environmentFormValid: boolean
  filesFormValid: boolean
  jobFormValid: boolean
  close: () => void
  submit: () => void
  loading: boolean
}) {
  const theme = useTheme()

  return (
    <div css={{ display: 'flex', gap: theme.spacing.medium }}>
      <Button
        secondary
        onClick={() => close()}
      >
        Cancel
      </Button>

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

      {formState === FormState.Initial && (
        <Button
          type="submit"
          disabled={!initialFormValid}
          onClick={() => setFormState(FormState.Repository)}
        >
          Select repository
        </Button>
      )}

      {formState === FormState.Repository && (
        <Button
          type="submit"
          disabled={!repoFormValid}
          onClick={() => setFormState(FormState.Environment)}
        >
          Setup environment
        </Button>
      )}

      {formState === FormState.Environment && (
        <Button
          type="submit"
          disabled={!environmentFormValid}
          onClick={() => setFormState(FormState.Files)}
        >
          Setup files
        </Button>
      )}

      {formState === FormState.Files && (
        <Button
          type="submit"
          secondary
          disabled={!filesFormValid}
          onClick={() => setFormState(FormState.Job)}
        >
          Setup job
        </Button>
      )}

      {(formState === FormState.Job || formState === FormState.Files) && (
        <Button
          type="submit"
          disabled={!jobFormValid || !filesFormValid}
          onClick={() => submit()}
          loading={loading}
        >
          Create
        </Button>
      )}
    </div>
  )
}
