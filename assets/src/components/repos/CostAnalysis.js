import React, { useCallback, useState } from 'react'
import { Box, Layer, Text } from 'grommet'
import { ModalHeader } from 'forge-core'
import { ToolbarItem } from '../Installations'

const MINUTES_MONTH = 60 * 24 * 30

function CostItem({name, amount}) {
  return (
    <Box direction='row' gap='xsmall' align='center'>
      <Box fill='horizontal'>
        <Text size='small' weight={500}>{name}</Text>
      </Box>
      <Box flex={false} width='100px'>
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
      <Box width='50vw'>
        <ModalHeader text='Cost Breakdown' setOpen={setOpen} />
        <Box fill pad='small' gap='xsmall'>
          <Box gap='xsmall' border={{side: 'bottom'}}>
            <CostItem name='cpu' amount={scalar * cost.cpuCost} />
            <CostItem name='mem' amount={scalar * cost.cpuCost} />
            <CostItem name='storage' amount={scalar * cost.pvcCost} />
            <CostItem name='misc' amount={scalar * miscCost} />
          </Box>
          <Box direction='row' justify='end'>
            <Box flex={false} width='100px'>
              <Text size='small' color='success'>$ {cost.totalCost * scalar}</Text>
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
      <Text size='small' color='success'>$ {scalar * cost.totalCost}/mo</Text>
    </ToolbarItem>
    {open && <CostBreakdown cost={cost} scalar={scalar} setOpen={setOpen} />}
    </>
  )
}