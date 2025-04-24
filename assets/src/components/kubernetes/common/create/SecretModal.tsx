import { Dispatch, ReactNode, SetStateAction, useEffect, useState } from 'react'
import {
  Button,
  FormField,
  Input,
  ListBoxItem,
  Modal,
  Select,
} from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'
import {
  DeployFromInputMutation,
  useDeployFromInputMutation,
} from '../../../../generated/graphql-kubernetes.ts'
import { KubernetesClient } from '../../../../helpers/kubernetes.client.ts'
import { useParams } from 'react-router-dom'
import { useNamespaces } from '../../Cluster.tsx'
import { DeleteIconButton } from '../../../utils/IconButtons.tsx'
import { EditableDiv } from '../../../utils/EditableDiv.tsx'
import { SecretType, ToSecretYaml } from './common.ts'
import { ApolloError, FetchResult } from '@apollo/client'
import { GqlError } from '../../../utils/Alert.tsx'
import { GraphQLError } from 'graphql'
import { GraphQLErrors } from '@apollo/client/errors'
import { OperationVariables } from '@apollo/client/core'
import { Partial } from 'react-spring'

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
  refetch?: (variables?: Partial<OperationVariables>) => Promise<unknown>
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

  // TODO: add support for more secret types
  const secretTypes = [SecretType.Opaque]

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

  const onComplete = (data: FetchResult<DeployFromInputMutation>) => {
    const error = data.data?.handleDeployFromFile?.error
    if (error) {
      setError(error)
      setCreating(false)
      return
    }

    if (!refetch) {
      setCreating(false)
      setOpen(false)
      onCreate?.(name, namespace)
      return
    }

    refetch({ fetchPolicy: 'no-cache' })
      .then(() => {
        onCreate?.(name, namespace)
        setOpen(false)
      })
      .finally(() => setCreating(false))
  }

  useEffect(() => {
    setYaml(ToSecretYaml(name, namespace, type, data))
    setValid(!!name && !!namespace && data.some((d) => d.key))
  }, [name, namespace, type, data])

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
          submit={() => deploy().then(onComplete)}
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
              setType(key as SecretType)
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
        />
        <Button
          width="fit-content"
          small
          secondary
          onClick={() => setData([...data, { key: '', value: '' }])}
        >
          Add entry
        </Button>
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

  [key: string]: any
}

function DataFormFieldUnstyled({
  data,
  setData,
  ...props
}: DataFormFieldProps) {
  return (
    <FormField
      label="Data"
      required
    >
      <div {...props}>
        {data.map((entry, index) => (
          <DataEntry
            index={index}
            data={data}
            setData={setData}
            entry={entry}
          />
        ))}
      </div>
    </FormField>
  )
}

const DataEntry = styled(DataEntryUnstyled)(({ theme }) => ({
  display: 'flex',
  gap: '16px',
  flexDirection: 'column',

  '.inputContainer': {
    display: 'flex',
    gap: theme.spacing.medium,
    flexDirection: 'row',

    '> div': {
      width: '100%',
    },
  },

  '.textArea': {
    padding: `${theme.spacing.xsmall}px ${theme.spacing.medium}px`,
    border: theme.borders.input,
    borderRadius: theme.borderRadiuses.medium,
    backgroundColor: theme.colors['fill-two'],
    '&:focus': {
      border: theme.borders['outline-focused'],
    },
    maxHeight: '176px',
  },
}))

function DataEntryUnstyled({
  index,
  entry,
  data,
  setData,
  ...props
}): ReactNode {
  return (
    <div
      key={index}
      {...props}
    >
      <div className="inputContainer">
        <Input
          placeholder="Key"
          value={entry.key}
          onChange={(e) => {
            const newData = [...data]
            newData[index].key = e.target.value
            setData(newData)
          }}
        />
        <DeleteIconButton
          size="large"
          onClick={() => {
            const newData = [...data]
            newData.splice(index, 1)
            setData(newData)
          }}
        />
      </div>

      <div>
        <EditableDiv
          className="textArea"
          placeholder="Value"
          setValue={(val) => {
            const newData = [...data]
            newData[index].value = val
            setData(newData)
          }}
          initialValue={entry.value}
        />
      </div>
    </div>
  )
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
        error={
          {
            graphQLErrors: [
              { message: errorMessage } as GraphQLError,
            ] as GraphQLErrors,
          } as ApolloError
        }
        header={errorHeader}
      />
    </div>
  )
}
