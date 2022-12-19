import { useCallback, useState } from 'react'
import {
  Button,
  ModalHeader,
  TabContent,
  TabHeader,
  TabHeaderItem,
  Tabs,
} from 'forge-core'
import { useMutation, useQuery } from '@apollo/react-hooks'

import { Box, Layer, Text } from 'grommet'

import { filesize } from 'filesize'

import { EXECUTE_OVERLAY } from 'components/apps/app/config/queries'

import { OverlayInput } from 'components/apps/app/config/ConfigurationSettings'

import { LoopingLogo } from '../utils/AnimatedLogo'

import { CONFIGURATION_OVERLAYS, SCALING_RECOMMENDATION } from './queries'
import { MetadataRow } from './Metadata'

import { COMPONENT_LABEL, KIND_LABEL, RESOURCE_LABEL } from './constants'

const POLL_INTERVAL = 10000

const mem = memory => filesize(parseInt(memory))

function RecommendationNub({ text, value }) {
  return (
    <Box
      direction="row"
      align="center"
      gap="xsmall"
    >
      <Text
        size="small"
        weight={500}
      >{text}
      </Text>
      <Text size="small">{value}</Text>
    </Box>
  )
}

function Recommendation({ rec: { cpu, memory } }) {
  return (
    <Box
      gap="2px"
      border={{ side: 'left' }}
      pad={{ horizontal: 'small' }}
    >
      <RecommendationNub
        text="cpu"
        value={cpu}
      />
      <RecommendationNub
        text="memory"
        value={mem(memory)}
      />
    </Box>
  )
}

function ScalingRecommendations({
  recommendations, namespace, kind, name, setOpen,
}) {
  const [tab, setTab] = useState(recommendations[0].containerName)
  const [exec, setExec] = useState(false)
  const { data: overlayData } = useQuery(CONFIGURATION_OVERLAYS, { variables: { namespace } })

  const overlays = overlayData?.configurationOverlays?.map(({ metadata, ...rest }) => {
    const labels = metadata.labels.reduce((acc, { name, value }) => ({ ...acc, [name]: value }), {})

    return { ...rest, metadata: { ...metadata, labels } }
  }).filter(({ metadata: { labels } }) => (
    labels[COMPONENT_LABEL] === name && labels[KIND_LABEL] === kind.toLowerCase()
  ))

  if (exec) {
    return (
      <ScalingEdit
        rec={recommendations.find(({ containerName }) => containerName === tab).uncappedTarget}
        namespace={namespace}
        overlays={overlays}
        setOpen={setOpen}
      />
    )
  }

  return (
    <Box
      flex={false}
      pad="small"
    >
      <Tabs
        defaultTab={recommendations[0].containerName}
        onTabChange={setTab}
      >
        <TabHeader>
          {recommendations.map(({ containerName }) => (
            <TabHeaderItem
              key={containerName}
              name={containerName}
            >
              <Text
                size="small"
                weight={500}
              >{containerName}
              </Text>
            </TabHeaderItem>
          ))}
        </TabHeader>
        {recommendations.map(recommendation => (
          <TabContent
            key={recommendation.containerName}
            name={recommendation.containerName}
          >
            <Box pad="small">
              <MetadataRow name="lower bound">
                <Recommendation rec={recommendation.lowerBound} />
              </MetadataRow>
              <MetadataRow name="upper bound">
                <Recommendation rec={recommendation.upperBound} />
              </MetadataRow>
              <MetadataRow name="target">
                <Recommendation rec={recommendation.uncappedTarget} />
              </MetadataRow>
            </Box>
            {overlays && overlays.length > 0 && (
              <Box
                direction="row"
                justify="end"
              >
                <Button
                  label="Apply"
                  onClick={() => setExec(true)}
                />
              </Box>
            )}
          </TabContent>
        ))}
      </Tabs>
    </Box>
  )
}

export function ScalingEdit({
  namespace, rec: { cpu, memory }, overlays, setOpen,
}) {
  const byResource = overlays.reduce((acc, overlay) => (
    { ...acc, [overlay.metadata.labels[RESOURCE_LABEL]]: overlay }
  ), {})

  const [ctx, setCtx] = useState({
    [byResource.cpu.spec.name]: cpu,
    [byResource.memory.spec.name]: memory,
  })
  const [mutation, { loading }] = useMutation(EXECUTE_OVERLAY, {
    variables: { name: namespace, ctx: JSON.stringify(ctx) },
    onCompleted: () => setOpen(false),
  })

  return (
    <Box
      fill
      pad="medium"
      gap="small"
    >
      <OverlayInput
        overlay={byResource.cpu}
        ctx={ctx}
        setCtx={setCtx}
        values={{}}
      />
      <OverlayInput
        overlay={byResource.memory}
        ctx={ctx}
        setCtx={setCtx}
        values={{}}
      />
      <Box
        direction="row"
        justify="end"
      >
        <Button
          label="Update"
          loading={loading}
          onClick={mutation}
        />
      </Box>
    </Box>
  )
}

export function ScalingRecommender({
  kind, name, namespace, setOpen,
}) {
  const { data } = useQuery(SCALING_RECOMMENDATION, {
    variables: { kind, name, namespace },
    pollInterval: POLL_INTERVAL,
  })

  const recommendations = data?.scalingRecommendation?.status?.recommendation?.containerRecommendations

  return (
    <Box
      fill="horizontal"
      style={{ minHeight: '250px', overflow: 'auto' }}
      gap="small"
    >
      {recommendations ? (
        <ScalingRecommendations
          name={name}
          kind={kind}
          recommendations={recommendations}
          namespace={namespace}
          setOpen={setOpen}
        />
      )
        : <LoopingLogo />}
    </Box>
  )
}

export function ScalingRecommenderModal({ kind, name, namespace }) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [setOpen])

  return (
    <>
      <Button
        label="Scaling"
        onClick={() => setOpen(true)}
      />
      {open && (
        <Layer
          onClickOutside={close}
          onEsc={close}
        >
          <Box width="50vw">
            <ModalHeader
              text="Recommendations"
              setOpen={setOpen}
            />
            <ScalingRecommender
              kind={kind}
              name={name}
              namespace={namespace}
              setOpen={setOpen}
            />
          </Box>
        </Layer>
      )}
    </>
  )
}
