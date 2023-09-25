import { Avatar, Div } from 'honorable'
import { type MouseEvent, useState } from 'react'
import { useTheme } from 'styled-components'

import BellIcon from '../components/icons/BellIcon'

import ChecklistIcon from '../components/icons/ChecklistIcon'
import ClusterIcon from '../components/icons/ClusterIcon'
import DiscordIcon from '../components/icons/DiscordIcon'
import GitHubLogoIcon from '../components/icons/GitHubLogoIcon'
import MarketIcon from '../components/icons/MarketIcon'
import PeopleIcon from '../components/icons/PeopleIcon'
import TerminalIcon from '../components/icons/TerminalIcon'
import Sidebar from '../components/Sidebar'
import SidebarItem from '../components/SidebarItem'
import SidebarSection from '../components/SidebarSection'
import { Button, IconFrame, PluralLogoMark } from '../index'

export default {
  title: 'Sidebar',
  component: Sidebar,
  argTypes: {
    variant: {
      options: ['app', 'console'],
      control: {
        type: 'select',
      },
    },
  },
}

const items = [
  {
    tooltip: 'Marketplace',
    icon: <MarketIcon />,
  },
  {
    tooltip: 'Cloud Shell',
    icon: <TerminalIcon />,
  },
  {
    tooltip: 'Clusters',
    icon: <ClusterIcon />,
  },
  {
    tooltip: 'Audits',
    icon: <ChecklistIcon />,
  },
  {
    tooltip: 'Account',
    icon: <PeopleIcon />,
  },
] as const

function Template({ variant }: any) {
  const theme = useTheme()
  const [activeKey, setActiveKey] = useState('Marketplace')

  return (
    <Div
      width="800px"
      height="600px"
      border="1px solid border"
    >
      <Sidebar
        variant={variant}
        layout="vertical"
      >
        <SidebarSection>
          <SidebarItem
            as="a"
            href="https://app.plural.sh"
          >
            <PluralLogoMark
              width="24"
              color={theme.colors['marketing-white']}
            />
          </SidebarItem>
        </SidebarSection>

        <SidebarSection grow={1}>
          {items.map(({ tooltip, icon }) => (
            <SidebarItem
              clickable
              as="a"
              onClick={(e: MouseEvent) => {
                e.preventDefault()
                setActiveKey(tooltip)
              }}
              key={tooltip}
              tooltip={tooltip}
              active={tooltip === activeKey}
            >
              {icon}
            </SidebarItem>
          ))}
        </SidebarSection>

        <SidebarSection>
          <SidebarItem
            clickable
            tooltip="Discord"
            href="https://discord.com/invite/qsUfBcC3Ru"
          >
            <DiscordIcon />
          </SidebarItem>
          <SidebarItem
            clickable
            tooltip="GitHub"
            href="https://github.com/pluralsh/plural"
          >
            <GitHubLogoIcon />
          </SidebarItem>
        </SidebarSection>

        <SidebarSection>
          <SidebarItem
            clickable
            tooltip="Notifications"
          >
            <BellIcon />
          </SidebarItem>
          <SidebarItem clickable>
            <Avatar size={32} />
          </SidebarItem>
        </SidebarSection>
      </Sidebar>
    </Div>
  )
}

function HorizontalTemplate({ variant }: any) {
  const theme = useTheme()

  return (
    <Div
      width="800px"
      height="600px"
      border="1px solid border"
    >
      <Sidebar
        variant={variant}
        layout="horizontal"
      >
        <SidebarSection marginLeft="small">
          <SidebarItem href="https://app.plural.sh">
            <PluralLogoMark
              width={24}
              color={theme.colors['marketing-white']}
            />
          </SidebarItem>
        </SidebarSection>
        <SidebarSection grow={1} />
        <SidebarSection marginRight="small">
          <SidebarItem
            clickable
            tooltip="Discord"
            href="https://discord.com/invite/qsUfBcC3Ru"
          >
            <IconFrame
              textValue="Discord"
              type="secondary"
              icon={<DiscordIcon />}
            />
          </SidebarItem>
          <SidebarItem
            clickable
            tooltip="GitHub"
            href="https://github.com/pluralsh/plural"
          >
            <IconFrame
              textValue="GitHub"
              type="secondary"
              icon={<GitHubLogoIcon />}
            />
          </SidebarItem>
          <SidebarItem>
            <Button
              small
              secondary
            >
              Restart onboarding
            </Button>
          </SidebarItem>
        </SidebarSection>
      </Sidebar>
    </Div>
  )
}

export const Default = Template.bind({})

Default.args = {}

export const Vertical = HorizontalTemplate.bind({})

Vertical.args = {
  variant: 'app',
}
