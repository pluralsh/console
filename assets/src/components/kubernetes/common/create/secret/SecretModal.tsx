import { ApolloError, FetchResult, LazyQueryExecFunction } from '@apollo/client'
import {
  Button,
  FormField,
  Input,
  ListBoxItem,
  Modal,
  Select,
} from '@pluralsh/design-system'
import { useNamespaces } from 'components/kubernetes/Cluster'
import { GqlError } from 'components/utils/Alert'
import {
  DeployFromInputMutation,
  SecretsQuery,
  SecretsQueryVariables,
  useDeployFromInputMutation,
} from 'generated/graphql-kubernetes'
import { KubernetesClient } from 'helpers/kubernetes.client'
import { Dispatch, ReactNode, SetStateAction, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { SecretType, ToSecretYaml } from './common'
import { SecretBasicAuthForm } from './type/BasicAuth.tsx'
import { SecretOpaqueForm } from './type/Opaque'
import { SecretServiceAccountForm } from './type/ServiceAccount'
import { SecretSSHForm } from './type/SSH'

const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
  margin-right: 8px;
`

interface CreateSecretModalProps {
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
  refetch?: LazyQueryExecFunction<SecretsQuery, SecretsQueryVariables>
  onCreate?: (name: string, namespace: string) => void
}

export function CreateSecretModal({
  open,
  setOpen,
  refetch,
  onCreate,
}: CreateSecretModalProps) {
  const { clusterId } = useParams()
  const namespaces = useNamespaces()

  const [yaml, setYaml] = useState('')
  const [valid, setValid] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [namespace, setNamespace] = useState('')
  const [type, setType] = useState<SecretType>(SecretType.Opaque)
  const [data, setData] = useState([{ key: '', value: '' }])
  const [error, setError] = useState<string>()
  const [serviceAccount, setServiceAccount] = useState('')

  const secretTypes = Object.values(SecretType)

  const [deploy] = useDeployFromInputMutation({
    client: KubernetesClient(clusterId ?? ''),
    variables: {
      input: {
        name,
        namespace,
        validate: true,
        content: yaml,
      },
    },
    onError: (error) => {
      setCreating(false)
      setError(error.message)
    },
  })

  const onComplete = (result: FetchResult<DeployFromInputMutation>) => {
    const apolloError = result?.errors as unknown as ApolloError
    const responseError =
      apolloError?.cause?.['result'] ?? result.data?.handleDeployFromFile?.error
    if (responseError) {
      setError(responseError)
      setCreating(false)
      return
    }

    if (!refetch) {
      setCreating(false)
      setOpen(false)
      onCreate?.(name, namespace)
      return
    }

    refetch({
      context: {
        headers: {
          'Cache-Control': 'no-cache',
        },
      },
    })
      .then(() => {
        onCreate?.(name, namespace)
        setOpen(false)
      })
      .finally(() => setCreating(false))
  }

  useEffect(() => {
    setYaml(
      ToSecretYaml({
        name,
        namespace,
        type,
        serviceAccount,
        data,
      })
    )
    setValid((valid) => valid && !!name && !!namespace)
  }, [name, namespace, type, data, serviceAccount])

  return (
    <Modal
      header="Create secret"
      open={open}
      onClose={() => setOpen(false)}
      css={{
        width: '600px',
      }}
      size="auto"
      actions={
        <Actions
          creating={creating}
          setCreating={setCreating}
          setOpen={setOpen}
          valid={valid}
          submit={() => {
            deploy().then(onComplete, console.log)
          }}
        />
      }
    >
      <FormContainer>
        {error && (
          <ErrorContainer
            errorMessage={error}
            errorHeader="Something went wrong"
          />
        )}
        <FormField
          label="Name"
          required
        >
          <Input
            placeholder="my-secret"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
            }}
            required
          />
        </FormField>
        <FormField
          label="Namespace"
          required
        >
          <Select
            label="Select namespace"
            selectedKey={namespace}
            onSelectionChange={(key) => {
              setNamespace(key as string)
            }}
          >
            {namespaces.map((ns) => (
              <ListBoxItem
                key={ns}
                label={ns}
                textValue={ns}
              />
            ))}
          </Select>
        </FormField>
        <FormField
          label="Type"
          required
        >
          <Select
            label="Select type"
            selectedKey={type}
            onSelectionChange={(key) => {
              if ((key as SecretType) !== type) {
                setType(key as SecretType)
                setData([{ key: '', value: '' }])
              }
            }}
          >
            {secretTypes.map((type) => (
              <ListBoxItem
                key={type}
                label={type}
                textValue={type}
              />
            ))}
          </Select>
        </FormField>
        <DataFormField
          data={data}
          setData={setData}
          serviceAccount={serviceAccount}
          setServiceAccount={setServiceAccount}
          setValid={setValid}
          type={type}
        />
      </FormContainer>
    </Modal>
  )
}

interface ActionsProps {
  setOpen: Dispatch<SetStateAction<boolean>>
  setCreating: Dispatch<SetStateAction<boolean>>
  creating: boolean
  valid: boolean
  submit: Dispatch<void>
}

function Actions({
  setOpen,
  setCreating,
  creating,
  valid,
  submit,
}: ActionsProps): ReactNode {
  return (
    <>
      <Button
        type="button"
        secondary
        onClick={() => setOpen(false)}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        onClick={() => {
          setCreating(true)
          submit()
        }}
        loading={creating}
        disabled={!valid}
        marginLeft="medium"
      >
        Create
      </Button>
    </>
  )
}

const DataFormField = styled(DataFormFieldUnstyled)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
}))

interface DataFormFieldProps {
  data: { key: string; value: string }[]
  setData: Dispatch<SetStateAction<{ key: string; value: string }[]>>
  serviceAccount: string
  setServiceAccount: Dispatch<SetStateAction<string>>
  setValid: Dispatch<SetStateAction<boolean>>
  type: SecretType

  [key: string]: any
}

function DataFormFieldUnstyled({
  data,
  setData,
  serviceAccount,
  setServiceAccount,
  setValid,
  type,
  ...props
}: DataFormFieldProps) {
  switch (type) {
    case SecretType.ServiceAccountToken:
      return (
        <FormField
          label="Service Account"
          required
        >
          <SecretServiceAccountForm
            serviceAccount={serviceAccount}
            setServiceAccount={setServiceAccount}
            setValid={setValid}
          />
        </FormField>
      )
    case SecretType.BasicAuth:
      return (
        <FormField
          label="Basic auth"
          required
        >
          <div {...props}>
            <SecretBasicAuthForm
              data={data}
              setData={setData}
              setValid={setValid}
            />
          </div>
        </FormField>
      )
    case SecretType.SSH:
      return (
        <FormField
          label="SSH Private Key"
          required
        >
          <div {...props}>
            <SecretSSHForm
              data={data}
              setData={setData}
              setValid={setValid}
            />
          </div>
        </FormField>
      )
    case SecretType.Opaque:
    default:
      return (
        <FormField
          label="Data"
          required
        >
          <div {...props}>
            <SecretOpaqueForm
              data={data}
              setData={setData}
              setValid={setValid}
            />
            <Button
              width="fit-content"
              small
              secondary
              onClick={() => setData([...data, { key: '', value: '' }])}
            >
              Add entry
            </Button>
          </div>
        </FormField>
      )
  }
}

function ErrorContainer({
  errorHeader,
  errorMessage,
}: {
  errorHeader: string
  errorMessage: string
}) {
  const theme = useTheme()

  return (
    <div
      css={{
        marginBottom: theme.spacing.large,
      }}
    >
      <GqlError
        error={errorMessage}
        header={errorHeader}
      />
    </div>
  )
}
