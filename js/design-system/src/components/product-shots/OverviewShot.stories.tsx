import type { Meta, StoryObj } from '@storybook/react-vite'
import { elementToSVG, inlineResources } from 'dom-to-svg'

import { OverviewShot, overviewScreens } from '.'

declare global {
  // Used by scripts/export-product-shots.mjs to turn a rendered screen into SVG.
  var productShotToSvg: ((selector: string) => Promise<string>) | undefined
}

globalThis.productShotToSvg = async (selector) => {
  const element = document.querySelector(selector)
  if (!element) throw new Error(`No element matches ${selector}`)
  const svg = elementToSVG(element)
  await inlineResources(svg.documentElement)

  return new XMLSerializer().serializeToString(svg)
}

const meta: Meta<typeof OverviewShot> = {
  title: 'Product Shots/Overview',
  component: OverviewShot,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: 40,
        }}
      >
        <Story />
      </div>
    ),
  ],
  argTypes: {
    screen: { control: 'select', options: Object.keys(overviewScreens) },
    theme: { control: 'select', options: ['light', 'dark'] },
    background: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof OverviewShot>

export const Flow: Story = {
  args: { screen: 'flow', theme: 'dark', background: true },
}

export const Workbench: Story = {
  args: { screen: 'workbench', theme: 'dark', background: true },
}

export const WithoutBackground: Story = {
  args: { screen: 'flow', theme: 'light', background: false },
}
