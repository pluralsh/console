import { Button, Chip, Flex, StatusIpIcon } from '@pluralsh/design-system'
import {
  CloudWelcomeCtx,
  CloudWelcomeStep,
} from 'components/cloud-setup/CloudConsoleWelcomeModal'
import { useUpdateState } from 'components/hooks/useUpdateState'
import {
  DEFAULT_SCM_ATTRIBUTES,
  sanitizeScmAttributes,
} from 'components/self-service/pr/scm/CreateScmConnection'
import { ScmConnectionForm } from 'components/self-service/pr/scm/EditScmConnection'
import { BasicTextButton } from 'components/utils/typography/BasicTextButton'
import { Body1P } from 'components/utils/typography/Text'
import {
  ScmConnectionAttributes,
  ScmConnectionDocument,
  useCreateScmConnectionMutation,
} from 'generated/graphql'
import { use } from 'react'
import { useTheme } from 'styled-components'

export function ManualSetup() {
  const { spacing } = useTheme()
  const { setStep } = use(CloudWelcomeCtx)

  const { state: formState, update: updateFormState } = useUpdateState<
    Partial<ScmConnectionAttributes>
  >({ ...DEFAULT_SCM_ATTRIBUTES, name: 'plural' })

  const [createScmConnection, { loading, error }] =
    useCreateScmConnectionMutation({
      variables: { attributes: sanitizeScmAttributes(formState) },
      awaitRefetchQueries: true,
      refetchQueries: [
        { query: ScmConnectionDocument, variables: { name: 'plural' } },
      ],
    })

  const { token, github, type } = formState
  const allowSubmit =
    type &&
    (token || (github?.appId && github?.privateKey && github?.installationId))

  return (
    <Flex
      direction="column"
      gap="medium"
    >
      <Body1P>
        {`If you'd rather configure your own Git provider, you can do so below:`}
      </Body1P>
      <ScmConnectionForm
        readOnlyName
        type="create"
        formState={formState}
        updateFormState={updateFormState}
        error={error}
      />
      <Flex
        justify="space-between"
        width="100%"
        marginTop={spacing.xsmall}
      >
        <Flex
          gap="small"
          align="center"
        >
          <Chip
            size="large"
            severity="warning"
            icon={<StatusIpIcon />}
          >
            Git connection pending
          </Chip>
          <BasicTextButton
            onClick={() => setStep(CloudWelcomeStep.Authenticate)}
          >
            Skip
          </BasicTextButton>
        </Flex>
        <Button
          onClick={() => createScmConnection()}
          disabled={!allowSubmit}
          loading={loading}
        >
          Create SCM Connection
        </Button>
      </Flex>
    </Flex>
  )
}
