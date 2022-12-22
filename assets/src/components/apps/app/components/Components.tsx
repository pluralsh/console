import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { Card, PageTitle } from '@pluralsh/design-system'
import { useContext, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { InstallationContext } from 'components/Installations'

export default function Components() {
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
      <Card
        paddingHorizontal={100}
        paddingVertical="large"
      >
        Components of {currentApp.name}
      </Card>
    </>
  )
}
