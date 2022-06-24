import { Flex } from 'honorable'

import { StatusOkIcon } from '..'

import Chip from '../components/Chip'

export default {
  title: 'Chip',
  component: Chip,
}

function Template() {
  return (
    <>
      <Flex
        align="center"
        marginBottom="xlarge"
      >
        <Chip severity="neutral">
          Neutral
        </Chip>
        <Chip
          marginLeft="medium"
          severity="info"
        >
          Info
        </Chip>
        <Chip
          marginLeft="medium"
          severity="success"
        >
          Success
        </Chip>
        <Chip
          marginLeft="medium"
          severity="warning"
        >
          Warning
        </Chip>
        <Chip
          marginLeft="medium"
          severity="error"
        >
          Error
        </Chip>
      </Flex>
      <Flex
        align="center"
        marginBottom="xlarge"
      >
        <Chip
          severity="neutral"
          size="large"
        >
          Neutral
        </Chip>
        <Chip
          marginLeft="medium"
          severity="info"
          size="large"
        >
          Info
        </Chip>
        <Chip
          marginLeft="medium"
          severity="success"
          size="large"
        >
          Success
        </Chip>
        <Chip
          marginLeft="medium"
          severity="warning"
          size="large"
        >
          Warning
        </Chip>
        <Chip
          marginLeft="medium"
          severity="error"
          size="large"
        >
          Error
        </Chip>
      </Flex>
      <Flex
        align="center"
        marginBottom="xlarge"
      >
        <Chip
          loading
          severity="neutral"
        >
          Neutral
        </Chip>
        <Chip
          loading
          marginLeft="medium"
          severity="info"
        >
          Info
        </Chip>
        <Chip
          loading
          marginLeft="medium"
          severity="success"
        >
          Success
        </Chip>
        <Chip
          loading
          marginLeft="medium"
          severity="warning"
        >
          Warning
        </Chip>
        <Chip
          loading
          marginLeft="medium"
          severity="error"
        >
          Error
        </Chip>
      </Flex>
      <Flex
        align="center"
        marginBottom="xlarge"
      >
        <Chip
          loading
          severity="neutral"
          size="large"
        >
          Neutral
        </Chip>
        <Chip
          loading
          marginLeft="medium"
          severity="info"
          size="large"
        >
          Info
        </Chip>
        <Chip
          loading
          marginLeft="medium"
          severity="success"
          size="large"
        >
          Success
        </Chip>
        <Chip
          loading
          marginLeft="medium"
          severity="warning"
          size="large"
        >
          Warning
        </Chip>
        <Chip
          loading
          marginLeft="medium"
          severity="error"
          size="large"
        >
          Error
        </Chip>
      </Flex>
      <Flex
        align="center"
        marginBottom="xlarge"
      >
        <Chip
          icon={<StatusOkIcon />}
          severity="neutral"
          size="large"
        >
          Neutral
        </Chip>
        <Chip
          icon={<StatusOkIcon />}
          marginLeft="medium"
          severity="info"
          size="large"
        >
          Info
        </Chip>
        <Chip
          icon={<StatusOkIcon />}
          marginLeft="medium"
          severity="success"
          size="large"
        >
          Success
        </Chip>
        <Chip
          icon={<StatusOkIcon />}
          marginLeft="medium"
          severity="warning"
          size="large"
        >
          Warning
        </Chip>
        <Chip
          icon={<StatusOkIcon />}
          marginLeft="medium"
          severity="error"
          size="large"
        >
          Error
        </Chip>
      </Flex>
    </>
  )
}

export const Default = Template.bind({})

Default.args = {
}
