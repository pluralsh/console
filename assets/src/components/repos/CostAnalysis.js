import React, { useCallback, useState } from 'react'
import { Box, Layer, Text } from 'grommet'
import { ModalHeader } from 'forge-core'
import { ToolbarItem } from '../Installations'

const MINUTES_MONTH = 60 * 24 * 30

const COST_WIDTH = '75px'

const scale = (amount, scalar) => Math.round(amount * scalar * 100) / 100

function CostItem({name, amount}) {
  return (
    <Box direction='row' gap='xsmall' align='center'>
      <Box fill='horizontal'>
        <Text size='small' weight={500}>{name}</Text>
      </Box>
      <Box flex={false} width={COST_WIDTH} align='end'>
        <Text size='small'>{amount}</Text>
      </Box>
    </Box>
  )
}

function CostBreakdown({cost, setOpen, scalar}) {
  const close = useCallback(() => setOpen(false), [setOpen])
  const miscCost = cost.totalCost - (cost.cpuCost + cost.ramCost + cost.pvCost)
  return (
    <Layer modal onClickOutside={close} onEsc={close}>
      <Box width='40vw'>
        <ModalHeader text='Cost Breakdown' setOpen={setOpen} />
        <Box fill pad='medium' gap='xsmall'>
          <Box gap='small' border={{side: 'bottom'}} pad={{bottom: 'xsmall'}}>
            <CostItem name='cpu cost' amount={scale(cost.cpuCost, scalar)} />
            <CostItem name='memory cost' amount={scale(cost.ramCost, scalar)} />
            <CostItem name='storage cost' amount={scale(cost.pvCost, scalar)} />
            <CostItem name='miscellaneous costs' amount={scale(miscCost, scalar)} />
          </Box>
          <Box direction='row' justify='end'>
            <Box flex={false} width={COST_WIDTH} align='end'>
              <Text size='small' color='cost'>$ {scale(cost.totalCost, scalar)}</Text>
            </Box>
          </Box>
        </Box>
      </Box>
    </Layer>
  )
}

export function CostAnalysis({cost}) {
  const [open, setOpen] = useState(false)
  const scalar = Math.max(MINUTES_MONTH / cost.minutes, 1)
  
  return (
    <>
    <ToolbarItem open={open} onClick={() => setOpen(true)}>
      <Text size='small' color='cost'>$ {scale(cost.totalCost, scalar)}/mo</Text>
    </ToolbarItem>
    {open && <CostBreakdown cost={cost} scalar={scalar} setOpen={setOpen} />}
    </>
  )
}