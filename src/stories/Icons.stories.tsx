import styled, { useTheme } from 'styled-components'
import pick from 'lodash/pick'

import { createElement } from 'react'

import * as allImports from '../index'

const icons = pick(allImports, [
  'AmazonLogoIcon',
  'ApiIcon',
  'AppleLogoIcon',
  'ArchitectureIcon',
  'ArrowLeftIcon',
  'ArrowRightIcon',
  'ArrowRightLeftIcon',
  'ArrowTopRightIcon',
  'AwsLogoIcon',
  'BellIcon',
  'BookIcon',
  'BotIcon',
  'BrowserIcon',
  'BundleIcon',
  'CameraIcon',
  'CaretDownIcon',
  'CaretLeftIcon',
  'CaretRightIcon',
  'CaretUpIcon',
  'CertificateIcon',
  'CheckIcon',
  'CheckOutlineIcon',
  'CheckRoundedIcon',
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
  'DocumentIcon',
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
  'GitLabLogoIcon',
  'GlobeIcon',
  'GoogleCloudLogoIcon',
  'GoogleLogoIcon',
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
  'MagicWandIcon',
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
  'SourcererIcon',
  'SprayIcon',
  'StackIcon',
  'StatusIpIcon',
  'StatusOkIcon',
  'SuccessIcon',
  'SuitcaseIcon',
  'TableIcon',
  'TagIcon',
  'TerminalIcon',
  'ThumbsUpFilledIcon',
  'ThumbsUpIcon',
  'ToolIcon',
  'TrashCanIcon',
  'TwitterIcon',
  'UbuntuLogoIcon',
  'UpdatesIcon',
  'VerifiedIcon',
  'VideoIcon',
  'VolumesIcon',
  'WarningIcon',
  'WebhooksIcon',
  'WindowsLogoIcon',
  'WorkspaceIcon',
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
  hyphens: 'none',
  wordBreak: 'break-all',
  fontSize: '0.75rem',
  minWidth: '8em',
  textAlign: 'center',
  ...theme.partials.text.caption,
  backgroundColor: $backgroundColor,
}))

function Template({ backgroundColor, ...args }: any) {
  const theme = useTheme()
  const bgColor
    = (typeof theme.colors[backgroundColor] === 'string'
      && theme.colors[backgroundColor])
    || backgroundColor

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        maxWidth: '100%',
      }}
    >
      {Object.entries(icons).map(([name, icon]) => (
        <AppIcon
          key={name}
          $backgroundColor={bgColor}
        >
          <div style={{ justifySelf: 'flex-end' }}>
            {createElement(icon as any, { ...args })}
          </div>
          <span
            dangerouslySetInnerHTML={{
              __html: name
                .replace('Icon', '')
                .replaceAll(/([a-z])([A-Z])/g, '$1&shy;$2'),
            }}
          />
        </AppIcon>
      ))}
    </div>
  )
}

export const Default = Template.bind({})
Default.args = {
  color: 'text',
  size: 16,
  fullColor: false,
  backgroundColor: 'transparent',
}

export const Xlarge = Template.bind({})
Xlarge.args = {
  color: 'text',
  size: 32,
  fullColor: false,
  backgroundColor: 'transparent',
}

export const Large = Template.bind({})
Large.args = {
  color: 'text',
  size: 24,
  fullColor: false,
  backgroundColor: 'transparent',
}

export const Small = Template.bind({})
Small.args = {
  color: 'text',
  size: 12,
  fullColor: false,
  backgroundColor: 'transparent',
}

export const Color = Template.bind({})
Color.args = {
  color: 'action-primary',
  fullColor: false,
  size: 16,
  backgroundColor: 'transparent',
}

export const FullColor = Template.bind({})
FullColor.args = {
  color: 'text',
  fullColor: true,
  size: 32,
  backgroundColor: 'transparent',
}
