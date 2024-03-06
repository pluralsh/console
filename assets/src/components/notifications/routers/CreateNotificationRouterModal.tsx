import { ComponentProps, useState } from 'react'
import {
  Button,
  Code,
  FormField,
  GearTrainIcon,
  GitPullIcon,
  LinkoutIcon,
  Modal,
  Stepper,
} from '@pluralsh/design-system'
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
    <div>
      <Body1BoldP as="h2">Title:</Body1BoldP>
      <Body1P css={{ color: theme.colors['text-light'] }}>{pr.title}</Body1P>
    </div>
  )
}

type StepKey = 'config' | 'review' | 'success'
const steps = [
  { key: 'config', stepTitle: 'Configuration', IconComponent: GearTrainIcon },
  { key: 'review', stepTitle: 'Branch', IconComponent: GitPullIcon },
] as const satisfies ({ key: StepKey } & ComponentProps<
  typeof Stepper
>['steps'][number])[]

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
  const [currentStep, setCurrentStep] = useState<StepKey>('config')
  const stepIndex = steps.findIndex((s) => s.key === currentStep)
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
        setCurrentStep('success')
      }
    },
  })
  const { isValid: configIsValid, values: filteredConfig } =
    validateAndFilterConfig(configuration, configVals)
  const allowSubmit = branch && configIsValid

  const configJson = JSON.stringify(
    Object.fromEntries(filteredConfig.map((cfg) => [cfg.name, cfg.value])),
    undefined,
    2
  )

  return (
    <ModalMountTransition open={open}>
      <Modal
        portal
        asForm
        onSubmit={(e) => {
          e.preventDefault()
          switch (currentStep) {
            case 'config':
              if (configIsValid) setCurrentStep('review')

              return
            case 'review':
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
          }
        }}
        open={open}
        onClose={onClose || undefined}
        header={
          currentStep === 'success'
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
            {currentStep === 'success' ? (
              <>
                {successPr && (
                  <Button
                    primary
                    type="button"
                    endIcon={<LinkoutIcon />}
                    as="a"
                    href={successPr?.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View PR
                  </Button>
                )}
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
            ) : currentStep === 'review' ? (
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
                  onClick={() => setCurrentStep('config')}
                >
                  Back
                </Button>
                <Button
                  secondary
                  onClick={() => onClose?.()}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  loading={loading}
                  primary
                  disabled={!configIsValid}
                  type="submit"
                >
                  Next
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
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.large,
          }}
        >
          {currentStep !== 'success' && (
            <div css={{ display: 'flex' }}>
              <Stepper
                compact
                steps={steps}
                stepIndex={stepIndex}
                css={{
                  width: 'max-content',
                }}
              />
            </div>
          )}
          {currentStep === 'config' && (
            <div
              css={{
                display: 'flex',
                flexDirection: 'column',
                gap: theme.spacing.medium,
              }}
            >
              <Body1P>Provide some basic configuration for this PR:</Body1P>
              <PrConfigurationFields
                {...{
                  configuration: prAutomation.configuration,
                  configVals,
                  setConfigVals,
                }}
              />
            </div>
          )}
          {currentStep === 'review' && (
            <div
              css={{
                display: 'flex',
                flexDirection: 'column',
                gap: theme.spacing.medium,
              }}
            >
              <FormField
                label="Configuration review"
                name="configuration"
              >
                <Code
                  language="json"
                  showHeader={false}
                >
                  {configJson || ''}
                </Code>
              </FormField>{' '}
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
              {error && <GqlError error={error} />}
            </div>
          )}
          {currentStep === 'success' && successPr && (
            <CreateSuccess pr={successPr} />
          )}
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
