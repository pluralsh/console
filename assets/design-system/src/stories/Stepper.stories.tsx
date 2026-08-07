import Stepper from '../components/Stepper'
import type { StepperSteps } from '../components/Stepper'
import BrowserIcon from '../components/icons/BrowserIcon'
import CloudIcon from '../components/icons/CloudIcon'
import GearTrainIcon from '../components/icons/GearTrainIcon'
import GitHubIcon from '../components/icons/GitHubIcon'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'Stepper',
  component: Stepper,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template(args: any) {
  return (
    <div
      style={{
        display: 'flex',
        maxWidth: args.containerWidth || undefined,
        background: args.showContainer
          ? 'rgba(255, 255, 255, 0.05)'
          : undefined,
        overflow: 'auto',
      }}
    >
      <Stepper {...args} />
    </div>
  )
}

const steps: StepperSteps = [
  {
    key: 'create-repo',
    stepTitle: 'Create a repository',
    IconComponent: GitHubIcon,
  },
  {
    key: 'choose-cloud',
    stepTitle: <>Choose a&nbsp;cloud</>,
    IconComponent: CloudIcon,
  },
  {
    key: 'configure-repo',
    stepTitle: 'Configure repository',
    IconComponent: GearTrainIcon,
  },
  {
    key: 'launch-app',
    stepTitle: <>Launch the&nbsp;app</>,
    IconComponent: BrowserIcon,
  },
]

export const Default: Story = {
  render: Template,
  args: {
    stepIndex: 1,
    steps,
    compact: false,
  },
}

export const List03: Story = {
  render: Template,
  args: {
    stepIndex: 1,
    steps: steps.slice(0, 3),
    compact: false,
  },
}

export const List02: Story = {
  render: Template,
  args: {
    stepIndex: 1,
    steps: steps.slice(0, 2),
    compact: false,
  },
}

export const List01: Story = {
  render: Template,
  args: {
    stepIndex: 0,
    steps: steps.slice(0, 1),
    compact: false,
  },
}

export const Vertical: Story = {
  render: Template,
  args: {
    stepIndex: 1,
    containerWidth: 170,
    collapseAtWidth: 160,
    forceCollapse: false,
    showContainer: false,
    vertical: true,
    compact: false,
    steps,
  },
}

export const Compact: Story = {
  render: Template,
  args: {
    stepIndex: 1,
    steps,
    compact: true,
  },
}

