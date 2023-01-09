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
  const { applications } = useContext<any>(InstallationContext)
  const { setBreadcrumbs } = useContext<any>(BreadcrumbsContext)
  const currentApp = applications.find(app => app.name === appName)

  useEffect(() => setBreadcrumbs([
    { text: 'apps', url: '/' },
    { text: appName, url: `/apps/${appName}` },
    { text: 'components', url: `/apps/${appName}/components` },
  ]), [appName, setBreadcrumbs])

  return (
    <>
      <PageTitle heading="Components" /> {/* TODO: Add filtering. */}
      <Flex
        direction="column"
        paddingRight="xxxsmall"
        overflowY="auto"
      >
        {/* TODO: Apply new design changes. */}
        {currentApp.status.components.map(({
          name, group, kind, status,
        }, i) => (
          <ListItem
            key={i}
            title={name}
            subtitle={`${group || 'v1'}/${kind.toLowerCase()}`}
            icon={<ComponentIcon kind={kind} />}
            iconFrameType="tertiary"
            iconFrameSize="small"
            borderColor={statusToBorder[status]}
            chips={<ComponentStatus status={status} />}
            chipsPlacement="right"
            onClick={() => navigate(`/apps/${appName}/components/${kind.toLowerCase()}/${name}`)}
            marginBottom="medium"
          />
        ))}
      </Flex>
    </>
  )
}
