import {
  ComponentProps,
  FormEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'
import sortBy from 'lodash/sortBy'

import styled, { useTheme } from 'styled-components'
import {
  Button,
  Chip,
  FormField,
  IconFrame,
  Input,
  ListBoxItemChipList,
  PlusIcon,
} from '@pluralsh/design-system'

import {
  ServiceDeploymentsRowFragment,
  useCreateGlobalServiceMutation,
} from 'generated/graphql'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import isEmpty from 'lodash/isEmpty'

import ModalAlt, { StepBody, StepH } from '../ModalAlt'

const ChipList = styled(ListBoxItemChipList)(({ theme }) => ({
  marginTop: theme.spacing.small,
  justifyContent: 'start',
}))

export function CreateGlobalServiceModal({
  open,
  onClose,
  refetch,
  serviceDeployment,
}: {
  open: boolean
  onClose: () => void
  refetch: () => void
  serviceDeployment: ServiceDeploymentsRowFragment
}) {
  const theme = useTheme()
  const [name, setName] = useState('')
  const [tags, setTags] = useState<Record<string, string>>({})
  const [tagName, setTagName] = useState('')
  const [tagValue, setTagValue] = useState('')
  const nameValueTags = useMemo(
    () =>
      sortBy(
        Object.entries(tags).map(([name, value]) => ({
          name,
          value,
        })),
        ['name']
      ),
    [tags]
  )
  const tagNameRef = useRef<HTMLInputElement>()
  const tagValueRef = useRef<HTMLInputElement>()

  const [mutation, { loading: mutationLoading, error: mutationError }] =
    useCreateGlobalServiceMutation({
      variables: {
        serviceId: serviceDeployment.id,
        attributes: {
          name,
        },
      },
      onCompleted: () => {
        refetch?.()
        onClose()
      },
    })

  const allowCreate = false

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()

      if (allowCreate) {
        mutation()
      }
    },
    [allowCreate, mutation]
  )

  const initialLoading = false

  const addTag = () => {
    if (tagName) {
      setTags({ ...tags, [tagName]: tagValue })
      setTagName('')
      setTagValue('')
      tagNameRef.current?.focus?.()
    }
  }

  return (
    <ModalAlt
      header="Create global service"
      open={open}
      portal
      onClose={onClose}
      asForm
      formProps={{ onSubmit }}
      actions={
        <>
          <Button
            type="submit"
            disabled={!allowCreate}
            loading={mutationLoading}
            primary
          >
            Create
          </Button>
          <Button
            secondary
            type="button"
            onClick={(e) => {
              e.preventDefault()
              onClose()
            }}
          >
            Cancel
          </Button>
        </>
      }
    >
      <div
        css={{
          paddingBottom: theme.spacing.large,
          display: 'flex',
          flexDirection: 'column',
          rowGap: theme.spacing.medium,
        }}
      >
        {initialLoading ? (
          <LoadingIndicator />
        ) : (
          <>
            <StepBody>
              Global services will be automatically replicated across clusters.
              Clusters will be selected based on the tags and provider specified
              (leave either blank if you don't want to filter on them).
            </StepBody>
            <StepBody>
              <StepH css={{ display: 'inline' }}>Service:</StepH>{' '}
              {serviceDeployment.name}
            </StepBody>
            <FormField
              required
              label="Global service name"
            >
              <Input
                value={name}
                placeholder="Name"
                onChange={(e) => {
                  setName(e.currentTarget.value)
                }}
              />
            </FormField>
            <FormField label="Cluster tags">
              <div
                css={{
                  display: 'flex',
                  gap: theme.spacing.small,
                  alignItems: 'center',
                  '&& > *': { flexShrink: 0, flexGrow: 1 },
                }}
              >
                <Input
                  placeholder="Name"
                  inputProps={{ ref: tagNameRef }}
                  value={tagName}
                  onChange={(e) => {
                    setTagName(
                      e.currentTarget.value
                        .trim()
                        .replace(/[^a-z0-9A-Z-_./]/, '')
                    )
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      tagValueRef.current?.focus?.()
                    }
                  }}
                />
                <Input
                  placeholder="Value"
                  inputProps={{ ref: tagValueRef }}
                  value={tagValue}
                  onChange={(e) => {
                    setTagValue(
                      e.currentTarget.value
                        .trim()
                        .replace(/[^a-z0-9A-Z-_.]/, '')
                    )
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                />
                <IconFrame
                  css={{ '&&': { flexGrow: 0 } }}
                  type="secondary"
                  tooltip="Add tag"
                  size="medium"
                  clickable
                  icon={<PlusIcon />}
                  onClick={() => {
                    addTag()
                  }}
                />
              </div>
              {!isEmpty(nameValueTags) && (
                <ChipList
                  maxVisible={Infinity}
                  chips={nameValueTags.map(({ name, value }) => (
                    <Chip
                      key={name}
                      size="small"
                      clickable
                      onClick={() => {
                        setTags((prev) => {
                          const next = { ...prev }

                          delete next[name]

                          return next
                        })
                      }}
                      closeButton
                    >
                      {name}: {value}
                    </Chip>
                  ))}
                />
              )}
            </FormField>
          </>
        )}
      </div>
      {mutationError && <GqlError error={mutationError} />}
    </ModalAlt>
  )
}

export function CreateGlobalService(
  props: ComponentProps<typeof CreateGlobalServiceModal>
) {
  return (
    <ModalMountTransition open={props.open}>
      <CreateGlobalServiceModal {...props} />
    </ModalMountTransition>
  )
}
