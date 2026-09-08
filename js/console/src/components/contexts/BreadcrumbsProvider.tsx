import { BreadcrumbsProvider as BaseBreadcrumbsProvider } from '@pluralsh/design-system'
import { LoginContext } from 'components/contexts'
import { PropsWithChildren, useCallback, useContext } from 'react'

export default function BreadcrumbsProvider(props: PropsWithChildren) {
  const { configuration } = useContext(LoginContext)
  const cluster = configuration?.manifest?.cluster

  const breadcrumbTransform = useCallback(
    (breadcrumbs) => [...(cluster ? [{ label: cluster }] : []), ...breadcrumbs],
    [cluster]
  )

  return (
    <BaseBreadcrumbsProvider
      breadcrumbsTransform={breadcrumbTransform}
      {...props}
    />
  )
}
