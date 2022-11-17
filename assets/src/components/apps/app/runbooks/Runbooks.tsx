import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { InstallationContext } from 'components/Installations'
import { PageTitle } from '@pluralsh/design-system'
import { useContext, useEffect } from 'react'

export default function Runbooks() {
  const { currentApplication }: any = useContext(InstallationContext)
  const { setBreadcrumbs }: any = useContext(BreadcrumbsContext)

  useEffect(() => setBreadcrumbs([
    { text: 'Apps', url: '/' },
    { text: currentApplication.name, url: `/apps/${currentApplication.name}` },
    { text: 'Runbooks', url: `/apps/${currentApplication.name}/runbooks` },
  ]), [currentApplication, setBreadcrumbs])

  return (
    <PageTitle heading="Runbooks" />
  )
}
