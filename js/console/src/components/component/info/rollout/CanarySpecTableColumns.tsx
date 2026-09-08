import {
  BrowserIcon,
  Button,
  Card,
  Chip,
  Code,
  Flex,
  Modal,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { ArgoStrategyStep } from 'generated/graphql'
import { useState } from 'react'
import styled from 'styled-components'

import { Body1BoldP } from 'components/utils/typography/Text'

const columnHelper = createColumnHelper<ArgoStrategyStep>()

function StepTypeChip({ step }: { step: ArgoStrategyStep }) {
  let type = 'scale'

  if (step.analysis) type = 'analysis'
  else if (step.experiment) type = 'experiment'
  else if (step.pause) type = 'pause'

  return <Chip css={{ width: 'fit-content' }}>{type}</Chip>
}

const ColType = columnHelper.accessor((step) => step, {
  id: 'type',
  header: 'Type',
  cell: function Cell({ getValue }) {
    return <StepTypeChip step={getValue()} />
  },
})

const ColWeight = columnHelper.accessor(
  (step) => (step.setWeight ? `${step.setWeight}%` : ''),
  {
    id: 'weight',
    header: 'Weight',
  }
)
const ColPause = columnHelper.accessor((step) => step.pause?.duration, {
  id: 'pause',
  header: 'Pause Duration',
})

const ColConfiguration = columnHelper.accessor((step) => step, {
  id: 'configuration',
  header: 'Configuration',
  cell: function Cell({ getValue }) {
    const [open, setOpen] = useState(false)

    return (
      <>
        <Button
          css={{ width: 'max-content' }}
          floating
          onClick={() => setOpen(true)}
        >
          <Flex gap="small">
            <BrowserIcon size={16} />
            Show JSON
          </Flex>
        </Button>
        <Modal
          header="Canary rollout strategy"
          size="large"
          open={open}
          onClose={() => setOpen(false)}
        >
          <CanarySpecModalInner step={getValue()} />
        </Modal>
      </>
    )
  },
})

function CanarySpecModalInner({ step }: { step: ArgoStrategyStep }) {
  return (
    <ModalInnerWrapper>
      <ModalHeaderCard>
        <ModalHeaderCardTitle>Type</ModalHeaderCardTitle>
        <StepTypeChip step={step} />
      </ModalHeaderCard>
      <ModalHeaderCard>
        <ModalHeaderCardTitle>Weight</ModalHeaderCardTitle>
        <Body1BoldP>{step.setWeight ? `${step.setWeight}%` : ''}</Body1BoldP>
      </ModalHeaderCard>
      <ModalHeaderCard>
        <ModalHeaderCardTitle>Pause duration</ModalHeaderCardTitle>
        <Body1BoldP>{step.pause?.duration ?? ''}</Body1BoldP>
      </ModalHeaderCard>
      <Code
        language="json"
        css={{ gridColumn: '1/-1' }}
      >
        {JSON.stringify(
          step.analysis?.templates || step.experiment?.templates || '',
          null,
          2
        )}
      </Code>
    </ModalInnerWrapper>
  )
}

const ModalHeaderCard = styled(Card).attrs({ fillLevel: 2 })(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  padding: theme.spacing.medium,
}))
const ModalHeaderCardTitle = styled.h4(({ theme }) => ({
  ...theme.partials.text.overline,
  color: theme.colors['text-xlight'],
}))
const ModalInnerWrapper = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gridTemplateRows: 'auto 1fr',
  gap: theme.spacing.large,
}))

export const canarySpecCols = [ColType, ColWeight, ColPause, ColConfiguration]
