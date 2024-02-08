import { ComponentProps, useState } from 'react'
import { Button, FormField, LinkoutIcon, Modal } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { Link } from 'react-router-dom'
import Input2 from '@pluralsh/design-system/dist/components/Input2'

import {
  PrAutomationFragment,
  PullRequestFragment,
  useCreatePullRequestMutation,
} from 'generated/graphql'

import { PR_QUEUE_ABS_PATH } from 'routes/prRoutesConsts'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { GqlError } from 'components/utils/Alert'
import { Body1BoldP, Body1P } from 'components/utils/typography/Text'

import { validateAndFilterConfig } from './prConfigurationUtils'
import { PrConfigurationFields } from './PrConfigurationFields'

function CreateSuccess({ pr }: { pr: PullRequestFragment }) {
  const theme = useTheme()

  return (
    <>
      <Body1BoldP as="div">Title: </Body1BoldP>
      <Body1P css={{ color: theme.colors['text-light'] }}>{pr.title}</Body1P>
    </>
  )
}

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
  const [successPr, setSuccessPr] = useState<PullRequestFragment>()

  const theme = useTheme()
  const [mutation, { loading, error }] = useCreatePullRequestMutation({
    onCompleted: (data) => {
      if (data.createPullRequest) {
        setSuccessPr(data.createPullRequest)
      }
    },
  })
  const { isValid: configIsValid, values: filteredConfig } =
    validateAndFilterConfig(configuration, configVals)
  const allowSubmit = branch && configIsValid

  return (
    <ModalMountTransition open={open}>
      <Modal
        portal
        asForm
        onSubmit={(e) => {
          e.preventDefault()
          if (successPr) {
            onClose?.()

            return
          }
          mutation({
            variables: {
              id: prAutomation.id,
              branch,
              context: JSON.stringify(
                Object.fromEntries(
                  filteredConfig.map((cfg) => [cfg.name, cfg.value])
                )
              ),
            },
          })
        }}
        open={open}
        onClose={onClose}
        header={
          successPr
            ? `Successfully created PR`
            : `Pull request configuration for ${prAutomation?.name}`
        }
        actions={
          <div
            css={{
              display: 'flex',
              flexDirection: 'row-reverse',
              gap: theme.spacing.small,
            }}
          >
            {successPr ? (
              <>
                <Button
                  primary
                  type="button"
                  endIcon={<LinkoutIcon />}
                  as="a"
                  href={successPr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View PR
                </Button>
                <Button
                  secondary
                  type="button"
                  as={Link}
                  to={PR_QUEUE_ABS_PATH}
                >
                  View all PRs
                </Button>
                <Button
                  secondary
                  type="button"
                  onClick={() => onClose?.()}
                >
                  Close
                </Button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        }
      >
        {successPr ? (
          <CreateSuccess pr={successPr} />
        ) : (
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
        )}
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
