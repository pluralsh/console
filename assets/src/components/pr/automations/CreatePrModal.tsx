import {
  Button,
  Card,
  Checkbox,
  Code,
  FormField,
  GearTrainIcon,
  GitPullIcon,
  LinkoutIcon,
  Markdown,
  Modal,
  Stepper,
  Input2,
} from '@pluralsh/design-system'
import { ComponentProps, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from 'styled-components'

import {
  PrAutomationFragment,
  PullRequestFragment,
  useCreatePullRequestMutation,
} from 'generated/graphql'

import { PR_QUEUE_ABS_PATH } from 'routes/prRoutesConsts'

import { GqlError } from 'components/utils/Alert'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { Body1BoldP, Body1P } from 'components/utils/typography/Text'

import { PrConfigurationFields } from './PrConfigurationFields'
import { validateAndFilterConfig } from './prConfigurationUtils'
import { isEmpty } from 'lodash'

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
  open,
  onClose,
}: {
  prAutomation: PrAutomationFragment
  open: boolean
  onClose: Nullable<() => void>
}) {
  const configuration = prAutomation.configuration || []
  const hasConfiguration = !isEmpty(configuration)
  const [currentStep, setCurrentStep] = useState<StepKey>(
    hasConfiguration ? 'config' : 'review'
  )
  const stepIndex = steps.findIndex((s) => s.key === currentStep)
  const [configVals, setConfigVals] = useState(
    Object.fromEntries(
      configuration.map((cfg) => [cfg?.name, cfg?.default || ''])
    )
  )
  const [branch, setBranch] = useState<string>('')
  const [identifier, setIdentifier] = useState<string>(
    prAutomation.identifier ?? ''
  )
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

  const configJson = JSON.stringify(
    Object.fromEntries(filteredConfig.map((cfg) => [cfg.name, cfg.value])),
    undefined,
    2
  )

  const { confirmation } = prAutomation
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(
    confirmation?.checklist
      ?.filter((item): item is { label: string } => !!item?.label)
      .reduce((map, item) => {
        map[item.label] = false
        return map
      }, {}) ?? {}
  )
  const allChecked = Object.values(checkedItems).every((v) => v)

  const allowSubmit = branch && configIsValid && allChecked

  return (
    <Modal
      onOpenAutoFocus={(e) => e.preventDefault()}
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
                identifier,
                context: JSON.stringify(
                  Object.fromEntries(
                    filteredConfig.map((cfg) => [cfg.name, cfg.value])
                  )
                ),
              },
            })
        }
      }}
      size="large"
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
              {hasConfiguration && (
                <Button
                  secondary
                  onClick={() => setCurrentStep('config')}
                >
                  Back
                </Button>
              )}
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
        {currentStep !== 'success' && hasConfiguration && (
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
                configuration,
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
            {confirmation?.text && (
              <Card
                css={{
                  padding: theme.spacing.medium,
                  '& :last-child': { margin: 0 },
                }}
              >
                <Markdown text={confirmation.text} />
              </Card>
            )}

            {hasConfiguration && (
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
              </FormField>
            )}
            <FormField
              label="Repository"
              required
              name="repository"
              hint={'Repository slug, i.e. username/infra-repo.'}
            >
              <Input2
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </FormField>
            <FormField
              label="Branch"
              required
              name="branch"
              hint="Pull request source branch name. Avoid using existing branches."
            >
              <Input2
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              />
            </FormField>
            {confirmation?.checklist && (
              <FormField
                label="Ensure the following are done before creating this PR:"
                name="confirmation"
              >
                {Object.entries(checkedItems).map(([label, checked]) => (
                  <Checkbox
                    key={label}
                    checked={checked}
                    onChange={(e) =>
                      setCheckedItems({
                        ...checkedItems,
                        [label]: e.target.checked,
                      })
                    }
                  >
                    {label}
                  </Checkbox>
                ))}
              </FormField>
            )}
            {error && <GqlError error={error} />}
          </div>
        )}
        {currentStep === 'success' && successPr && (
          <CreateSuccess pr={successPr} />
        )}
      </div>
    </Modal>
  )
}

export function CreatePrModal(props: ComponentProps<typeof CreatePrModalBase>) {
  return (
    <ModalMountTransition open={props.open}>
      <CreatePrModalBase {...props} />
    </ModalMountTransition>
  )
}
