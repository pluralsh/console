import Stepper from '../components/Stepper'
import type { StepperSteps } from '../components/Stepper'

import BrowserIcon from '../components/icons/BrowserIcon'
import CloudIcon from '../components/icons/CloudIcon'
import GearTrainIcon from '../components/icons/GearTrainIcon'
import GitHubIcon from '../components/icons/GitHubIcon'

export default {
  title: 'Stepper',
  component: Stepper,
}

function Template(args: any) {
  return (
    <Stepper
      {...args}
    />
  )
}

const steps: StepperSteps = [
  { key: 'create-repo', stepTitle: 'Create a repository', IconComponent: GitHubIcon },
  { key: 'choose-cloud', stepTitle: <>Choose a&nbsp;cloud</>, IconComponent: CloudIcon },
  { key: 'configure-repo', stepTitle: 'Configure repository', IconComponent: GearTrainIcon },
  { key: 'launch-app', stepTitle: <>Launch the&nbsp;app</>, IconComponent: BrowserIcon },
]

export const Default = Template.bind({})
Default.args = {
  stepIndex: 1,
  steps,
}

export const List03 = Template.bind({})
List03.args = {
  stepIndex: 1,
  steps: steps.slice(0, 3),
}

export const List02 = Template.bind({})
List02.args = {
  stepIndex: 1,
  steps: steps.slice(0, 2),
}

export const List01 = Template.bind({})
List01.args = {
  stepIndex: 0,
  steps: steps.slice(0, 1),
}

export const Vertical = Template.bind({})
Vertical.args = {
  stepIndex: 1,
  steps,
  vertical: true,
}
