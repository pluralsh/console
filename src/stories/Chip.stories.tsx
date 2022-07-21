import { Flex, H1 } from 'honorable'

import { StatusOkIcon } from '..'

import Chip from '../components/Chip'

export default {
  title: 'Chip',
  component: Chip,
}

function Template() {
  return (
    <>
      <H1
        subtitle2
        marginBottom="small"
      >Small
      </H1>
      <Flex
        align="center"
        marginBottom="xlarge"
      >
        <Chip
          severity="neutral"
          size="small"
        >
          Neutral
        </Chip>
        <Chip
          marginLeft="medium"
          severity="info"
          size="small"
        >
          Info
        </Chip>
        <Chip
          marginLeft="medium"
          severity="success"
          size="small"
        >
          Success
        </Chip>
        <Chip
          marginLeft="medium"
          severity="warning"
          size="small"
        >
          Warning
        </Chip>
        <Chip
          marginLeft="medium"
          severity="error"
          size="small"
        >
          Error
        </Chip>
      </Flex>
      {/* Small with loading spinner */}
      <Flex
        align="center"
        marginBottom="xlarge"
      >
        <Chip
          loading
          severity="neutral"
          size="small"
        >
          Neutral
        </Chip>
        <Chip
          loading
          marginLeft="medium"
          severity="info"
          size="small"
        >
          Info
        </Chip>
        <Chip
          loading
          marginLeft="medium"
          severity="success"
          size="small"
        >
          Success
        </Chip>
        <Chip
          loading
          marginLeft="medium"
          severity="warning"
          size="small"
        >
          Warning
        </Chip>
        <Chip
          loading
          marginLeft="medium"
          severity="error"
          size="small"
        >
          Error
        </Chip>
      </Flex>
      {/* Small with icon */}
      <Flex
        align="center"
        marginBottom="xlarge"
      >
        <Chip
          icon={<StatusOkIcon />}
          severity="neutral"
          size="small"
        >
          Neutral
        </Chip>
        <Chip
          icon={<StatusOkIcon />}
          marginLeft="medium"
          severity="info"
          size="small"
        >
          Info
        </Chip>
        <Chip
          icon={<StatusOkIcon />}
          marginLeft="medium"
          severity="success"
          size="small"
        >
          Success
        </Chip>
        <Chip
          icon={<StatusOkIcon />}
          marginLeft="medium"
          severity="warning"
          size="small"
        >
          Warning
        </Chip>
        <Chip
          icon={<StatusOkIcon />}
          marginLeft="medium"
          severity="error"
          size="small"
        >
          Error
        </Chip>
      </Flex>

      <H1
        subtitle2
        marginBottom="small"
      >Medium
      </H1>
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
      {/* Medium with loading spinner */}
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
      {/* Medium with icon */}
      <Flex
        align="center"
        marginBottom="xlarge"
      >
        <Chip
          icon={<StatusOkIcon />}
          severity="neutral"
        >
          Neutral
        </Chip>
        <Chip
          icon={<StatusOkIcon />}
          marginLeft="medium"
          severity="info"
        >
          Info
        </Chip>
        <Chip
          icon={<StatusOkIcon />}
          marginLeft="medium"
          severity="success"
        >
          Success
        </Chip>
        <Chip
          icon={<StatusOkIcon />}
          marginLeft="medium"
          severity="warning"
        >
          Warning
        </Chip>
        <Chip
          icon={<StatusOkIcon />}
          marginLeft="medium"
          severity="error"
        >
          Error
        </Chip>
      </Flex>

      <H1
        subtitle2
        marginBottom="small"
      >Large
      </H1>
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
      {/* Large with loading spinner */}
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
      {/* Large with icon */}
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

Default.args = {}
