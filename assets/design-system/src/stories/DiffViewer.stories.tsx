import { DiffMethod, DiffViewer } from '..'
import type { Meta, StoryObj } from '@storybook/react'

const OLD_VALUE = `apiVersion: v1
kind: ConfigMap
metadata:
  name: demo
  namespace: default
data:
  feature: enabled
`

const NEW_VALUE = `apiVersion: v1
kind: ConfigMap
metadata:
  name: demo
  namespace: default
data:
  feature: disabled
  extra: true
`

const meta = {
  title: 'DiffViewer',
  component: DiffViewer,
  argTypes: {
    splitView: {
      control: 'boolean',
    },
    asCard: {
      control: 'boolean',
    },
    hideLineNumbers: {
      control: 'boolean',
    },
  },
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template(args: any) {
  return (
    <div style={{ maxWidth: 720 }}>
      <DiffViewer {...args} />
    </div>
  )
}

export const Default: Story = {
  render: Template,
  args: {
    oldValue: OLD_VALUE,
    newValue: NEW_VALUE,
    splitView: false,
    compareMethod: DiffMethod.LINES,
    asCard: true,
  },
}

export const DeletedFile: Story = {
  render: Template,
  args: {
    oldValue: OLD_VALUE,
    newValue: '',
    splitView: false,
    compareMethod: DiffMethod.LINES,
    asCard: true,
  },
}

