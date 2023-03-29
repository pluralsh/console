import {
  ComponentProps,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  ConfigurationOverlay,
  ConfigurationOverlaySpec,
  ContainerRecommendation,
  ContainerResources,
  LabelPair,
  Maybe,
  RootQueryType,
} from 'generated/graphql'
import { useMutation, useQuery } from '@apollo/client'

import { filesize } from 'filesize'

import {
  Button,
  Card,
  InfoIcon,
  Tab,
  TabList,
  TabPanel,
  usePrevious,
} from '@pluralsh/design-system'

import { Div, Flex, Modal, ModalBaseProps, P } from 'honorable'

import { useTheme } from 'styled-components'

import { EXECUTE_OVERLAY } from 'components/apps/app/config/queries'

import ConfigurationSettingsField from 'components/apps/app/config/ConfigurationSettingsField'

import { GqlError } from 'components/utils/Alert'

import {
  COMPONENT_LABEL,
  KIND_LABEL,
  RESOURCE_LABEL,
  ScalingType,
} from './constants'

import { CONFIGURATION_OVERLAYS, SCALING_RECOMMENDATION } from './queries'

const POLL_INTERVAL = 10000

const mem = (memory) => {
  try {
    return filesize(parseInt(memory))
  } catch {
    return 0
  }
}

