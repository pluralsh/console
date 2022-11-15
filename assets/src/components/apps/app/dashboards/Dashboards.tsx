import { BreadcrumbsContext } from "components/Breadcrumbs";
import { InstallationContext } from "components/Installations";
import { PageTitle } from "pluralsh-design-system";
import { useContext, useEffect } from "react";

export default function Dashboards() {
  const { currentApplication }: any = useContext(InstallationContext)
  const { setBreadcrumbs }: any = useContext(BreadcrumbsContext)

  useEffect(() => setBreadcrumbs([
    { text: 'Apps', url: '/' },
    { text: currentApplication.name, url: `/app/${currentApplication.name}` },
    { text: 'Dashboards', url: `/app/${currentApplication.name}/dashboards` },
  ]), [currentApplication, setBreadcrumbs])

  return <>
    <PageTitle heading="Dashboards"></PageTitle>
  </>
}
