import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { Card, PageTitle } from '@pluralsh/design-system'
import { useContext, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { InstallationContext } from 'components/Installations'

export default function UserManagement() {
  const { appName } = useParams()
  const { applications }: any = useContext(InstallationContext)
  const { setBreadcrumbs }: any = useContext(BreadcrumbsContext)
  const currentApp = applications.find(app => app.name === appName)

  useEffect(() => setBreadcrumbs([
    { text: 'Apps', url: '/' },
    { text: appName, url: `/apps/${appName}` },
    { text: 'User management', url: `/apps/${appName}/oidc` },
  ]), [appName, setBreadcrumbs])

  return (
    <>
      <PageTitle heading="User management" />
      <Card
        paddingHorizontal={100}
        paddingVertical="large"
      >
        {currentApp.name}
      </Card>
    </>
  )
}
