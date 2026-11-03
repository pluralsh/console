import {
  Button,
  CaretDownIcon,
  CaretUpIcon,
  Flex,
} from '@pluralsh/design-system'
import styled, { DefaultTheme } from 'styled-components'
import {
  CloudSetupStepContent,
  CloudSetupStepNav,
  useCloudSetupFlag,
  useCloudSetupSteps,
} from './cloudSetupSteps'

// Same brand gradient as the Plural Cloud (app.plural.sh) banners, so the
// hand-off from Plural Cloud into the console feels like one flow.
const GRADIENT_START = '#52F4D9'
const GRADIENT_END = '#494FF2'

// Setup card at the top of Home on Plural Cloud instances.
// - Hide collapses it to a one-line gradient banner; the rest of the console
//   stays usable either way. Once the cloud is connected, the collapsed banner
//   can be dismissed for good.
// - It disappears on its own once the cloud and source control are connected.
export function CloudSetupChecklist() {
  const {
    isCloud,
    cloudConnected,
    scmConnected,
    returningFromGitHub,
    steps,
    activeStep,
    selectStep,
  } = useCloudSetupSteps()
  const [collapsed, setCollapsed] = useCloudSetupFlag('cloud-setup-collapsed')
  const [dismissed, setDismissed] = useCloudSetupFlag('cloud-setup-dismissed')

  if (!isCloud) return null
  if (!returningFromGitHub) {
    if (cloudConnected && scmConnected) return null
    if (cloudConnected && dismissed) return null
  }

  const isCollapsed = collapsed && !returningFromGitHub

  // Open and collapsed share one header, so the title and toggle button keep
  // the same size and position; collapsing only hides the steps.
  return (
    <WizardCardSC
      $collapsed={isCollapsed}
      aria-label="Finish setting up your console"
    >
      <HeaderSC $collapsed={isCollapsed}>
        <h2>
          {cloudConnected
            ? 'Almost there. Connect your source control.'
            : "Your console is ready. Let's connect your cloud."}
        </h2>
        <Flex
          gap="small"
          align="center"
          flexShrink={0}
        >
          {isCollapsed && cloudConnected && (
            <Button
              small
              tertiary
              onClick={() => setDismissed(true)}
            >
              Dismiss
            </Button>
          )}
          <Button
            small
            tertiary
            endIcon={isCollapsed ? <CaretDownIcon /> : <CaretUpIcon />}
            onClick={() => setCollapsed(!isCollapsed)}
          >
            {isCollapsed ? 'Finish setup' : 'Hide'}
          </Button>
        </Flex>
      </HeaderSC>
      {!isCollapsed && (
        <SplitSC>
          <StepRailSC aria-label="Setup steps">
            <CloudSetupStepNav
              steps={steps}
              activeStep={activeStep}
              onSelect={selectStep}
            />
          </StepRailSC>
          <StepPanelSC>
            <CloudSetupStepContent
              activeStep={activeStep}
              cloudConnected={cloudConnected}
              scmConnected={scmConnected}
            />
          </StepPanelSC>
        </SplitSC>
      )}
    </WizardCardSC>
  )
}

// Matches the Plural Cloud upsell banner exactly: a left-to-right teal → indigo
// wash over fill-two (fill-zero in light mode).
const brandGradient = (theme: DefaultTheme) => {
  const light = theme.mode === 'light'
  const alpha = (color: string, pct: number) =>
    `color-mix(in srgb, ${color} ${pct}%, transparent)`
  const surface = light ? theme.colors['fill-zero'] : theme.colors['fill-two']

  return `linear-gradient(90deg, ${alpha(GRADIENT_START, light ? 14 : 12)} 0%, ${alpha(GRADIENT_END, light ? 12 : 20)} 100%), ${surface}`
}

const cardBorder = (theme: DefaultTheme) =>
  theme.borders[theme.mode === 'light' ? 'fill-three' : 'fill-two']

const WizardCardSC = styled.section<{ $collapsed: boolean }>(
  ({ theme, $collapsed }) => ({
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    overflow: 'hidden',
    borderRadius: theme.borderRadiuses.large,
    // open card is a plain surface; the collapsed banner carries the gradient
    ...($collapsed
      ? { border: cardBorder(theme), background: brandGradient(theme) }
      : {
          border: theme.borders['fill-one'],
          backgroundColor: theme.colors['fill-one'],
        }),
  })
)

const HeaderSC = styled.div<{ $collapsed: boolean }>(
  ({ theme, $collapsed }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.medium,
    padding: `${theme.spacing.medium} ${theme.spacing.large}`,
    borderBottom: $collapsed ? 'none' : theme.borders['fill-one'],
    h2: {
      ...theme.partials.text.body1Bold,
      color: theme.colors.text,
      margin: 0,
      minWidth: 0,
      textWrap: 'balance',
    },
  })
)

const SplitSC = styled.div(({ theme }) => ({
  display: 'flex',
  minWidth: 0,
  [`@media (max-width: ${theme.breakpoints.desktopSmall}px)`]: {
    flexDirection: 'column',
  },
}))

const StepRailSC = styled.nav(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxxsmall,
  width: 200 + 2 * 16, // workbench sidebar width plus padding
  flexShrink: 0,
  padding: theme.spacing.medium,
  borderRight: theme.borders['fill-one'],
  // sidebar items hover to fill-zero-hover, which matches this card's fill-one
  '& > button': { textAlign: 'left' },
  '& > button:hover': { background: theme.colors['fill-one-hover'] },
  [`@media (max-width: ${theme.breakpoints.desktopSmall}px)`]: {
    width: '100%',
    borderRight: 'none',
    borderBottom: theme.borders['fill-one'],
  },
}))

const StepPanelSC = styled.div(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  padding: theme.spacing.large,
}))
