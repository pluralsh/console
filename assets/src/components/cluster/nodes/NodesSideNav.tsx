import { Tab, TabList } from '@pluralsh/design-system'
import { useLocation } from 'react-router-dom'

import { LinkTabWrap } from 'components/utils/Tabs'

const DIRECTORY = [
  { path: '/nodes', label: 'Nodes' },
  { path: '/pods', label: 'Pods' },
]

function NodesTabList({ tabStateRef }: any) {
  const { pathname } = useLocation()
  const currentTab = DIRECTORY.find(tab => pathname?.startsWith(tab.path))

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
    <>
      {/* <PageCard
        marginBottom="large"
        heading={(
          <Div
            display="-webkit-box"
            webkitLineClamp={2}
            webkitBoxOrient="vertical"
            overflowY="hidden"
            lineBreak="all"
          >{me?.account?.name || ''}
          </Div>
        )}
        subheading={me?.publisher ? 'Publisher' : undefined}
        icon={{ name: me?.account?.name || '?' }}
      /> */}
      <NodesTabList tabStateRef={tabStateRef} />
    </>
  )
}
