import {
  Button,
  FormField,
  IconFrame,
  ListBoxItem,
  RestoreIcon,
  Select,
} from '@pluralsh/design-system'
import {
  ServiceDeploymentsRowFragment,
  useRollbackServiceMutation,
  useServiceDeploymentRevisionsQuery,
} from 'generated/graphql'
import styled, { useTheme } from 'styled-components'
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { GqlError } from 'components/utils/Alert'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { mapExistingNodes } from 'utils/graphql'

import moment from 'moment'

import ModalAlt from '../ModalAlt'

export function ServicesRollbackDeployment({
  serviceDeployment,
  refetch,
}: {
  serviceDeployment: ServiceDeploymentsRowFragment
  refetch: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const closeModal = useCallback(() => setIsOpen(false), [])

  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
      }}
    >
      <IconFrame
        clickable
        type="floating"
        tooltip="Rollback"
        icon={<RestoreIcon />}
        onClick={() => {
          setIsOpen(true)
        }}
      />

      <ModalMountTransition open={isOpen}>
        <ModalForm
          open={isOpen}
          serviceDeployment={serviceDeployment}
          refetch={refetch}
          onClose={closeModal}
        />
      </ModalMountTransition>
    </div>
  )
}

const RevisionItemSC = styled(ListBoxItem)(() => ({
  fontVariantNumeric: 'tabular-nums',
}))

export function ModalForm({
  open,
  serviceDeployment,
  onClose,
  refetch,
}: {
  open: boolean
  serviceDeployment: ServiceDeploymentsRowFragment
  onClose: () => void
  refetch: () => void
}) {
  const theme = useTheme()
  const [revisionId, setRevisionId] = useState('')

  const { data, error } = useServiceDeploymentRevisionsQuery({
    variables: { id: serviceDeployment.id },
  })
  const [mutation, { loading: mutationLoading, error: mutationError }] =
    useRollbackServiceMutation({
      variables: {
        id: serviceDeployment.id,
        revisionId,
      },
      onCompleted: () => {
        refetch?.()
        onClose()
      },
    })

  useEffect(() => {
    if (!revisionId && data?.serviceDeployment?.revision?.id) {
      setRevisionId(data.serviceDeployment.revision?.id)
    }
  }, [data?.serviceDeployment?.revision?.id, revisionId])

  const disabled = !data || !serviceDeployment.id || !revisionId
  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (!disabled && !mutationLoading) {
        mutation()
      }
    },
    [disabled, mutationLoading, mutation]
  )

  const inputRef = useRef<HTMLInputElement>()

  useEffect(() => {
    inputRef.current?.focus?.()
  }, [])

  const actions = useMemo(
    () => (
      <>
        <Button
          type="submit"
          disabled={disabled}
          loading={mutationLoading}
          primary
        >
          Roll back
        </Button>
        <Button
          type="button"
          secondary
          onClick={(e) => {
            e.preventDefault()
            onClose()
          }}
        >
          Cancel
        </Button>
      </>
    ),
    [disabled, mutationLoading, onClose]
  )
  const revisions = mapExistingNodes(data?.serviceDeployment?.revisions)

  return (
    <ModalAlt
      header="Rollback service deployment"
      open={open}
      portal
      onClose={onClose}
      asForm
      formProps={{ onSubmit }}
      actions={actions}
    >
      {!data ? (
        error ? (
          <GqlError error={error} />
        ) : (
          <LoadingIndicator />
        )
      ) : (
        <>
          <div
            css={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.xsmall,
            }}
          >
            <FormField label="Select version">
              <Select
                selectedKey={revisionId}
                onSelectionChange={(key) => {
                  setRevisionId(key as any)
                }}
              >
                {(revisions || []).map(({ id, version, insertedAt }) => {
                  const m = moment(insertedAt)
                  const insDateStr = m.format('YYYY/MM/DD, HH:mm:ss')

                  return (
                    <RevisionItemSC
                      key={id}
                      label={`${version} – ${insDateStr}`}
                      textValue={`${version} – ${insDateStr}`}
                    />
                  )
                })}
              </Select>
            </FormField>
          </div>
          {mutationError && (
            <GqlError
              header="Problem updating repository"
              error={mutationError}
            />
          )}
        </>
      )}
    </ModalAlt>
  )
}
