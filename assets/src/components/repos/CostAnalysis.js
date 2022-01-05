import React, { useCallback, useMemo, useState } from 'react'
import { Box, Layer, Stack, Text } from 'grommet'
import { ModalHeader, Check } from 'forge-core'
import { ToolbarItem } from '../Installations'
import { ResponsiveRadar } from '@nivo/radar'
import { COLOR_MAP } from '../utils/Graph'
import { sum } from 'lodash'

const MINUTES_MONTH = 60 * 24 * 30

const round = (v) => Math.round(v * 100) / 100

const scale = (amount, scalar) => round(amount * scalar)

function CostRadar({cost, scalar}) {
  const data = useMemo(() => {
    const miscCost = cost.totalCost - (cost.cpuCost + cost.ramCost + cost.pvCost)
    return [
      {dim: 'cpu', cost: scale(cost.cpuCost, scalar)},
      {dim: 'memory', cost: scale(cost.ramCost, scalar)},
      {dim: 'storage', cost: scale(cost.pvCost, scalar)},
      {dim: 'miscellaneous', cost: scale(miscCost, scalar)}
    ]
  }, [cost, scalar])

  const total = round(sum(data.map(({cost}) => cost)))

  return (
    <Box height='250px' pad='small'>
      <Stack anchor='top-left' pad='small' >
        <Box height='250px'>
          <ResponsiveRadar
            data={data}
            keys={['cost']}
            indexBy="dim"
            valueFormat={val => `$${Number(val).toLocaleString('en-US', {minimumFractionDigits: 2})}`}
            margin={{ top: 50, right: 50, bottom: 50, left: 50 }}
            borderColor={{ from: 'color' }}
            dotBorderWidth={2}
            fillOpacity={.7}
            gridLevels={3}
            isInteractive={true}
            dotSize={3}
            dotBorderWidth={2}
            tooltipFormat={val => `$${Number(val).toLocaleString('en-US', {minimumFractionDigits: 2})}`}
            colors={COLOR_MAP} />
        </Box>
        <Box direction='row' gap='xsmall' align='center'>
          <Text size='small' weight={500}>Kubernetes Cost</Text>
          <Text size='small' color='cost'>${total}</Text>
        </Box>
      </Stack>
    </Box>
  )
}


function PlanFeature({feature: {name, description}}) {
  return (
    <Box direction='row' gap='small' align='center'>
      <Check size='small' color='brand' />
      <Box>
        <Text size='small'>{name}</Text>
        <Text size='small'><i>{description}</i></Text>
      </Box>
    </Box>
  )
}

function PlanLimits({limits}) {
  return (
    <Box gap='1px' border={{side: 'between'}}>
      {Object.entries(limits).map(([name, val]) => (
        <Box direction='row' align='center' gap='small'>
          <Text size='small' weight={500}>{name}</Text>
          <Text size='small'>{val}</Text>
        </Box>
      ))}
    </Box>
  )
}

function PluralCost({license}) {
  const {status: plural} = license  
  return (
    <Box pad='small' gap='small'>
      <Text size='small' weight={500}>Plural Cost</Text>
      <Text size='small' weight={500}>{plural.plan || 'Free'} Plan</Text>
      {plural.features && (
        <Box gap='xsmall'>
          {plural.features.map((feature) => <PlanFeature key={feature.name} feature={feature} />)}
        </Box>
      )}
      {plural.limits && <PlanLimits limits={license.limits} />}
    </Box>
  )
}

export function CostBreakdown({cost, license}) {
  const scalar = cost ? Math.max(MINUTES_MONTH / cost.minutes, 1) : 1

  return (
    <Box gap='xsmall' direction='row' border='between'>
      {license && <Box width='30%'><PluralCost license={license} /></Box>}
      {cost && <Box width='70%'><CostRadar cost={cost} scalar={scalar} /></Box>}
    </Box>
  )
}

export function CostAnalysis({cost, license}) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [setOpen])
  
  return (
    <>
    <ToolbarItem open={open} onClick={() => setOpen(true)}>
      <Text size='small' weight={500}>Cost Breakdown</Text>
    </ToolbarItem>
    {open && (
      <Layer modal onClickOutside={close} onEsc={close}>
        <Box width='40vw'>
          <ModalHeader text='Cost Breakdown' setOpen={setOpen} />
          <CostBreakdown  license={license} cost={cost} />
        </Box>
      </Layer>
    )}
    </>
  )
}