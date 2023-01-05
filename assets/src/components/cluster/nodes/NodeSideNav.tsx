import { Tab, TabList } from '@pluralsh/design-system'
import { useMatch } from 'react-router-dom'

import { LinkTabWrap } from 'components/utils/Tabs'

const DIRECTORY = [
  { path: '', label: 'Info' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
]

function NodesTabList({ tabStateRef }: any) {
  const subpath = useMatch('/nodes/:name/:subpath')?.params?.subpath || ''

  const currentTab = DIRECTORY.find(({ path }) => path === subpath)

  return (
    <TabList
      stateRef={tabStateRef}
      stateProps={{
        orientation: 'vertical',
        selectedKey: currentTab?.path,
      }}
    >
      {DIRECTORY.map(({ label, path }) => (
        <LinkTabWrap
          key={path}
          textValue={label}
          to={path}
        >
          <Tab>{label}</Tab>
        </LinkTabWrap>
      ))}
    </TabList>
  )
}

export default function AccountSideNav({ tabStateRef = {} }: any) {
  return (
    <NodesTabList tabStateRef={tabStateRef} />
  )
}
