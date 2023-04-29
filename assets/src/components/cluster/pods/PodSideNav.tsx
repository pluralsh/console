import { Tab, TabList } from '@pluralsh/design-system'
import { useMatch, useParams } from 'react-router-dom'
import { LinkTabWrap } from 'components/utils/Tabs'
import { useMemo } from 'react'

import { useNamespaceIsApp } from '../../hooks/useNamespaceIsApp'

const useGetDirectory = (namespace = '') => {
  const namespaceIsApp = useNamespaceIsApp(namespace)

  return useMemo(() => {
    const showLogs = !namespaceIsApp

    return [
      { path: '', label: 'Info' },
      { path: 'events', label: 'Events' },
      { path: 'raw', label: 'Raw' },
      ...(showLogs ? [{ path: 'logs', label: 'Logs' }] : []),
    ]
  }, [namespaceIsApp])
}

function NodesTabList({ tabStateRef }: any) {
  const { namespace } = useParams()

  const subpath =
    useMatch('/pods/:namespace/:name/:subpath')?.params?.subpath || ''
  const directory = useGetDirectory(namespace)

  const currentTab = directory.find(({ path }) => path === subpath)

  return (
    <TabList
      stateRef={tabStateRef}
      stateProps={{
        orientation: 'vertical',
        selectedKey: currentTab?.path,
      }}
    >
      {directory.map(({ label, path }) => (
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
  return <NodesTabList tabStateRef={tabStateRef} />
}
