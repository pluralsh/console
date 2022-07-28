import {
  Button, Div, Flex, FlexProps,
} from 'honorable'

import Tooltip from '../components/Tooltip'

export default {
  title: 'Tooltip',
  component: Tooltip,
}

function CornerBox(props: FlexProps) {
  return (
    <Flex
      width="100%"
      padding={20}
      {...props}
    />
  )
}

function Tip(props:any) {
  return (
    <Tooltip
      label="Here's some info for you!"
      {...props}
    >
      <Button>Hover me</Button>
    </Tooltip>
  )
}

function Template(args: any) {
  return (
    <Div margin="-32px">
      <Flex
        width="100%"
        height="33vh"
        alignItems="stretch"
      >
        <CornerBox
          alignItems="flex-start"
          justifyContent="left"
        >
          <Tip {...args} />
        </CornerBox>
        <CornerBox
          alignItems="flex-start"
          justifyContent="right"
        >
          <Tip {...args} />
        </CornerBox>
      </Flex>
      <Flex
        width="100%"
        height="33.3vh"
        alignItems="stretch"
      >
        <CornerBox
          alignItems="center"
          justifyContent="center"
        >
          <Tip {...args} />
        </CornerBox>
      </Flex>
      <Flex
        width="100%"
        height="33vh"
        alignItems="stretch"
      >
        <CornerBox
          alignItems="flex-end"
          justifyContent="left"
        >
          <Tip {...args} />
        </CornerBox>
        <CornerBox
          alignItems="flex-end"
          justifyContent="right"
        >
          <Tip {...args} />
        </CornerBox>
      </Flex>

    </Div>
  )
}

export const Default = Template.bind({})

Default.args = {}
