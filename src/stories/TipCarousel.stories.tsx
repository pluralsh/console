import { A } from 'honorable'

import TipCarousel from '../components/TipCarousel'

export default {
  title: 'TipCarousel',
  component: TipCarousel,
  argTypes: {
    autoAdvanceTime: {
      control: {
        type: 'range', min: 0, max: 6000, step: 100,
      },
    },
  },
}

function Template(args: any) {
  return (
    <TipCarousel {...args}>
      <>
        You can use service accounts to have an entire team manage a set of installations for one of your plural clusters, learn more{' '}
        <A
          inline
          href="#"
          target="_blank"
        >
          here
        </A>.
      </>
      <>You can use <b>plural shell sync</b> to transfer your state from the Plural Cloud Shell to the command line.</>
      <>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod <b>tempor incididunt</b> ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.</>
      <>Sed ut perspiciatis unde <b>omnis</b> iste natus error sit voluptatem.</>
    </TipCarousel>
  )
}

export const Default = Template.bind({})

Default.args = {
  autoAdvanceTime: 10000,
}
