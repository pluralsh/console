import { Card, CodeEditor, WrapWithIf } from '..'

import { tfCode } from '../constants'
import type { Meta, StoryObj } from '@storybook/react'
import { useTheme } from 'styled-components'

const meta = {
  title: 'Code Editor',
  component: CodeEditor,
  parameters: {
    controls: {
      exclude: /^(on[A-Z]|options)/,
    },
  },
  argTypes: {
    onFillLevel: {
      options: [0, 1, 2, 3],
      control: {
        type: 'select',
        labels: {
          0: '0',
          1: '1',
          2: '2',
          3: '3',
        },
      },
    },
    save: {
      control: { type: 'boolean' },
    },
    saveLabel: {
      control: { type: 'text' },
    },
    saving: {
      control: { type: 'boolean' },
    },
    lineNumbers: {
      control: { type: 'boolean' },
    },
    minimap: {
      control: { type: 'boolean' },
    },
    options: {
      table: { disable: true },
    },
    onSave: {
      table: { disable: true },
      control: false,
    },
    onChange: {
      table: { disable: true },
      control: false,
    },
    stretched: {
      control: { type: 'boolean' },
    },
    width: {
      control: {
        type: 'range',
        min: 200,
        max: 1200,
        step: 10,
      },
      if: { arg: 'stretched', truthy: false },
    },
    height: {
      control: {
        type: 'range',
        min: 120,
        max: 800,
        step: 10,
      },
      if: { arg: 'stretched', truthy: false },
    },
  },
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template({
  onFillLevel,
  width,
  height,
  stretched,
  lineNumbers,
  minimap,
  ...args
}: any) {
  const theme = useTheme()

  return (
    <WrapWithIf
      condition={onFillLevel > 0}
      wrapper={
        <Card
          fillLevel={onFillLevel}
          css={{ padding: theme.spacing.medium }}
        />
      }
    >
      <CodeEditor
        language="hcl"
        value={tfCode}
        width={stretched ? undefined : width}
        height={stretched ? undefined : height}
        {...args}
        options={{
          lineNumbers: lineNumbers ? 'on' : 'off',
          minimap: { enabled: minimap },
        }}
      />
    </WrapWithIf>
  )
}

export const Default: Story = {
  render: Template,
  args: {
    lineNumbers: true,
    minimap: true,
    save: true,
    saveLabel: 'Commit',
    saving: false,
    stretched: false,
    width: 800,
    height: 400,
    onFillLevel: 0,
  },
}
