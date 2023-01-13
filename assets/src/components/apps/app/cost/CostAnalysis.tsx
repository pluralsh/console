import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { Card, PageTitle } from '@pluralsh/design-system'
import { useContext, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { InstallationContext } from 'components/Installations'

import KubernetesCost from './KubernetesCost'

export default function CostAnalysis() {
  const { appName } = useParams()
  const { applications }: any = useContext(InstallationContext)
  const { setBreadcrumbs }: any = useContext(BreadcrumbsContext)
  const currentApp = applications.find(app => app.name === appName)
  const { cost } = currentApp

  useEffect(() => setBreadcrumbs([
    { text: 'apps', url: '/' },
    { text: appName, url: `/apps/${appName}` },
    { text: 'cost analysis', url: `/apps/${appName}/cost` },
  ]), [appName, setBreadcrumbs])

  return (
    <>
      <PageTitle heading="Cost analysis" />
      <Card
        paddingHorizontal={100}
        paddingVertical="large"
      >
        {cost && <KubernetesCost cost={cost} />}
        {!cost && 'Cost data is not available.'}
        {/* {license && <PluralCost license={license} />} */}
      </Card>
    </>
  )
}
