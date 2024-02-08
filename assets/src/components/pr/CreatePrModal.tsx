import { ComponentProps, useState } from 'react'
import { Button, FormField, Modal } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import {
  PrAutomationFragment,
  useCreatePullRequestMutation,
} from 'generated/graphql'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { GqlError } from 'components/utils/Alert'
import Input2 from '@pluralsh/design-system/dist/components/Input2'

import { validateAndFilterConfig } from './prConfigurationUtils'
import { PrConfigurationFields } from './PrConfigurationFields'

function CreatePrModalBase({
  prAutomation,
  // refetch,
  open,
  onClose,
}: {
  prAutomation: PrAutomationFragment
  // eslint-disable-next-line react/no-unused-prop-types
  refetch: Nullable<() => void>
  open: boolean
  onClose: Nullable<() => void>
}) {
  const configuration = prAutomation.configuration || []
  const [configVals, setConfigVals] = useState(
    Object.fromEntries(
      configuration.map((cfg) => [cfg?.name, cfg?.default || ''])
    )
  )
  const [branch, setBranch] = useState<string>('')

  const theme = useTheme()
  const [mutation, { loading, error }] = useCreatePullRequestMutation({
    onCompleted: () => {
      onClose?.()
    },
  })
  const { isValid: configIsValid, values: filteredConfig } =
    validateAndFilterConfig(configuration, configVals)
  const allowSubmit = branch && configIsValid

  console.log('validationRes', configIsValid, filteredConfig)

  return (
    <ModalMountTransition open={open}>
      <Modal
        portal
        asForm
        onSubmit={(e) => {
          e.preventDefault()
          mutation({
            variables: {
              id: prAutomation.id,
              branch,
              context: JSON.stringify(filteredConfig),
            },
          })
        }}
        open={open}
        onClose={onClose}
        header={`Pull request configuration for ${prAutomation?.name}`}
        actions={
          <div
            css={{
              display: 'flex',
              flexDirection: 'row-reverse',
              gap: theme.spacing.small,
            }}
          >
            <Button
              loading={loading}
              primary
              disabled={!allowSubmit}
              type="submit"
            >
              Create
            </Button>
            <Button
              secondary
              onClick={() => onClose?.()}
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
            gap: theme.spacing.medium,
          }}
        >
          <FormField
            label="Branch"
            required
            name="branch"
          >
            <Input2
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            />
          </FormField>
          <PrConfigurationFields
            {...{
              configuration: prAutomation.configuration,
              configVals,
              setConfigVals,
            }}
          />
          {error && <GqlError error={error} />}
        </div>
      </Modal>
    </ModalMountTransition>
  )
}

export function CreatePrModal(props: ComponentProps<typeof CreatePrModalBase>) {
  return (
    <ModalMountTransition open={props.open}>
      <CreatePrModalBase {...props} />
    </ModalMountTransition>
  )
}