export function ScalingButton({ ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      secondary
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

function ContainerRecommendations({
  lowerBound,
  upperBound,
  uncappedTarget,
  setIsModifying,
}: ContainerRecommendation & { setIsModifying: (arg: boolean) => void }) {
  const recos = [
    ...(lowerBound ? [{ label: 'Lower bound', ...lowerBound }] : []),
    ...(upperBound ? [{ label: 'Upper bound', ...upperBound }] : []),
    ...(uncappedTarget ? [{ label: 'Target', ...uncappedTarget }] : []),
  ]
  const { overlays, componentName } = useScalingContext()

  return (
    <Div padding="large">
      <P marginBottom="large">
        Recommendations for how to scale your {componentName} instance on this
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
        {recos.map((r) => (
          <RecommendationComp {...r} />
        ))}
      </Card>
      {overlays && overlays.length > 0 && (
        <Flex
          marginTop="medium"
          direction="row"
          justify="end"
        >
          <Button onClick={() => setIsModifying(true)}>
            Apply recommendations
          </Button>
        </Flex>
      )}
    </Div>
  )
}

export function ScalingEdit({ rec }: { rec: ContainerResources }) {
  const { namespace, overlays, setIsModifying, setSuccess } =
    useScalingContext()
  const { cpu, memory } = rec || {}

  const byResource = overlays?.reduce(
    (acc, overlay) => ({
      ...acc,
      [overlay?.metadata?.labels?.[RESOURCE_LABEL]]: overlay,
    }),
    {} as Maybe<{ cpu?: Maybe<string>; memory?: Maybe<string> }>
  )

  const [ctx, setCtx] = useState({
    [(byResource as any)?.cpu.spec.name]: cpu,
    [(byResource as any)?.memory.spec.name]: memory,
  })
  const [initCtx, setInitCtx] = useState(ctx)

  const [mutation, { loading, error }] = useMutation(EXECUTE_OVERLAY, {
    variables: { name: namespace, ctx: JSON.stringify(ctx) },
    onCompleted: () => {
      setSuccess(true)
    },
  })

  return (
    <Div padding="large">
      <Flex
        flexDirection="column"
        pad="medium"
        gap="small"
        marginBottom="large"
      >
        <ConfigurationSettingsField
          overlay={byResource?.cpu}
          ctx={ctx}
          setCtx={setCtx}
          values={{}}
          init={initCtx}
          setInit={setInitCtx}
        />
        <ConfigurationSettingsField
          overlay={byResource?.memory}
          ctx={ctx}
          setCtx={setCtx}
          values={{}}
          init={initCtx}
          setInit={setInitCtx}
        />
      </Flex>
      <Flex
        gap="small"
        flexDirection="column"
      >
        {error && <GqlError error={error} />}
        <Flex
          direction="row"
          gap="xsmall"
          justify="end"
        >
          <Button
            secondary
            disabled={loading}
            onClick={() => setIsModifying(false)}
          >
            Cancel
          </Button>
          <Button
            loading={loading}
            onClick={() => mutation()}
          >
            Update
          </Button>
        </Flex>
      </Flex>
    </Div>
  )
}

export function SuccessConfirm() {
  const { closeModal } = useScalingContext()

  return (
    <Flex
      padding="large"
      gap="small"
      flexDirection="column"
    >
      <P
        body1
        marginBottom="medium"
      >
        Scaling recommendations successfully applied.
      </P>
      <Flex
        direction="row"
        gap="xsmall"
        justify="end"
      >
        <Button
          primary
          onClick={() => closeModal()}
        >
          Done
        </Button>
      </Flex>
    </Flex>
  )
}

export function ScalingRecommender() {
  const { success, namespace, recommendations, isModifying, setIsModifying } =
    useScalingContext()

  const tabStateRef = useRef<any>()
  const [recoIndex, setRecoIndex] = useState<number>(0)
  const currentReco = recommendations?.[recoIndex] ?? undefined

  if (success) {
    return <SuccessConfirm />
  }

  if (isModifying && currentReco?.uncappedTarget && namespace) {
    return <ScalingEdit rec={currentReco?.uncappedTarget} />
  }

  return (
    <>
      <TabList
        stateRef={tabStateRef}
        stateProps={{
          orientation: 'horizontal',
          selectedKey: recoIndex,
          onSelectionChange: (index) => {
            setRecoIndex(index as typeof recoIndex)
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
        <ContainerRecommendations
          {...currentReco}
          setIsModifying={setIsModifying}
        />
      </TabPanel>
    </>
  )
}

const ScalingContext = createContext<
  | (ScalingModalProps & {
      closeModal: () => void
      setIsModifying: (arg: boolean) => void
      isModifying: boolean
      setSuccess: (arg: boolean) => void
      success: boolean
      recommendations?: Maybe<Maybe<ContainerRecommendation>[]>
      configurationOverlays?: Maybe<Maybe<ConfigurationOverlay>[]>
      overlays?: OverlaysType
    })
  | undefined
>(undefined)

function useScalingContext() {
  const context = useContext(ScalingContext)

  if (!context) {
    throw Error('ScalingContext has no value')
  }

  return context
}

type OverlaysType =
  | {
      metadata: {
        labels: Maybe<LabelPair> | undefined
        annotations?: Maybe<Maybe<LabelPair>[]> | undefined
        name?: string | undefined
        namespace?: Maybe<string> | undefined
      }
      spec?: ConfigurationOverlaySpec | undefined
    }[]
  | undefined

type ScalingModalProps = {
  kind?: ScalingType
  componentName?: string
  namespace?: string
}

export function ScalingRecommenderModal({
  kind,
  componentName,
  namespace,
  ...props
}: ScalingModalProps & ModalBaseProps) {
  const [isOpen, setIsOpen] = useState(false)
  const wasOpen = usePrevious(isOpen)
  const [isModifying, setIsModifying] = useState(false)
  const [success, setSuccess] = useState(false)
  const closeModal = useCallback(() => {
    setIsOpen(false)
  }, [])

  useEffect(() => {
    if (isOpen && !wasOpen) {
      setIsModifying(false)
      setSuccess(false)
    }
  }, [isOpen, wasOpen])

  const { data } = useQuery<{
    scalingRecommendation?: RootQueryType['scalingRecommendation']
  }>(SCALING_RECOMMENDATION, {
    variables: { kind, name: componentName, namespace },
    pollInterval: POLL_INTERVAL,
  })
  const { data: overlayData } = useQuery<{
    configurationOverlays: RootQueryType['configurationOverlays']
  }>(CONFIGURATION_OVERLAYS, {
    variables: { namespace },
  })

  const recommendations =
    data?.scalingRecommendation?.status?.recommendation
      ?.containerRecommendations
  const configurationOverlays = overlayData?.configurationOverlays

  const contextVal = useMemo(() => {
    const overlays = configurationOverlays
      ?.map((overlay) => {
        const { metadata, ...rest } = overlay || {}

        const labels = metadata?.labels?.reduce(
          (acc, label) => ({
            ...acc,
            ...(label ? { [label?.name || '']: label?.value } : {}),
          }),
          {}
        )

        return { ...rest, metadata: { ...metadata, labels } }
      })
      .filter(
        ({ metadata: { labels } }) =>
          labels?.[COMPONENT_LABEL] === componentName &&
          labels?.[KIND_LABEL] === kind?.toLowerCase()
      )

    return {
      kind,
      componentName,
      namespace,
      recommendations,
      overlays,
      setIsModifying,
      isModifying,
      setSuccess,
      success,
      closeModal,
    }
  }, [
    configurationOverlays,
    kind,
    componentName,
    namespace,
    recommendations,
    isModifying,
    success,
    closeModal,
  ])

  if (!recommendations || recommendations.length === 0) {
    return null
  }

  return (
    <ScalingContext.Provider value={contextVal}>
      <ScalingButton onClick={() => setIsOpen(true)} />
      <Modal
        paddingTop={0}
        paddingBottom={0}
        paddingRight={0}
        paddingLeft={0}
        margin={0}
        minWidth={300}
        open={isOpen}
        onClose={() => {
          closeModal()
        }}
        {...props}
      >
        <ScalingRecommender />
      </Modal>
    </ScalingContext.Provider>
  )
}
