import { Div, Flex, Input } from 'honorable'

import MagnifyingGlassIcon from '../components/icons/MagnifyingGlassIcon'
import CaretDownIcon from '../components/icons/CaretDownIcon'

export default {
  title: 'Input',
  component: Input,
}

function Template(args: any) {
  return (
    <Flex
      direction="column"
      maxWidth="400px"
    >
      <Input {...args} />
      <Div marginTop="medium">
        <Input
          startIcon={<MagnifyingGlassIcon />}
          endIcon={(
            <CaretDownIcon
              size={10}
              mt={0.333}
              mx="3px"
            />
          )}
          {...args}
        />
      </Div>
    </Flex>
  )
}

export const Default = Template.bind({})

Default.args = {
}

export const Error = Template.bind({})

Error.args = {
  error: true,
}

export const Placeholder = Template.bind({})

Placeholder.args = {
  placeholder: 'A neat placeholder!',
}

export const Disabled = Template.bind({})

Disabled.args = {
  placeholder: 'Disabled placeholder',
  disabled: true,
}
