import { useSetBreadcrumbs } from '@pluralsh/design-system'

const crumbs = [{ label: 'providers' }]

export default function Providers() {
  useSetBreadcrumbs(crumbs)

  return <>Providers page</>
}
