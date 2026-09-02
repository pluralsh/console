import { useTheme } from 'styled-components'
import AWSIcon, { AWSIconName } from '../components/icons/AWSIcon'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'AWSIcon',
  component: AWSIcon,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template({ size, ...args }: any) {
  const theme = useTheme()

  return (
    <div
      style={{
        display: 'flex',
        gap: theme.spacing.medium,
        flexWrap: 'wrap',
      }}
    >
      {Object.values(AWSIconName).map((name) => (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            flexDirection: 'column',
            gap: theme.spacing.small,
            padding: theme.spacing.small,
            border: theme.borders.default,
            borderRadius: theme.borderRadiuses.medium,
            width: size * 4,
            height: size * 4,
          }}
        >
          <AWSIcon
            name={name}
            size={size}
            {...args}
          />
          <span>{name}</span>
        </div>
      ))}
    </div>
  )
}

export const Default: Story = {
  render: Template,
  args: {
    size: 32,
  },
}
