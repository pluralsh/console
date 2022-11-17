import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { InstallationContext } from 'components/Installations'
import { PageTitle } from '@pluralsh/design-system'
import { useContext, useEffect } from 'react'

export default function CostAnalysis() {
  const { currentApplication }: any = useContext(InstallationContext)
  const { setBreadcrumbs }: any = useContext(BreadcrumbsContext)

  useEffect(() => setBreadcrumbs([
    { text: 'Apps', url: '/' },
    { text: currentApplication.name, url: `/apps/${currentApplication.name}` },
    { text: 'Cost analysis', url: `/apps/${currentApplication.name}/cost` },
  ]), [currentApplication, setBreadcrumbs])

  return (
    <PageTitle heading="Cost analysis" />
  )
}
