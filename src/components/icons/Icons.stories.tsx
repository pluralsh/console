import CollapseIcon from './CollapseIcon'
import MarketPlusIcon from './MarketPlusIcon'
import PeoplePlusIcon from './PeoplePlusIcon'
import PersonPlusIcon from './PersonPlusIcon'
import ScrollPlusIcon from './ScrollPlusIcon'
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
import FolderIcon from './FolderIcon'
import GearTrainIcon from './GearTrainIcon'
import GitHubIcon from './GitHubIcon'
import GlobeIcon from './GlobeIcon'
import GraphIcon from './GraphIcon'
import HamburgerMenuIcon from './HamburgerMenuIcon'
import HistoryIcon from './HistoryIcon'
import IdIcon from './IdIcon'
import InstallIcon from './InstallIcon'
import InstalledIcon from './InstalledIcon'
import InvoicesIcon from './InvoicesIcon'
import KeyPairIcon from './KeyPairIcon'
import KeyIcon from './KeyIcon'
import LifePreserverIcon from './LifePreserverIcon'
import LightingIcon from './LightingIcon'
import LinkoutIcon from './LinkoutIcon'
import LinksIcon from './LinksIcon'
import ListIcon from './ListIcon'
import LogoutIcon from './LogoutIcon'
import LogsIcon from './LogsIcon'
import MagnifyingGlassIcon from './MagnifyingGlassIcon'
import MarketIcon from './MarketIcon'
import MessagesIcon from './MessagesIcon'
import NetworkInIcon from './NetworkInIcon'
import NetworkInterfaceIcon from './NetworkInterfaceIcon'
import OAuthIcon from './OAuthIcon'
import OwnerIcon from './OwnerIcon'
import PackageIcon from './PackageIcon'
import PadlockIcon from './PadlockIcon'
import PaperclipIcon from './PaperclipIcon'
import PencilIcon from './PencilIcon'
import PeopleIcon from './PeopleIcon'
import PersonIcon from './PersonIcon'
import PlanIcon from './PlanIcon'
import PushPinIcon from './PushPinIcon'
import ReloadIcon from './ReloadIcon'
import RocketIcon from './RocketIcon'
import RunBookIcon from './RunBookIcon'
import ScrollIcon from './ScrollIcon'
import SendMessageIcon from './SendMessageIcon'
import ServersIcon from './ServersIcon'
import ShipIcon from './ShipIcon'
import SirenIcon from './SirenIcon'
import SortAscIcon from './SortAscIcon'
import SortDescIcon from './SortDescIcon'
import StatusIpIcon from './StatusIpIcon'
import StatusOkIcon from './StatusOkIcon'
import SuitcaseIcon from './SuitcaseIcon'
import TableIcon from './TableIcon'
import TagIcon from './TagIcon'
import TashCanIcon from './TashCanIcon'
import UpdatesIcon from './UpdatesIcon'
import VolumesIcon from './VolumesIcon'
import WebhooksIcon from './WebhooksIcon'
import CloseIcon from './CloseIcon'
import TwitterIcon from './TwitterIcon'
import DiscordIcon from './DiscordIcon'
import GitHubLogoIcon from './GitHubLogoIcon'

const icons = {
  CollapseIcon,
  MarketPlusIcon,
  PeoplePlusIcon,
  PersonPlusIcon,
  ScrollPlusIcon,
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
  FolderIcon,
  GearTrainIcon,
  GitHubIcon,
  GlobeIcon,
  GraphIcon,
  HamburgerMenuIcon,
  HistoryIcon,
  IdIcon,
  InstallIcon,
  InstalledIcon,
  InvoicesIcon,
  KeyPairIcon,
  KeyIcon,
  LifePreserverIcon,
  LightingIcon,
  LinkoutIcon,
  LinksIcon,
  ListIcon,
  LogoutIcon,
  LogsIcon,
  MagnifyingGlassIcon,
  MarketIcon,
  MessagesIcon,
  NetworkInIcon,
  NetworkInterfaceIcon,
  OAuthIcon,
  OwnerIcon,
  PackageIcon,
  PadlockIcon,
  PaperclipIcon,
  PencilIcon,
  PeopleIcon,
  PersonIcon,
  PlanIcon,
  PushPinIcon,
  ReloadIcon,
  RocketIcon,
  RunBookIcon,
  ScrollIcon,
  SendMessageIcon,
  ServersIcon,
  ShipIcon,
  SirenIcon,
  SortAscIcon,
  SortDescIcon,
  StatusIpIcon,
  StatusOkIcon,
  SuitcaseIcon,
  TableIcon,
  TagIcon,
  TashCanIcon,
  UpdatesIcon,
  VolumesIcon,
  WebhooksIcon,
  CloseIcon,
  TwitterIcon,
  DiscordIcon,
  GitHubLogoIcon,
}

export default {
  title: 'Icons',
  component: MarketPlusIcon,
}

function Template(args: any) {

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
            width: 32 + 16,
          }}
        >
          <span style={{ marginBottom: '0.25rem', fontSize: '0.5rem' }}>
            {name.replace('Icon', '')}
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
  color: 'primary',
}
