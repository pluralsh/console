import {
  Card,
  Checkbox,
  Code,
  Flex,
  FormField,
  Input2,
  Markdown,
} from '@pluralsh/design-system'
import { ComponentPropsWithoutRef } from 'react'
import { useTheme } from 'styled-components'

import { PrAutomationFragment, PullRequestFragment } from 'generated/graphql'

import { Body1BoldP, Body1P } from 'components/utils/typography/Text'

import { PrConfigurationFields } from '../PrConfigurationFields'
import { FilteredPrConfig } from '../prConfigurationUtils'
import { produce } from 'immer'

export function ConfigPrStep({
  configuration,
  configVals,
  setConfigVals,
}: ComponentPropsWithoutRef<typeof PrConfigurationFields>) {
  return (
    <Flex
      direction="column"
      gap="medium"
    >
      <Body1P>Provide some basic configuration for this PR:</Body1P>
      <PrConfigurationFields
        {...{
          configuration,
          configVals,
          setConfigVals,
        }}
      />
    </Flex>
  )
}

export type ReviewPrFormState = {
  identifier: string
  branch: string
  checkedItems: Record<string, boolean>
}

export function ReviewPrStep({
  confirmation,
  filteredConfig,
  hasConfiguration,
  formState,
  setFormState,
}: {
  confirmation: PrAutomationFragment['confirmation']
  filteredConfig: FilteredPrConfig[]
  hasConfiguration: boolean
  formState: ReviewPrFormState
  setFormState: (formState: ReviewPrFormState) => void
}) {
  const { spacing } = useTheme()
  const configJson = JSON.stringify(
    Object.fromEntries(filteredConfig.map((cfg) => [cfg.name, cfg.value])),
    undefined,
    2
  )
  return (
    <Flex
      direction="column"
      gap="medium"
    >
      {confirmation?.text && (
        <Card
          css={{
            padding: spacing.medium,
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
          value={formState.identifier}
          onChange={(e) =>
            setFormState({ ...formState, identifier: e.target.value })
          }
        />
      </FormField>
      <FormField
        label="Branch"
        required
        name="branch"
        hint="Pull request source branch name. Avoid using existing branches."
      >
        <Input2
          value={formState.branch}
          onChange={(e) =>
            setFormState({ ...formState, branch: e.target.value })
          }
        />
      </FormField>
      {confirmation?.checklist && (
        <FormField
          label="Ensure the following are done before creating this PR:"
          name="confirmation"
        >
          {Object.entries(formState.checkedItems).map(([label, checked]) => (
            <Checkbox
              key={label}
              checked={checked}
              onChange={(e) =>
                setFormState(
                  produce(formState, (draft) => {
                    draft.checkedItems[label] = e.target.checked
                  })
                )
              }
            >
              {label}
            </Checkbox>
          ))}
        </FormField>
      )}
    </Flex>
  )
}

export function CreateSuccessPrStep({ pr }: { pr: PullRequestFragment }) {
  const theme = useTheme()

  return (
    <div>
      <Body1BoldP as="h2">Title:</Body1BoldP>
      <Body1P css={{ color: theme.colors['text-light'] }}>{pr.title}</Body1P>
    </div>
  )
}
