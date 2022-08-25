import { Flex, H3 } from 'honorable'

import AppIcon from '../components/AppIcon'

export default {
  title: 'AppIcon',
  component: AppIcon,
  argTypes: {
    icon: {
      options: [
        '/logos/plural-logomark-only-black.svg',
        '/logos/plural-logomark-only-white.svg',
        '/logos/airflow-logo.svg',
        '/logos/airbyte-logo.svg',
      ],
      control: {
        type: 'select',
        labels: {
          '/logos/plural-logomark-only-black.svg': 'Plural Black',
          '/logos/plural-logomark-only-white.svg': 'Plural White',
          '/logos/airflow-logo.svg': 'Airflow',
          '/logos/airbyte-logo.svg': 'Airbyte',
        },
      },
    },
    hue: {
      options: ['default', 'lighter', 'lightest'],
      control: {
        type: 'select',
      },
    },
  },
}

const sizes = [
  { label: 'Extra Large', size: 'xlarge' },
  { label: 'Large', size: 'large' },
  { label: 'Medium', size: 'medium' },
  { label: 'Small', size: 'small' },
  { label: 'Extra Small', size: 'xsmall' },
]

function Template(args: any) {
  return (
    <Flex
      gap={16}
      direction="column"
    >
      {sizes.map(({ label, size }) => (
        <>
          <H3>{label}</H3>
          <Flex
            direction="row"
            gap={16}
          >
            <AppIcon
              size={size}
              url={args.icon}
              {...args}
            />

            <AppIcon
              size={size}
              url="photo.png"
              spacing="none"
              {...args}
            />

            <AppIcon
              size={size}
              name={args.name || undefined}
              initials={args.name || undefined}
              {...args}
            />
          </Flex>
        </>
      ))}
    </Flex>
  )
}

export const Default = Template.bind({})
Default.args = {
  name: 'Michael J Guarino',
  initials: '',
  icon: '/logos/plural-logomark-only-black.svg',
  hue: 'default',
  clickable: false,
}
