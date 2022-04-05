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
import ChronjobIcon from './ChronjobIcon'
import ClusterIcon from './ClusterIcon'
import ComponentsIcon from './ComponentsIcon'
import ComputerNodeIcon from './ComputerNodeIcon'
import CopyIcon from './CopyIcon'
import CraneIcon from './CraneIcon'
import CreditCardIcon from './CreditCardIcon'
import DashboardIcon from './DashboardIcon'
import DeploymentIcon from './DeploymentIcon'
import DockerTagIcon from './DockerTagIcon'
import DomainsIcon from './DomainsIcon'
import DownloadIcon from './DownloadIcon'
import EditIcon from './EditIcon'
import EmojiHoverIcon from './EmojiHoverIcon'
import EmojiIcon from './EmojiIcon'
import ErrorIcon from './ErrorIcon'
import EyeIcon from './EyeIcon'
import FileIcon from './FileIcon'
import FiltersIcon from './FiltersIcon'
import FingerPrintIcon from './FingerPrintIcon'

const icons = {
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
  ChronjobIcon,
  ClusterIcon,
  ComponentsIcon,
  ComputerNodeIcon,
  CopyIcon,
  CraneIcon,
  CreditCardIcon,
  DashboardIcon,
  DeploymentIcon,
  DockerTagIcon,
  DomainsIcon,
  DownloadIcon,
  EditIcon,
  EmojiHoverIcon,
  EmojiIcon,
  ErrorIcon,
  EyeIcon,
  FileIcon,
  FiltersIcon,
  FingerPrintIcon,
}

export default {
  title: 'Icons',
  component: MarketIcon,
}

function Template(args) {

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      maxWidth: '100%',
    }}
    >
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
