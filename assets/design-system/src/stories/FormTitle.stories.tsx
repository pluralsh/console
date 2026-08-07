import FormTitle from '../components/FormTitle'
import type { StoryFn } from '@storybook/react'

export default {
  title: 'FormTitle',
  component: FormTitle,
}

function Template(args: any) {
  return (
    <FormTitle
      title={args.title}
      message={args.message}
    />
  )
}

export const Primary: StoryFn = Template.bind({})

Primary.args = {
  title: 'Automatic Upgrades',
  message: 'Determine how this application is updated on a regular basis.',
}
