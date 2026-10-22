import type { Meta, StoryObj } from '@storybook/react-vite'

import { ProductShot, productShotScenarios } from '.'

const meta: Meta<typeof ProductShot> = {
  title: 'Product Shots/Gallery',
  component: ProductShot,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: 40 }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    scenario: { control: 'select', options: Object.keys(productShotScenarios) },
    step: { control: { type: 'range', min: 0, max: 3, step: 1 } },
    fidelity: { control: 'select', options: ['abstract', 'chrome', 'surface'] },
    theme: { control: 'select', options: ['light', 'dark'] },
  },
}

export default meta
type Story = StoryObj<typeof ProductShot>

export const EnvironmentHygiene: Story = {
  args: { scenario: 'environment-hygiene', step: 0, theme: 'dark' },
}

export const BacklogExecution: Story = {
  args: { scenario: 'backlog-execution', step: 0, theme: 'light' },
}

export const CostAnalysis: Story = {
  args: { scenario: 'cost-analysis', step: 0, theme: 'dark' },
}

export const IncidentResponse: Story = {
  args: { scenario: 'incident-response', step: 0, theme: 'light' },
}

export const FidelityGallery: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 28 }}>
      {(['abstract', 'chrome', 'surface'] as const).map((fidelity) => (
        <ProductShot
          {...args}
          fidelity={fidelity}
          key={fidelity}
        />
      ))}
    </div>
  ),
  args: { scenario: 'environment-hygiene', step: 1, theme: 'dark' },
}
