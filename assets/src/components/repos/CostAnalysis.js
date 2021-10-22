import React, { useCallback, useState } from 'react'
import { Box, Layer, Text } from 'grommet'
import { ModalHeader, Tabs, TabContent, TabHeader, TabHeaderItem, Check } from 'forge-core'
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

function KubernetesCost({cost, scalar}) {
  const miscCost = cost.totalCost - (cost.cpuCost + cost.ramCost + cost.pvCost)

  return (
    <Box fill pad='small'>
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
    <Box fill pad='small' gap='small'>
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

function CostBreakdown({cost, license, setOpen, scalar}) {
  const close = useCallback(() => setOpen(false), [setOpen])
  
  return (
    <Layer modal onClickOutside={close} onEsc={close}>
      <Box width='40vw'>
        <ModalHeader text='Cost Breakdown' setOpen={setOpen} />
        <Box fill pad='medium' gap='xsmall'>
          <Tabs defaultTab={cost ? 'k8s' : 'plural'}>
            <TabHeader>
              <TabHeaderItem name='plural'>
                <Text size='small' weight={500}>Plural</Text>
              </TabHeaderItem>
              {cost && (
                <TabHeaderItem name='k8s'>
                  <Text size='small' weight={500}>Kubernetes</Text>
                </TabHeaderItem>
              )}
            </TabHeader>
            <TabContent name='plural'>
              {license && <PluralCost license={license} />}
            </TabContent>
            {cost && (
              <TabContent name='k8s'>
                <KubernetesCost cost={cost} scalar={scalar} />
              </TabContent>
            )}
          </Tabs>
        </Box>
      </Box>
    </Layer>
  )
}

export function CostAnalysis({cost, license}) {
  const [open, setOpen] = useState(false)
  const scalar = cost ? Math.max(MINUTES_MONTH / cost.minutes, 1) : 1
  
  return (
    <>
    <ToolbarItem open={open} onClick={() => setOpen(true)}>
      <Text size='small' weight={500}>Cost Breakdown</Text>
    </ToolbarItem>
    {open && (
      <CostBreakdown 
        license={license} 
        cost={cost} 
        scalar={scalar} 
        setOpen={setOpen} />
    )}
    </>
  )
}