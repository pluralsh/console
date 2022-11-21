import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { PageTitle } from '@pluralsh/design-system'
import { useContext, useEffect } from 'react'
import { useParams } from 'react-router-dom'

export default function Runbooks() {
  const { appName } = useParams()
  const { setBreadcrumbs }: any = useContext(BreadcrumbsContext)

  useEffect(() => setBreadcrumbs([
    { text: 'Apps', url: '/' },
    { text: appName, url: `/apps/${appName}` },
    { text: 'Runbooks', url: `/apps/${appName}/runbooks` },
  ]), [appName, setBreadcrumbs])

  return (
    <PageTitle heading="Runbooks" />
  )
}
