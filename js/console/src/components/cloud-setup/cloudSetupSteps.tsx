import {
  ArrowTopRightIcon,
  Button,
  CheckOutlineIcon,
  CheckRoundedIcon,
  CircleDashIcon,
  Chip,
  Codeline,
  Flex,
} from '@pluralsh/design-system'
import { useLogin } from 'components/contexts'
import usePersistedState from 'components/hooks/usePersistedState'
import { GqlError, GqlErrorType } from 'components/utils/Alert'
import { GenerateAccessToken } from 'components/utils/GenerateAccessToken'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { SidebarBtnSC } from 'components/workbenches/workbench/create-edit/WorkbenchCreateOrEdit'
import { useScmConnectionQuery } from 'generated/graphql'
import { ReactNode, Suspense, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import styled from 'styled-components'
import {
  GitHubSetupStep,
  INSTALLATION_ID_PARAM,
} from './steps/scm-setup/GitHubSetupStep'

const HOW_TO_USE_DOCS_URL = 'https://docs.plural.sh/getting-started/how-to-use'
// same walkthrough video as the Plural Cloud setup guide panel
const SETUP_VIDEO_EMBED_URL =
  'https://www.youtube-nocookie.com/embed/sEb_gflm-ME?rel=0'

// Dev-only: `VITE_PREVIEW_CLOUD_SETUP=true yarn start` shows setup as a fresh
// Plural Cloud instance would see it, against any backend. It never applies to
// production builds.
const PREVIEW_CLOUD_SETUP =
  import.meta.env.DEV && import.meta.env.VITE_PREVIEW_CLOUD_SETUP === 'true'

export function useCloudSetupState() {
  const { configuration } = useLogin()

  if (PREVIEW_CLOUD_SETUP) return { isCloud: true, cloudConnected: false }
  return {
    isCloud: !!configuration?.cloud,
    cloudConnected: !!configuration?.installed,
  }
}

// in preview mode, keep flags in memory so a reload resets them
export function useCloudSetupFlag(key: string, defaultValue = false) {
  const persisted = usePersistedState(key, defaultValue)
  const inMemory = useState(defaultValue)
  return PREVIEW_CLOUD_SETUP ? inMemory : persisted
}

export enum SetupStepKey {
  ConnectCloud = 'connect-cloud',
  SourceControl = 'source-control',
  Learn = 'learn',
}

export type SetupStep = { key: SetupStepKey; label: string; done: boolean }

// Step state for the Home setup card. Steps complete themselves from backend state; "Learn" is
// optional reading, so opening it counts as done.
export function useCloudSetupSteps() {
  const { isCloud, cloudConnected } = useCloudSetupState()
  const [params] = useSearchParams()
  const returningFromGitHub = !!params.get(INSTALLATION_ID_PARAM)
  const [learnDone, setLearnDone] = useCloudSetupFlag('cloud-setup-learn-done')

  const { data: scmData } = useScmConnectionQuery({
    variables: { name: 'plural' },
    fetchPolicy: 'cache-and-network',
  })
  const scmConnected = !!scmData?.scmConnection && !returningFromGitHub

  const steps: SetupStep[] = [
    {
      key: SetupStepKey.ConnectCloud,
      label: 'Connect your cloud',
      done: cloudConnected,
    },
    {
      key: SetupStepKey.SourceControl,
      label: 'Connect source control',
      done: scmConnected,
    },
    {
      key: SetupStepKey.Learn,
      label: 'Learn how to use Plural',
      done: learnDone,
    },
  ]

  const [activeStep, setActiveStep] = useState<SetupStepKey>(
    returningFromGitHub
      ? SetupStepKey.SourceControl
      : (steps.find((s) => !s.done)?.key ?? SetupStepKey.ConnectCloud)
  )

  const selectStep = (key: SetupStepKey) => {
    setActiveStep(key)
    if (key === SetupStepKey.Learn) setLearnDone(true)
  }

  return {
    isCloud,
    cloudConnected,
    scmConnected,
    returningFromGitHub,
    steps,
    activeStep,
    selectStep,
  }
}

// Same sidebar item as the workbench create/edit flow: label on the left,
// status icon on the right.
export function CloudSetupStepNav({
  steps,
  activeStep,
  onSelect,
}: {
  steps: SetupStep[]
  activeStep: SetupStepKey
  onSelect: (key: SetupStepKey) => void
}) {
  return (
    <>
      {steps.map((step) => (
        <SidebarBtnSC
          key={step.key}
          $active={activeStep === step.key}
          aria-current={activeStep === step.key ? 'step' : undefined}
          onClick={() => onSelect(step.key)}
          endIcon={
            step.done ? (
              <CheckOutlineIcon
                color="icon-success"
                size={16}
              />
            ) : (
              <CircleDashIcon
                color="icon-light"
                size={16}
              />
            )
          }
        >
          {step.label}
        </SidebarBtnSC>
      ))}
    </>
  )
}

export function CloudSetupStepContent({
  activeStep,
  cloudConnected,
  scmConnected,
  showVideo = true,
}: {
  activeStep: SetupStepKey
  cloudConnected: boolean
  scmConnected: boolean
  // set false where a guide panel already shows the video
  showVideo?: boolean
}) {
  return (
    <StepContentSC>
      {activeStep === SetupStepKey.ConnectCloud && (
        <ConnectCloudPanel done={cloudConnected} />
      )}
      {activeStep === SetupStepKey.SourceControl && (
        <SourceControlPanel done={scmConnected} />
      )}
      {activeStep === SetupStepKey.Learn && (
        <LearnPanel showVideo={showVideo} />
      )}
    </StepContentSC>
  )
}

export function SetupVideo() {
  return (
    <VideoSC>
      <iframe
        src={SETUP_VIDEO_EMBED_URL}
        title="Getting started with Plural Cloud"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
      />
    </VideoSC>
  )
}

function PanelIntro({
  chip,
  description,
}: {
  chip: ReactNode
  description: string
}) {
  return (
    <Flex
      direction="column"
      gap="medium"
      align="flex-start"
    >
      {chip}
      <p className="description">{description}</p>
    </Flex>
  )
}

function DoneChip({ children }: { children: ReactNode }) {
  return (
    <Chip
      severity="success"
      icon={<CheckRoundedIcon />}
    >
      {children}
    </Chip>
  )
}

function ConnectCloudPanel({ done }: { done: boolean }) {
  const [error, setError] = useState<GqlErrorType | undefined>(undefined)

  if (done)
    return (
      <PanelIntro
        chip={<DoneChip>Connected</DoneChip>}
        description="Your management cluster is connected and reporting in. You're ready to start deploying."
      />
    )

  return (
    <>
      <PanelIntro
        chip={<Chip severity="warning">Required · about 10 min</Chip>}
        description="Generate an access token, then run the Plural CLI on your machine. This creates your management cluster."
      />
      {error && <GqlError error={error} />}
      <SubStepSC>
        <h3>1. Generate an access token</h3>
        <GenerateAccessToken setError={setError} />
      </SubStepSC>
      <SubStepSC>
        <h3>2. Run this and paste the token when asked</h3>
        <Codeline displayText="$ plural up --cloud">plural up --cloud</Codeline>
        <p className="hint">
          No CLI yet? Run <code>brew install pluralsh/plural/plural</code>. This
          step checks itself off when your cluster checks in.
        </p>
      </SubStepSC>
    </>
  )
}

function SourceControlPanel({ done }: { done: boolean }) {
  if (done)
    return (
      <PanelIntro
        chip={<DoneChip>Connected</DoneChip>}
        description="Plural can open pull requests and listen for updates from your repositories. You can change this any time in SCM connection settings."
      />
    )

  return (
    <>
      <PanelIntro
        chip={<Chip severity="neutral">Optional</Chip>}
        description="Connect GitHub so Plural can open pull requests and listen for updates from your repositories."
      />
      <Suspense fallback={<LoadingIndicator />}>
        <GitHubSetupStep />
      </Suspense>
    </>
  )
}

function LearnPanel({ showVideo }: { showVideo: boolean }) {
  return (
    <>
      <PanelIntro
        chip={<Chip severity="neutral">Optional · about 5 min</Chip>}
        description={
          showVideo
            ? 'A short tour of the core concepts: clusters, services, pipelines and how Plural keeps them in sync. Watch the walkthrough, then dig into the "How to use Plural" guide.'
            : 'A short tour of the core concepts: clusters, services, pipelines and how Plural keeps them in sync. The walkthrough video is in the setup guide, and the "How to use Plural" guide goes deeper.'
        }
      />
      {showVideo && <SetupVideo />}
      <div>
        <Button
          secondary
          as="a"
          href={HOW_TO_USE_DOCS_URL}
          target="_blank"
          rel="noreferrer"
          endIcon={<ArrowTopRightIcon />}
        >
          Open docs
        </Button>
      </div>
    </>
  )
}

const StepContentSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  minWidth: 0,
  '.description': {
    ...theme.partials.text.body1,
    color: theme.colors.text,
    margin: 0,
  },
}))

// matches the video frame in Plural Cloud's setup guide panel
const VideoSC = styled.div(({ theme }) => ({
  flexShrink: 0,
  aspectRatio: '16 / 9',
  width: '100%',
  maxWidth: 640,
  borderRadius: theme.borderRadiuses.large,
  border: theme.borders.default,
  overflow: 'clip',
  backgroundColor: theme.colors['fill-zero'],
  iframe: { display: 'block', width: '100%', height: '100%', border: 'none' },
}))

const SubStepSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  h3: {
    ...theme.partials.text.body1Bold,
    color: theme.colors.text,
    margin: 0,
  },
  '.hint': {
    ...theme.partials.text.body2,
    color: theme.colors['text-light'],
    margin: 0,
  },
  code: {
    ...theme.partials.text.code,
    padding: `1px ${theme.spacing.xxsmall}`,
    borderRadius: theme.borderRadiuses.medium,
    border: theme.borders['fill-two'],
    backgroundColor: theme.colors['fill-two'],
  },
}))
