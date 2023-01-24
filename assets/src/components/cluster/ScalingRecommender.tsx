import {
  ComponentProps,
  Key,
  useRef,
  useState,
} from 'react'
import { ContainerRecommendation, RootQueryType } from 'generated/graphql'
import { useQuery } from '@apollo/client'

import { filesize } from 'filesize'

import {
  Button,
  Card,
  InfoIcon,
  Tab,
  TabList,
  TabPanel,
} from '@pluralsh/design-system'

import {
  Div,
  Flex,
  Modal,
  ModalBaseProps,
  P,
} from 'honorable'

import { useTheme } from 'styled-components'

import { ScalingType } from './constants'

import { SCALING_RECOMMENDATION } from './queries'

const POLL_INTERVAL = 10000

const mem = memory => {
  try {
    return filesize(parseInt(memory))
  }
  catch {
    return 0
  }
}

export function ScalingButton({ ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      secondary
      fontWeight={600}
      startIcon={<InfoIcon />}
      {...props}
    >
      Scaling
    </Button>
  )
}

function RecommendationNub({ text: label, value }) {
  return (
    <Flex
      flexDirection="column"
      justifyContent="center"
    >
      <div>{value}</div>
      <Div
        caption
        color="text-xlight"
        marginTop="minus-xxxsmall"
      >
        {label}
      </Div>
    </Flex>
  )
}

function RecommendationComp({ label, cpu, memory }: any) {
  const theme = useTheme()

  return (
    <Div
      display="contents"
      alignItems="center"
      {...{
        '& > *': {
          padding: `${theme.spacing.xxsmall}px ${theme.spacing.medium}px`,
          paddingRight: theme.spacing.small,
          paddingLeft: theme.spacing.small,
          '&:last-child': {
            paddingRight: theme.spacing.medium,
          },
          '&:first-child': {
            paddingLeft: theme.spacing.medium,
          },
        },
        '&:nth-child(2n) > *': {
          backgroundColor: theme.colors['fill-two'],
        },
      }}
    >
      <Flex alignItems="center">{label}</Flex>
      <RecommendationNub
        text="CPU"
        value={cpu}
      />
      <RecommendationNub
        text="Memory"
        value={mem(memory)}
      />
    </Div>
  )
}

function Recos({
  lowerBound,
  upperBound,
  containerName,
  uncappedTarget,
}: ContainerRecommendation) {
  const recos = [
    ...(lowerBound ? [{ label: 'Lower bound', ...lowerBound }] : []),
    ...(upperBound ? [{ label: 'Upper bound', ...upperBound }] : []),
    ...(uncappedTarget ? [{ label: 'Target', ...uncappedTarget }] : []),
  ]

  return (
    <Div padding="large">
      <P marginBottom="large">
        Recommendations for how to scale your {containerName} instance on this
        application.
      </P>
      <Card
        display="grid"
        gridTemplateColumns="1fr 1fr 1fr"
        backgroundColor="fill-one"
        color="text-light"
        body2LooseLineHeight
        {...{ ':nth-child(2n) > *': { backgroundColor: 'fill-two' } }}
      >
        {recos.map(r => (
          <RecommendationComp {...r} />
        ))}
      </Card>
    </Div>
  )
}

/*
function ScalingRecommendations({
  recommendations,
  namespace,
  kind,
  name,
  setOpen,
}) {
  const [tab, setTab] = useState(recommendations[0].containerName)
  const [exec, setExec] = useState(false)
  const { data: overlayData } = useQuery(CONFIGURATION_OVERLAYS, {
    variables: { namespace },
  })

  const overlays = overlayData?.configurationOverlays
    ?.map(({ metadata, ...rest }) => {
      const labels = metadata.labels.reduce((acc, { name, value }) => ({ ...acc, [name]: value }),
        {})

      return { ...rest, metadata: { ...metadata, labels } }
    })
    .filter(({ metadata: { labels } }) => labels[COMPONENT_LABEL] === name
        && labels[KIND_LABEL] === kind.toLowerCase())

  if (exec) {
    return (
      <ScalingEdit
        rec={
          recommendations.find(({ containerName }) => containerName === tab)
            .uncappedTarget
        }
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
              >
                {containerName}
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
                <RecommendationComp rec={recommendation.lowerBound} />
              </MetadataRow>
              <MetadataRow name="upper bound">
                <RecommendationComp rec={recommendation.upperBound} />
              </MetadataRow>
              <MetadataRow name="target">
                <RecommendationComp rec={recommendation.uncappedTarget} />
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
  namespace,
  rec: { cpu, memory },
  overlays,
  setOpen,
}) {
  const byResource = overlays.reduce((acc, overlay) => ({
    ...acc,
    [overlay.metadata.labels[RESOURCE_LABEL]]: overlay,
  }),
  {})

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
      <ConfigurationSettingsField
        overlay={byResource.cpu}
        ctx={ctx}
        setCtx={setCtx}
        values={{}}
      />
      <ConfigurationSettingsField
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
*/

export function ScalingRecommenderModal({
  kind,
  name,
  namespace,
  ...props
}: { kind?: ScalingType; name?: string; namespace?: string } & ModalBaseProps) {
  const tabStateRef = useRef<any>()
  const [recoIndex, setRecoIndex] = useState<Key>('postgres')
  const [isOpen, setIsOpen] = useState(false)

  const { data } = useQuery<{
    scalingRecommendation?: RootQueryType['scalingRecommendation']
  }>(SCALING_RECOMMENDATION, {
    variables: { kind, name, namespace },
    pollInterval: POLL_INTERVAL,
  })
  // const { data: overlayData } = useQuery<{
  //   configurationOverlays: RootQueryType['configurationOverlays']
  // }>(CONFIGURATION_OVERLAYS, {
  //   variables: { namespace },
  // })

  // const overlays = overlayData?.configurationOverlays
  //   ?.map(overlay => {
  //     const { metadata, ...rest } = overlay || {}

  //     const labels = metadata?.labels?.reduce((acc, { name, value }) => ({ ...acc, [name]: value }),
  //       {})

  //     return { ...rest, metadata: { ...metadata, labels } }
  //   })
  //   .filter(({ metadata: { labels } }) => (
  //     labels?.[COMPONENT_LABEL] === name
  //       && labels?.[KIND_LABEL] === kind?.toLowerCase()
  //   ))

  const recommendations
    = data?.scalingRecommendation?.status?.recommendation
      ?.containerRecommendations

  if (!recommendations || recommendations.length === 0) {
    return null
  }

  const currentReco: ContainerRecommendation | undefined
    = recommendations?.[recoIndex]

  return (
    <>
      <ScalingButton onClick={() => setIsOpen(true)} />
      <Modal
        paddingTop={0}
        paddingBottom={0}
        paddingRight={0}
        paddingLeft={0}
        margin={0}
        minWidth={300}
        open={isOpen}
        onClose={() => setIsOpen(false)}
        {...props}
      >
        <TabList
          stateRef={tabStateRef}
          stateProps={{
            orientation: 'horizontal',
            selectedKey: recoIndex,
            onSelectionChange: index => {
              setRecoIndex(index)
            },
          }}
        >
          {(recommendations || []).map((r, i) => (
            <Tab
              key={i}
              flexGrow={1}
              flexShrink={1}
              justifyContent="center"
              {...{
                '& div': {
                  justifyContent: 'center',
                },
              }}
            >
              {r?.containerName}
            </Tab>
          ))}
        </TabList>
        <TabPanel stateRef={tabStateRef}>
          <Recos {...currentReco} />
        </TabPanel>
      </Modal>
    </>
  )
}
