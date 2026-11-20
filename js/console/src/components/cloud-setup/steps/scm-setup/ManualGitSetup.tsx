import { Button, Chip, Flex, StatusIpIcon } from '@pluralsh/design-system'
import { useUpdateState } from 'components/hooks/useUpdateState'
import { sanitizeScmAttributes } from 'components/self-service/pr/scm/CreateScmConnection'
import { ScmConnectionForm } from 'components/self-service/pr/scm/EditScmConnection'
import { Body1P } from 'components/utils/typography/Text'
import {
  ScmConnectionAttributes,
  ScmType,
  useCreateScmConnectionMutation,
} from 'generated/graphql'
import { ScmConnectionDocument } from 'generated/graphql-documents'
import { useTheme } from 'styled-components'

export function ManualSetup() {
  const { spacing } = useTheme()

  const { state: formState, update: updateFormState } =
    useUpdateState<ScmConnectionAttributes>({
      type: ScmType.Github,
      name: 'plural',
    })

  const [createScmConnection, { loading, error }] =
    useCreateScmConnectionMutation({
      variables: { attributes: sanitizeScmAttributes(formState) },
      awaitRefetchQueries: true,
      refetchQueries: [
        { query: ScmConnectionDocument, variables: { name: 'plural' } },
      ],
    })

  const { token, github } = formState
  const allowSubmit = !!(
    token ||
    (github?.appId && github?.privateKey && github?.installationId)
  )

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
        <Chip
          size="large"
          severity="warning"
          icon={<StatusIpIcon />}
        >
          Git connection pending
        </Chip>
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
