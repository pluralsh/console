import { Button, CodeEditor } from '@pluralsh/design-system'

import { useState } from 'react'

import { parseScript } from 'utils/cmdLineParse'

import { useTheme } from 'styled-components'

import {
  StackRunsDocument,
  StackRunsQuery,
  useCreateOnDemandRunMutation,
} from 'generated/graphql'
import { appendConnection, updateCache } from 'utils/graphql'

import { GqlError } from 'components/utils/Alert'

import { ModalActionsSC } from './StackCustomRunSettings'
import { StepName } from './StackCustomRunModal'

export function StackCustomRunCommands({
  stackId,
  setStep,
  onClose,
}: {
  stackId: string
  setStep: (step: StepName) => void
  onClose: () => void
}) {
  const theme = useTheme()
  const [script, setScript] = useState('')

  const [mutation, { loading, error }] = useCreateOnDemandRunMutation({
    variables: {
      stackId,
      commands: parseScript(script),
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

  return (
    <div css={{ height: '100%', overflow: 'auto' }}>
      <CodeEditor
        value={script}
        language="shell"
        onChange={setScript}
        height={300}
      />
      {error && (
        <div css={{ marginTop: theme.spacing.small }}>
          <GqlError error={error} />
        </div>
      )}

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
            onClick={() => mutation()}
            loading={loading}
          >
            Create custom run
          </Button>
        </div>
      </ModalActionsSC>
    </div>
  )
}
