import { Button, Modal } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import isEqual from 'lodash/isEqual'
import uniqWith from 'lodash/uniqWith'
import {
  PrAutomationFragment,
  useUpdatePrAutomationMutation,
} from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import {
  bindingToBindingAttributes,
  FormBindings,
} from 'components/utils/bindings.tsx'
import { GqlError } from 'components/utils/Alert'

import { StepBody } from 'components/cd/ModalAlt'

import {
  Overline,
  PermissionsColumnSC,
} from 'components/cd/utils/PermissionsModal'

export function PrAutomationPermissionsModal({
  prAutomation,
  open,
  onClose,
  refetch,
}: {
  prAutomation: PrAutomationFragment
  open: boolean
  onClose: () => void
  refetch?: () => void
}) {
  const theme = useTheme()
  const { name, id } = prAutomation
  const forLabel = 'PR automation'
  const header = `${forLabel} permissions – ${name}`

  const [createBindings, setCreateBindings] = useState(
    prAutomation.createBindings
  )
  const [writeBindings, setWriteBindings] = useState(prAutomation.writeBindings)

  useEffect(() => {
    setCreateBindings(prAutomation.createBindings)
  }, [prAutomation.createBindings])
  useEffect(() => {
    setWriteBindings(prAutomation.writeBindings)
  }, [prAutomation.writeBindings])

  const uniqueCreateBindings = useMemo(
    () => uniqWith(createBindings, isEqual),
    [createBindings]
  )
  const uniqueWriteBindings = useMemo(
    () => uniqWith(writeBindings, isEqual),
    [writeBindings]
  )
  const [mutation, { loading: mutationLoading, error: mutationError }] =
    useUpdatePrAutomationMutation({
      onCompleted: () => {
        refetch?.()
        onClose()
      },
    })
  const allowSubmit = createBindings && writeBindings

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (id && createBindings && writeBindings) {
        const vars = {
          variables: {
            id,
            attributes: {
              createBindings: createBindings
                ?.filter(isNonNullable)
                .map(bindingToBindingAttributes),
              writeBindings: writeBindings
                ?.filter(isNonNullable)
                .map(bindingToBindingAttributes),
            },
          },
        }

        mutation(vars)
      }
    },
    [id, createBindings, writeBindings, mutation]
  )

  return (
    <Modal
      header={header}
      open={open}
      onClose={onClose}
      onOpenAutoFocus={(e) => e.preventDefault()}
      asForm
      formProps={{ onSubmit }}
      css={{ width: 1024, maxWidth: 1024 }}
      size="custom"
      actions={
        <div
          css={{
            display: 'flex',
            columnGap: theme.spacing.medium,
            flexDirection: 'row-reverse',
          }}
        >
          <Button
            type="submit"
            disabled={!allowSubmit}
            loading={mutationLoading}
            primary
          >
            Save
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
        </div>
      }
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          rowGap: theme.spacing.xlarge,
        }}
      >
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            rowGap: theme.spacing.medium,
          }}
        >
          <StepBody>
            Bind users to read or write permissions for
            {name && (
              <>
                {' '}
                <b>{name}</b> {forLabel}
              </>
            )}
          </StepBody>
        </div>
        {!(writeBindings && createBindings) ? (
          <LoadingIndicator />
        ) : (
          <div css={{ display: 'flex' }}>
            <div
              css={{
                width: '50%',
                paddingRight: theme.spacing.large,
                borderRight: theme.borders['fill-two'],
              }}
            >
              <PermissionsColumnSC>
                <Overline>Create PR permissions</Overline>
                <FormBindings
                  bindings={uniqueCreateBindings}
                  setBindings={setCreateBindings}
                  hints={{
                    user: 'Users who can create PRs with this automation',
                    group: 'Groups who can create PRs with this automation',
                  }}
                />
              </PermissionsColumnSC>
            </div>
            <div css={{ width: '50%', paddingLeft: theme.spacing.large }}>
              <PermissionsColumnSC>
                <Overline>Update Automation permissions</Overline>
                <FormBindings
                  bindings={uniqueWriteBindings}
                  setBindings={setWriteBindings}
                  hints={{
                    user: 'Users who can update this automation',
                    group: 'Groups who can update this automation',
                  }}
                />
              </PermissionsColumnSC>
            </div>
          </div>
        )}
        {mutationError && <GqlError error={mutationError} />}
      </div>
    </Modal>
  )
}
