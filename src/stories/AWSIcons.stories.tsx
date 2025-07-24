import { useTheme } from 'styled-components'
import AWSIcon, { AWSIconName } from '../components/icons/AWSIcon'

export default {
  title: 'AWSIcon',
  component: AWSIcon,
}

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

export const Default = Template.bind({})
Default.args = {
  size: 24,
}
