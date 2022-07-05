import { A, Button, Flex } from 'honorable'

import Banner from '../components/Banner'

export default {
  title: 'Banner',
  component: Banner,
}

function Template(args: any) {
  return (
    <Flex
      direction="column"
      align="flex-start"
    >
      <Banner {...args}>
        File successfully updated.
      </Banner>
      <Banner
        {...args}
        marginTop="medium"
      >
        File successfully updated.
        <A
          color="action-link-inline"
          marginLeft="medium"
        >
          Action
        </A>
      </Banner>
      <Banner
        {...args}
        marginTop="medium"
      >
        <Flex
          direction="column"
          align="flex-start"
        >
          File successfully updated.
          <Button
            small
            secondary
            marginTop="xsmall"
          >
            Action
          </Button>
        </Flex>
      </Banner>
      <Banner
        {...args}
        marginTop="medium"
        severity="error"
      >
        There was an error uploading your file. Please try again.
      </Banner>
      <Banner
        {...args}
        marginTop="medium"
        severity="error"
      >
        There was an error uploading your file. Please try again.
        <A
          color="action-link-inline"
          marginLeft="medium"
        >
          Action
        </A>
      </Banner>
      <Banner
        {...args}
        marginTop="medium"
        severity="error"
      >
        <Flex
          direction="column"
          align="flex-start"
        >
          There was an error uploading your file. Please try again.
          <Button
            small
            secondary
            marginTop="xsmall"
          >
            Action
          </Button>
        </Flex>
      </Banner>
    </Flex>
  )
}

export const Default = Template.bind({})

Default.args = {
}
