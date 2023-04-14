import { Div, Flex } from 'honorable'

import MagnifyingGlassIcon from '../components/icons/MagnifyingGlassIcon'
import BrowseAppsIcon from '../components/icons/BrowseAppsIcon'
import CaretDownIcon from '../components/icons/CaretDownIcon'
import Input from '../components/Input'

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
          endIcon={
            <CaretDownIcon
              size={10}
              mt={0.333}
              mx="3px"
            />
          }
          {...args}
        />
      </Div>
    </Flex>
  )
}

function CustomInputTemplate(props: any) {
  return (
    <Flex
      direction="column"
      maxWidth="400px"
    >
      <Div>
        <Input
          large
          width="100%"
          {...props}
        />
      </Div>
      <Div marginTop="medium">
        <Input
          width="100%"
          {...props}
        />
      </Div>
      <Div marginTop="medium">
        <Input
          small
          width="100%"
          {...props}
        />
      </Div>
    </Flex>
  )
}

export const Default = Template.bind({})

Default.args = {}

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

export const PrefixSuffix = CustomInputTemplate.bind({})

PrefixSuffix.args = {
  prefix: 'app.',
  suffix: '.plural.sh',
}

export const Multiline = CustomInputTemplate.bind({})

Multiline.args = {
  multiline: true,
  minRows: 3,
}

export const TitleContent = CustomInputTemplate.bind({})

TitleContent.args = {
  titleContent: (
    <>
      <BrowseAppsIcon marginRight="small" />
      Marketplace
    </>
  ),
}
