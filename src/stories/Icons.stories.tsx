import styled, { useTheme } from 'styled-components'
import pick from 'lodash/pick'

import * as allImports from '../index'

const icons = pick(allImports, [
  'ArrowLeftIcon',
  'ArrowRightIcon',
  'ArrowTopRightIcon',
  'BellIcon',
  'BotIcon',
  'BrowserIcon',
  'BundleIcon',
  'CameraIcon',
  'CaretUpIcon',
  'CaretDownIcon',
  'CaretLeftIcon',
  'CaretRightIcon',
  'CertificateIcon',
  'CheckIcon',
  'CheckOutlineIcon',
  'CheckedShieldIcon',
  'ChecklistIcon',
  'ChronjobIcon',
  'CloseIcon',
  'CloudIcon',
  'ClusterIcon',
  'CollapseIcon',
  'ComponentsIcon',
  'ComputerNodeIcon',
  'CopyIcon',
  'CraneIcon',
  'CreditCardIcon',
  'DashboardIcon',
  'DeploymentIcon',
  'DiscordIcon',
  'DockerTagIcon',
  'DomainsIcon',
  'DownloadIcon',
  'DropdownArrowIcon',
  'EditIcon',
  'EmojiHoverIcon',
  'EmojiIcon',
  'ErrorIcon',
  'EyeClosedIcon',
  'EyeIcon',
  'FileIcon',
  'FiltersIcon',
  'FingerPrintIcon',
  'FolderIcon',
  'GearTrainIcon',
  'GitHubIcon',
  'GitHubLogoIcon',
  'GlobeIcon',
  'GraphIcon',
  'HamburgerMenuCollapseIcon',
  'HamburgerMenuCollapsedIcon',
  'HamburgerMenuIcon',
  'HistoryIcon',
  'IdIcon',
  'InfoIcon',
  'InstallIcon',
  'InstalledIcon',
  'InvoicesIcon',
  'KeyIcon',
  'KeyPairIcon',
  'LifePreserverIcon',
  'LightningIcon',
  'LinkoutIcon',
  'LinksIcon',
  'ListIcon',
  'LogoutIcon',
  'LogsIcon',
  'MagnifyingGlassIcon',
  'MailIcon',
  'MarketIcon',
  'MarketPlusIcon',
  'MessagesIcon',
  'MoreIcon',
  'NetworkInIcon',
  'NetworkInterfaceIcon',
  'NewMailIcon',
  'OAuthIcon',
  'OwnerIcon',
  'PackageIcon',
  'PadlockIcon',
  'PadlockLockedIcon',
  'PaperclipIcon',
  'PencilIcon',
  'PeopleIcon',
  'PeoplePlusIcon',
  'PersonIcon',
  'PersonPlusIcon',
  'PlanIcon',
  'PlusIcon',
  'PushPinIcon',
  'ReloadIcon',
  'RocketIcon',
  'RunBookIcon',
  'ScrollIcon',
  'ScrollPlusIcon',
  'SearchIcon',
  'SendMessageIcon',
  'ServersIcon',
  'ShipIcon',
  'SirenIcon',
  'SlackLogoIcon',
  'SortAscIcon',
  'SortDescIcon',
  'SprayIcon',
  'StatusIpIcon',
  'StatusOkIcon',
  'SuitcaseIcon',
  'TableIcon',
  'TagIcon',
  'TerminalIcon',
  'TrashCanIcon',
  'TwitterIcon',
  'UpdatesIcon',
  'VerifiedIcon',
  'VolumesIcon',
  'WebhooksIcon',
])

export default {
  title: 'Icons',
  component: allImports.MarketPlusIcon,
}

const AppIcon = styled.div<{ $backgroundColor: string }>(({ theme, $backgroundColor = 'transparent' }) => ({
  margin: theme.spacing.xxxsmall,
  paddingTop: theme.spacing.medium,
  paddingBottom: theme.spacing.xsmall,
  paddingRight: theme.spacing.xsmall,
  paddingLeft: theme.spacing.xsmall,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadiuses.medium,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  alignItems: 'center',
  justifyContent: 'flex-start',
  width: theme.spacing.xxxlarge,
  lineBreak: 'loose',
  fontSize: '0.75rem',
  minWidth: '8em',
  textAlign: 'center',
  ...theme.partials.text.caption,
  backgroundColor: $backgroundColor,
}))

function Template({ backgroundColor, ...args }: any) {
  const theme = useTheme()
  const bgColor = theme.colors[backgroundColor] || backgroundColor

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        maxWidth: '100%',
      }}
    >
      {Object.entries(icons).map(([name, Icon]) => (
        <AppIcon
          key={name}
          $backgroundColor={bgColor}
        >
          <div style={{ justifySelf: 'flex-end' }}>
            <Icon {...args} />
          </div>
          <span
            dangerouslySetInnerHTML={{
              __html: name
                .replace('Icon', '')
                .replaceAll(/([a-z])([A-Z])/g, '$1&shy;$2'),
            }}
          >
            {/* {name.replace('Icon', '').replaceAll(/([a-z])([A-Z])/g, '$1&shy;$2')} */}
          </span>
        </AppIcon>
      ))}
    </div>
  )
}

export const Default = Template.bind({})
Default.args = {
  color: 'text',
  size: 16,
  backgroundColor: 'transparent',
}

export const Xlarge = Template.bind({})
Xlarge.args = {
  color: 'text',
  size: 32,
  backgroundColor: 'transparent',
}

export const Large = Template.bind({})
Large.args = {
  color: 'text',
  size: 24,
  backgroundColor: 'transparent',
}

export const Small = Template.bind({})
Small.args = {
  color: 'text',
  size: 12,
  backgroundColor: 'transparent',
}

export const Color = Template.bind({})
Color.args = {
  color: 'action-primary',
  backgroundColor: 'transparent',
}
