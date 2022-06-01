import { ProgressBar1, ProgressBar2, ProgressBar3, ProgressBar4 } from './ProgressBar'

export default {
  title: 'Progress Bar',
  component: ProgressBar1,
}

export const V1 = ProgressBar1.bind({})
V1.args = {
  paused: false,
  complete: false,
}

export const V2 = ProgressBar2.bind({})
V2.args = V1.args

export const V3 = ProgressBar3.bind({})
V3.args = V1.args

export const V4 = ProgressBar4.bind({})
V4.args = V1.args
