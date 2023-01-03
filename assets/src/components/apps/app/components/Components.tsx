import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { PageTitle } from '@pluralsh/design-system'
import { useContext, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { InstallationContext } from 'components/Installations'

import { ListItem } from 'components/apps/misc'

import { Flex } from 'honorable'

import { ComponentIcon, ComponentStatus, statusToBorder } from './misc'

export default function Components() {
  const navigate = useNavigate()
  const { appName } = useParams()
  const { applications }: any = useContext(InstallationContext)
  const { setBreadcrumbs }: any = useContext(BreadcrumbsContext)
  const currentApp = applications.find(app => app.name === appName)

  useEffect(() => setBreadcrumbs([
    { text: 'Apps', url: '/' },
    { text: appName, url: `/apps/${appName}` },
    { text: 'Components', url: `/apps/${appName}/components` },
  ]), [appName, setBreadcrumbs])

  return (
    <>
      <PageTitle heading="Components" />
      <Flex
        gap="small"
        wrap="wrap"
      >
        {currentApp.status.components.map(({
          name, group, kind, status,
        }, i) => (
          <ListItem
            key={i}
            title={name}
            subtitle={`${group || 'v1'}/${kind.toLowerCase()}`}
            icon={<ComponentIcon kind={kind} />}
            borderColor={statusToBorder[status]}
            chips={<Flex><Flex grow={1} /><ComponentStatus status={status} /></Flex>}
            chipsPlacement="right"
            onClick={() => navigate(`/apps/${appName}/components/${kind.toLowerCase()}/${name}`)}
            flexBasis="40%"
          />
        ))}
        <Flex
          grow={1}
          basis="40%"
        />
      </Flex>
    </>
  )
}
