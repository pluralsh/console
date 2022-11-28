import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { Card, PageTitle } from '@pluralsh/design-system'
import { useContext, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CostBreakdown } from 'components/repos/CostAnalysis'
import { InstallationContext } from 'components/Installations'

export default function CostAnalysis() {
  const { appName } = useParams()
  const { applications }: any = useContext(InstallationContext)
  const { setBreadcrumbs }: any = useContext(BreadcrumbsContext)
  const currentApp = applications.find(app => app.name === appName)

  useEffect(() => setBreadcrumbs([
    { text: 'Apps', url: '/' },
    { text: appName, url: `/apps/${appName}` },
    { text: 'Cost analysis', url: `/apps/${appName}/cost` },
  ]), [appName, setBreadcrumbs])

  return (
    <>
      <PageTitle heading="Cost analysis" />
      <Card>
        <CostBreakdown
          cost={currentApp.cost}
          license={currentApp.license}
        />
      </Card>
    </>
  )
}
