import {
  ComponentProps,
  FormEvent,
  useCallback,
  useMemo,
  useState,
} from 'react'

import styled, { useTheme } from 'styled-components'
import {
  Button,
  Chip,
  FormField,
  Input,
  ListBoxItemChipList,
} from '@pluralsh/design-system'

import {
  ServiceDeploymentsRowFragment,
  useCreateGlobalServiceMutation,
} from 'generated/graphql'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'

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
  const [tags, setTags] = useState(new Set<string>())
  const [tagValue, setTagValue] = useState('')
  const sortedTags = useMemo(() => [...tags].sort(), [tags])

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
              <Input
                value={tagValue}
                onChange={(e) => {
                  setTagValue(e.currentTarget.value)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (tagValue) {
                      const nextTags = new Set(tags)

                      nextTags.add(tagValue)
                      setTags(nextTags)
                      setTagValue('')
                    }
                  }
                }}
              />
              {tags.size > 0 && (
                <ChipList
                  maxVisible={Infinity}
                  chips={sortedTags.map((tag) => (
                    <Chip
                      key={tag}
                      size="small"
                      clickable
                      onClick={() =>
                        setTags((prev) => {
                          const next = new Set(prev)

                          next.delete(tag)

                          return next
                        })
                      }
                      closeButton
                    >
                      {tag}
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
