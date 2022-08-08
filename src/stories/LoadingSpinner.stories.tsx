import { Div } from 'honorable'

import LoadingSpinner, {
  LoadingSpinnerProps,
} from '../components/LoadingSpinner'

export default {
  title: 'LoadingSpinner',
  component: LoadingSpinner,
}

function Template(args: LoadingSpinnerProps) {
  return (
    <Div position="relative">
      <Div
        position="absolute"
        top="0"
        bottom={0}
        right={0}
        left={0}
        backgroundColor="red"
      >
        <Div
          width="100%"
          position="relative"
        >
          <LoadingSpinner {...args} />
        </Div>
      </Div>
    </Div>
  )
}

export const Primary = Template.bind({})

Primary.args = {
  show: true,
  spinnerDelay: 200,
  spinnerWidth: 96,
  centered: true,
  animateTransitions: true,
}
