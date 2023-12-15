import { Flex, H3 } from 'honorable'

import { Card, PluralLogoMark, WrapWithIf } from '..'

import AppIcon from '../components/AppIcon'

export default {
  title: 'AppIcon',
  component: AppIcon,
  argTypes: {
    icon: {
      options: ['Plural', 'Airflow', 'Airbyte'],
      control: {
        type: 'select',
      },
    },
    hue: {
      options: [undefined, 'default', 'lighter', 'lightest'],
      control: {
        type: 'select',
      },
    },
    onFillLevel: {
      options: [0, 1, 2, 3],
      control: {
        type: 'select',
        labels: {
          0: '0',
          1: '1',
          2: '2',
          3: "3 - Shouldn't be used",
        },
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
  { label: 'XX Small', size: 'xxsmall' },
]

function Template({ onFillLevel, icon, ...args }: any) {
  const iconProps =
    icon === 'Airflow'
      ? { url: '/logos/airflow-logo.svg' }
      : icon === 'Airbyte'
      ? { url: '/logos/airbyte-logo.svg' }
      : { icon: <PluralLogoMark /> }

  return (
    <Flex
      gap={16}
      direction="column"
    >
      {sizes.map(({ label, size }) => (
        <>
          <H3>{label}</H3>
          <WrapWithIf
            condition={onFillLevel > 0}
            wrapper={
              <Card
                fillLevel={onFillLevel}
                padding="small"
              />
            }
          >
            <Flex
              direction="row"
              gap={16}
            >
              <AppIcon
                size={size}
                {...iconProps}
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
                url="photo2.jpg"
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
          </WrapWithIf>
        </>
      ))}
    </Flex>
  )
}

export const Default = Template.bind({})
Default.args = {
  name: 'Michael J Guarino',
  initials: '',
  onFillLevel: 0,
  hue: undefined,
  clickable: false,
}
