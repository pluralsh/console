import { Avatar, Box, Img } from 'honorable'

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

export default {
  title: 'Sidebar',
  component: Sidebar,
}

function Template() {
  return (
    <Box
      width="800px"
      height="600px"
      border="1px solid border"
    >
      <Sidebar>
        <SidebarSection>
          <SidebarItem href="https://app.plural.sh">
            <Img
              src="/plural-logo-white.svg"
              width={24}
            />
          </SidebarItem>
        </SidebarSection>

        <SidebarSection grow={1}>
          <SidebarItem
            clickable
            tooltip="Marketplace"
          ><MarketIcon />
          </SidebarItem>
          <SidebarItem
            clickable
            tooltip="Cloud Shell"
          ><TerminalIcon />
          </SidebarItem>
          <SidebarItem
            clickable
            tooltip="Clusters"
          ><ClusterIcon />
          </SidebarItem>
          <SidebarItem
            clickable
            tooltip="Audits"
          ><ChecklistIcon />
          </SidebarItem>
          <SidebarItem
            clickable
            tooltip="Account"
          ><PeopleIcon />
          </SidebarItem>
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
          ><BellIcon />
          </SidebarItem>
          <SidebarItem clickable><Avatar size={32} /></SidebarItem>
        </SidebarSection>
      </Sidebar>
    </Box>
  )
}

export const Default = Template.bind({})

Default.args = {
}
