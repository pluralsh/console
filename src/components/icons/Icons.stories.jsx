import CollapseIcon from './CollapseIcon'
import MarketIcon from './MarketIcon'
import PeopleIcon from './PeopleIcon'
import PersonIcon from './PersonIcon'
import ScrollIcon from './ScrollIcon'
import BotIcon from './BotIcon'
import BrowserIcon from './BrowserIcon'
import BundleIcon from './BundleIcon'
import CertificateIcon from './CertificateIcon'
import CheckIcon from './CheckIcon'
import ChecklistIcon from './ChecklistIcon'

const icons = {
  CollapseIcon,
  MarketIcon,
  PeopleIcon,
  PersonIcon,
  ScrollIcon,
  BotIcon,
  BrowserIcon,
  BundleIcon,
  CertificateIcon,
  CheckIcon,
  ChecklistIcon,
}

export default {
  title: 'Icons',
  component: MarketIcon,
}

function Template(args) {

  return (
    <div style={{ display: 'flex' }}>
      {Object.entries(icons).map(([name, Icon]) => (
        <div
          key={name}
          style={{
            marginBottom: '0.5rem',
            marginRight: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <span style={{ marginBottom: '0.25rem', fontSize: '0.5rem' }}>
            {name}
          </span>
          <Icon {...args} />
        </div>
      ))}
    </div>
  )
}

export const Default = Template.bind({})

Default.args = {
}

export const Xlarge = Template.bind({})

Xlarge.args = {
  size: 32,
}

export const Large = Template.bind({})

Large.args = {
  size: 24,
}

export const Small = Template.bind({})

Small.args = {
  size: 12,
}

export const Color = Template.bind({})

Color.args = {
  color: 'brand',
}
