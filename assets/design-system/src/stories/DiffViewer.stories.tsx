import { DiffMethod, DiffViewer } from '..'
import type { StoryFn } from '@storybook/react'

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

export default {
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
}

function Template(args: any) {
  return (
    <div style={{ maxWidth: 720 }}>
      <DiffViewer {...args} />
    </div>
  )
}

export const Default: StoryFn = Template.bind({})
Default.args = {
  oldValue: OLD_VALUE,
  newValue: NEW_VALUE,
  splitView: false,
  compareMethod: DiffMethod.LINES,
  asCard: true,
}

export const DeletedFile: StoryFn = Template.bind({})
DeletedFile.args = {
  oldValue: OLD_VALUE,
  newValue: '',
  splitView: false,
  compareMethod: DiffMethod.LINES,
  asCard: true,
}
