import React, { useCallback, useState } from 'react'
import { Tabs, TabHeader, TabHeaderItem, TabContent, Button, ModalHeader } from 'forge-core'
import { useQuery } from '@apollo/react-hooks'
import { SCALING_RECOMMENDATION } from './queries'
import { LoopingLogo } from '../utils/AnimatedLogo'
import { MetadataRow } from './Metadata'
import { Box, Layer, Text } from 'grommet'
import filesize from 'filesize'

const POLL_INTERVAL = 10000

const mem = (memory) => filesize(parseInt(memory))

function RecommendationNub({text, value}) {
  return (
    <Box direction='row' align='center' gap='xsmall'>
      <Text size='small' weight={500}>{text}</Text>
      <Text size='small'>{value}</Text>
    </Box>
  )
}

function Recommendation({rec: {cpu, memory}}) {
  return (
    <Box gap='2px' border={{side: 'left'}} pad={{horizontal: 'small'}}>
      <RecommendationNub text='cpu' value={cpu} />
      <RecommendationNub text='memory' value={mem(memory)} />
    </Box>
  )
}

function ScalingRecommendations({recommendations}) {
  return (
    <Box flex={false} pad='small'>
      <Tabs defaultTab={recommendations[0].containerName}>
        <TabHeader>
          {recommendations.map(({containerName}) => (
            <TabHeaderItem key={containerName} name={containerName}>
              <Text size='small' weight={500}>{containerName}</Text>
            </TabHeaderItem>
          ))}
        </TabHeader>
        {recommendations.map((recommendation) => (
          <TabContent key={recommendation.containerName} name={recommendation.containerName}>
            <Box pad='small'>
              <MetadataRow name='lower bound'>
                <Recommendation rec={recommendation.lowerBound} />
              </MetadataRow>
              <MetadataRow name='upper bound'>
                <Recommendation rec={recommendation.upperBound} />
              </MetadataRow>
              <MetadataRow name='target'>
                <Recommendation rec={recommendation.uncappedTarget} />
              </MetadataRow>
            </Box>
          </TabContent>
        ))}
      </Tabs>
    </Box>
  )
}

export function ScalingRecommender({kind, name, namespace}) {
  const {data} = useQuery(SCALING_RECOMMENDATION, {
    variables: {kind, name, namespace},
    pollInterval: POLL_INTERVAL
  })

  console.log(data)

  const recommendations = data?.scalingRecommendation?.status?.recommendation?.containerRecommendations
  console.log(recommendations)

  return (
    <Box fill='horizontal' style={{minHeight: '250px', overflow: 'auto'}}>
      {recommendations ? <ScalingRecommendations recommendations={recommendations} /> : 
                         <LoopingLogo />}
    </Box>
  )
}

export function ScalingRecommenderModal({kind, name, namespace}) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [setOpen])

  return (
    <>
    <Button label='Scaling' onClick={() => setOpen(true)} />
    {open && (
      <Layer onClickOutside={close} onEsc={close}>
        <Box width='50vw'>
          <ModalHeader text='Recommendations' setOpen={setOpen} />
          <ScalingRecommender kind={kind} name={name} namespace={namespace} />
        </Box>
      </Layer>
    )}
    </>
  )
}