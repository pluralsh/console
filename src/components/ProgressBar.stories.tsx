import { ProgressBar1, ProgressBar2, ProgressBar3, ProgressBar4 } from './ProgressBar'

export default {
  title: 'Progress Bar',
  component: ProgressBar1,
  argTypes: { progress: { control: { type: 'range', min: 0, max: 1, step: 0.05 } } },
}

export const IndeterminateOpt1 = ProgressBar1.bind({})
IndeterminateOpt1.args = {
  paused: false,
  complete: false,
}

export const IndeterminateOpt2 = ProgressBar2.bind({})
IndeterminateOpt2.args = IndeterminateOpt1.args

export const IndeterminateOpt3 = ProgressBar3.bind({})
IndeterminateOpt3.args = IndeterminateOpt1.args

export const IndeterminateOpt4 = ProgressBar4.bind({})
IndeterminateOpt4.args = IndeterminateOpt1.args

export const Determinate = ProgressBar1.bind({})
Determinate.args = {
  paused: false,
  complete: false,
  mode: 'determinate',
  progress: 0,
}
