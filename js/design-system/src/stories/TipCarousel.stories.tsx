import { useTheme } from 'styled-components'

import TipCarousel from '../components/TipCarousel'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'Tip Carousel',
  component: TipCarousel,
  argTypes: {
    autoAdvanceTime: {
      control: {
        type: 'range',
        min: 0,
        max: 6000,
        step: 100,
      },
    },
  },
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template(args: any) {
  const theme = useTheme()

  return (
    <TipCarousel {...args}>
      <>
        You can use service accounts to have an entire team manage a set of
        installations for one of your plural clusters, learn more{' '}
        <a
          href="#"
          target="_blank"
          css={theme.partials.text.inlineLink}
        >
          here
        </a>
        .
      </>
      <>
        You can use <b>plural shell sync</b> to transfer your state from the
        Plural Cloud Shell to the command line.
      </>
      <>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod{' '}
        <b>tempor incididunt</b> ut labore et dolore magna aliqua. Ut enim ad
        minim veniam, quis nostrud exercitation.
      </>
      <>
        Sed ut perspiciatis unde <b>omnis</b> iste natus error sit voluptatem.
      </>
    </TipCarousel>
  )
}

export const Default: Story = {
  render: Template,
  args: {
    autoAdvanceTime: 10000,
  },
}
