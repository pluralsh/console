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

export const validateTagName = (name) => {
  const splits = name.split('/')

  if (splits.length > 2) {
    return false
  }
  const key = splits.length === 1 ? splits[0] : splits[1]
  const prefix = splits.length === 1 ? splits[1] : null

  return (
    validateTagValue(key) &&
    key.length >= 1 &&
    (!prefix || (prefix.length <= 253 && !prefix.match(/[/s]/)))
  )
}

export const validateTagValue = (value) =>
  value === '' ||
  (!!value.match(/^[A-Za-z0-9]([-_.]*[A-Za-z0-9])*$/) && value.length <= 63)

function tagsToNameValue<T>(tags: Record<string, T>) {
  return Object.entries(tags).map(([name, value]) => ({
    name,
    value,
  }))
}

export function CreateGlobalServiceModal({
  open,
  onClose,
  refetch,
  serviceDeployment,
}: {
  open: boolean
  onClose: Nullable<() => void>
  refetch: Nullable<() => void>
  serviceDeployment: ServiceDeploymentsRowFragment
}) {
  const theme = useTheme()
  const [name, setName] = useState('')
  const [tags, setTags] = useState<Record<string, string>>({})
  const nameValueTags = useMemo(() => tagsToNameValue(tags), [tags])

  const [mutation, { loading: mutationLoading, error: mutationError }] =
    useCreateGlobalServiceMutation({
      variables: {
        serviceId: serviceDeployment.id,
        attributes: {
          name,
          tags: nameValueTags,
        },
      },
      onCompleted: () => {
        refetch?.()
        onClose?.()
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
              onClose?.()
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
              <TagSelection
                {...{
                  setTags,
                  tags,
                  theme,
                }}
              />
            </FormField>
          </>
        )}
      </div>
      {mutationError && <GqlError error={mutationError} />}
    </ModalAlt>
  )
}

function TagSelection({
  tags,
  setTags,
}: {
  setTags
  tags: Record<string, string>
}) {
  const theme = useTheme()
  const [tagName, setTagName] = useState('')
  const [tagValue, setTagValue] = useState('')
  const tagNameRef = useRef<HTMLInputElement>()
  const tagValueRef = useRef<HTMLInputElement>()
  const sortedTags = useMemo(
    () => sortBy(tagsToNameValue(tags), ['name']),
    [tags]
  )

  const addTag = () => {
    if (validateTagName(tagName) && validateTagValue(tagValue)) {
      setTags({ ...tags, [tagName]: tagValue })
      setTagName('')
      setTagValue('')
      tagNameRef.current?.focus?.()
    }
  }

  return (
    <>
      <div
        css={{
          display: 'flex',
          gap: theme.spacing.small,
          alignItems: 'center',
          '&& > *': { flexShrink: 0, flexGrow: 1 },
        }}
      >
        <Input
          placeholder="Tag name"
          inputProps={{ ref: tagNameRef, maxLength: 63 }}
          value={tagName}
          onChange={(e) => {
            setTagName(
              e.currentTarget.value.trim().replace(/[^a-z0-9A-Z-_./]/, '')
            )
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              tagValueRef.current?.focus?.()
            }
          }}
        />
        <Input
          placeholder="Tag value"
          inputProps={{ ref: tagValueRef, maxLength: 63 }}
          value={tagValue}
          onChange={(e) => {
            setTagValue(
              e.currentTarget.value.trim().replace(/[^a-z0-9A-Z-_.]/, '')
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
      {!isEmpty(sortedTags) && (
        <ChipList
          maxVisible={Infinity}
          chips={sortedTags.map(({ name, value }) => (
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
    </>
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
