import { Card, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useContext, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { InstallationContext } from 'components/Installations'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import KubernetesCost from './KubernetesCost'

export default function CostAnalysis() {
  const { appName } = useParams()
  const { applications } = useContext<any>(InstallationContext)
  const currentApp = applications.find((app) => app.name === appName)
  const { cost } = currentApp
  const breadcrumbs = useMemo(
    () => [
      { label: 'apps', url: '/' },
      { label: appName ?? '', url: `/apps/${appName}` },
      { label: 'cost analysis', url: `/apps/${appName}/cost` },
    ],
    [appName]
  )

  useSetBreadcrumbs(breadcrumbs)

  return (
    <ScrollablePage
      scrollable={false}
      heading="Cost analysis"
    >
      <Card
        paddingHorizontal={100}
        paddingVertical="large"
        overflowY="auto"
        maxHeight="100%"
      >
        {cost && <KubernetesCost cost={cost} />}
        {!cost && 'Cost data is not available.'}
        {/* {license && <PluralCost license={license} />} */}
      </Card>
    </ScrollablePage>
  )
}
