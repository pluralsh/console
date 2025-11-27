import ProgressBar from '../components/ProgressBar'

export default {
  title: 'Progress Bar',
  component: ProgressBar,
  argTypes: {
    progress: {
      control: {
        type: 'range',
        min: 0,
        max: 1,
        step: 0.05,
      },
    },
  },
}

export const Indeterminate = ProgressBar.bind({})
Indeterminate.args = {
  paused: false,
  complete: false,
}

export const Determinate = ProgressBar.bind({})
Determinate.args = {
  paused: false,
  complete: false,
  mode: 'determinate',
  progress: 0.25,
}
