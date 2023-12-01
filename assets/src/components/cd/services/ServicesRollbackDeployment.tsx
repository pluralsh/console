import {
  Button,
  IconFrame,
  Modal,
  RestoreIcon,
  Table,
} from '@pluralsh/design-system'
import {
  ServiceDeploymentRevisionFragment,
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

import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'

import { StepBody } from '../ModalAlt'

import { selectableColumns } from './ServiceRevisionColumns'

export function ServicesRollbackDeployment({
  serviceDeployment,
  refetch,
}: {
  serviceDeployment: ServiceDeploymentsRowFragment
  refetch: (() => void) | undefined
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

const ModalSC = styled(Modal)((_) => ({
  '&&, && > *, && > * > *': {
    display: 'flex',
    height: '100%',
    overflow: 'hidden',
    flexDirection: 'column',
  },
}))

export function ModalForm({
  open,
  serviceDeployment,
  onClose,
  refetch,
}: {
  open: boolean
  serviceDeployment: ServiceDeploymentsRowFragment
  onClose: Nullable<() => void>
  refetch: Nullable<() => void>
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
        onClose?.()
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
      <div
        css={{
          display: 'flex',
          width: '100%',
          flexDirection: 'row-reverse',
          gap: theme.spacing.medium,
          justifyContent: 'flex-start',
        }}
      >
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
            onClose?.()
          }}
        >
          Cancel
        </Button>
      </div>
    ),
    [disabled, mutationLoading, onClose, theme.spacing.medium]
  )
  const revisions = mapExistingNodes(data?.serviceDeployment?.revisions)

  return (
    <ModalSC
      header="Roll back service deployment"
      open={open}
      portal
      onClose={onClose}
      asForm
      formProps={{ onSubmit }}
      width={960}
      maxWidth={900}
      minWidth={100}
    >
      {!data ? (
        error ? (
          <GqlError error={error} />
        ) : (
          <LoadingIndicator />
        )
      ) : (
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.large,
            overflow: 'hidden',
          }}
        >
          <div
            css={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.xsmall,
              overflow: 'hidden',
            }}
          >
            <StepBody>
              Select a revision to roll back to from the list below.
            </StepBody>
            <FullHeightTableWrap>
              <Table
                data={revisions}
                columns={selectableColumns}
                css={{
                  maxHeight: 'unset',
                  height: '100%',
                }}
                onRowClick={(e, row) => {
                  const original =
                    row.original as ServiceDeploymentRevisionFragment

                  setRevisionId(original.id)
                }}
                reactTableOptions={{
                  enableRowSelection: true,
                  state: { rowSelection: { [revisionId]: true } },
                }}
              />
            </FullHeightTableWrap>
          </div>
          {mutationError && (
            <GqlError
              header="Problem updating repository"
              error={mutationError}
            />
          )}
          {actions}
        </div>
      )}
    </ModalSC>
  )
}
