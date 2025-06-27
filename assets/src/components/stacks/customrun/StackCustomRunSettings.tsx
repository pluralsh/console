import { Button } from '@pluralsh/design-system'
import {
  CustomStackRunFragment,
  StackCommand,
  StackRunsDocument,
  StackRunsQuery,
  useCreateOnDemandRunMutation,
} from 'generated/graphql'

import { FormEvent, useMemo, useState } from 'react'

import { PrConfigurationFields } from 'components/self-service/pr/automations/PrConfigurationFields'

import styled, { useTheme } from 'styled-components'

import { appendConnection, updateCache } from 'utils/graphql'

import { GqlError } from 'components/utils/Alert'

import { StepName } from './StackCustomRunModal'

export function StackCustomRunSettings({
  customRun,
  stackId,
  setStep,
  onClose,
}: {
  customRun: CustomStackRunFragment
  stackId: string
  setStep: (step: StepName) => void
  onClose: () => void
}) {
  const theme = useTheme()
  const configuration = customRun.configuration || []
  const [configVals, setConfigVals] = useState(
    Object.fromEntries(
      configuration.map((cfg) => [cfg?.name, cfg?.default || ''])
    )
  )

  const commands = useMemo(
    () =>
      customRun.commands
        ?.filter<StackCommand>(
          (command): command is StackCommand => command != null
        )
        .map(({ args, cmd }) => ({ args, cmd })) ?? [],
    [customRun.commands]
  )

  const [mutation, { loading, error }] = useCreateOnDemandRunMutation({
    variables: {
      stackId,
      commands,
      context: JSON.stringify(configVals),
    },
    onCompleted: () => onClose(),
    update: (cache, { data }) => {
      updateCache(cache, {
        variables: {
          id: stackId,
        },
        query: StackRunsDocument,
        update: (prev: StackRunsQuery) => ({
          infrastructureStack: appendConnection(
            prev.infrastructureStack,
            data?.onDemandRun,
            'runs'
          ),
        }),
      })
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    mutation()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.medium,
        }}
      >
        <PrConfigurationFields
          {...{
            configuration,
            configVals,
            setConfigVals,
          }}
        />
        {error && <GqlError error={error} />}
      </div>
      <ModalActionsSC>
        <Button
          secondary
          onClick={onClose}
        >
          Cancel
        </Button>
        <div css={{ display: 'flex', gap: theme.spacing.medium }}>
          <Button
            secondary
            onClick={() => setStep(StepName.ChooseTemplate)}
          >
            Back
          </Button>
          <Button
            type="submit"
            loading={loading}
          >
            Create custom run
          </Button>
        </div>
      </ModalActionsSC>
    </form>
  )
}

export const ModalActionsSC = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: theme.spacing.xlarge,
}))
