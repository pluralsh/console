import Alert from './Alert'

export default {
  title: 'Alert',
  component: Alert,
}

function Template(args: any) {
  const { hasOnClose } = args

  return (
    <Alert
      {...args}
      onClose={hasOnClose ? () => {} : null}
    />
  )
}

export const Default = Template.bind({})

Default.args = {
  title: 'This is an alert component',
  children: 'It tells the user about meaningful time-sensitive information',
  hasOnClose: true, // Weird hack because onClose gets overriden by storybook
}

export const Sucess = Template.bind({})

Sucess.args = {
  severity: 'success',
  title: 'Installation updated!',
  children: 'The changes will take effect immediatly',
}

export const Warning = Template.bind({})

Warning.args = {
  severity: 'warning',
  title: 'We are warning you against something',
  children: 'You should reconsider',
}

export const Error = Template.bind({})

Error.args = {
  severity: 'error',
  title: 'This is an error message',
  children: 'Someone made a mistake, it happens.',
}
