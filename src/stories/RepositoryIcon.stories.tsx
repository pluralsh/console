import { Flex, H3 } from 'honorable'

import RepositoryIcon from '../components/RepositoryIcon'

export default {
  title: 'RepositoryIcon',
  component: RepositoryIcon,
  argTypes: {
    icon: {
      options: ['/logos/plural-logomark-only-black.svg', '/logos/plural-logomark-only-white.svg'],
      control: {
        type: 'select',
        labels: {
          '/logos/plural-logomark-only-black.svg': 'Plural Black',
          '/logos/plural-logomark-only-white.svg': 'Plural White',
        },
      },
    },
  },
}

function Template(args: any) {
  return (
    <Flex
      gap={16}
      direction="column"
    >
      <H3>Large</H3>
      <RepositoryIcon
        size="large"
        url={args.icon}
        {...args}
      />

      <H3>Medium</H3>
      <RepositoryIcon
        url={args.icon}
        {...args}
      />

      <H3>Small</H3>
      <RepositoryIcon
        size="small"
        url={args.icon}
        {...args}
      />
    </Flex>
  )
}

export const Default = Template.bind({})
Default.args = {
  icon: '/logos/plural-logomark-only-black.svg',
}
